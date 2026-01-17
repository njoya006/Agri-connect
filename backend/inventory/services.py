"""Inventory domain services for stock adjustments and integrations."""

from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.utils import timezone

from farms.models import Activity

from .models import InventoryItem, InventoryTransaction, LowStockAlert
from .tasks import send_low_stock_notification


def _evaluate_low_stock(item: InventoryItem) -> None:
    """Ensure low stock alerts are created or resolved based on current quantity."""

    threshold = item.minimum_stock_level or Decimal('0')
    active_alert = item.alerts.filter(resolved=False).order_by('-alerted_at').first()
    if threshold and item.quantity < threshold:
        if not active_alert:
            alert = LowStockAlert.objects.create(item=item, current_quantity=item.quantity)
            send_low_stock_notification.delay(alert.pk)
    elif active_alert:
        active_alert.resolved = True
        active_alert.resolved_at = timezone.now()
        active_alert.save(update_fields=['resolved', 'resolved_at'])


def apply_inventory_transaction(
    *,
    item: InventoryItem,
    quantity_change: Decimal,
    transaction_type: str,
    performed_by=None,
    related_activity: Optional['Activity'] = None,
    related_listing=None,
    notes: str = '',
) -> InventoryTransaction | None:
    """Persist a quantity change, guarding against negative stock and emitting alerts."""

    if not quantity_change:
        return None

    with transaction.atomic():
        previous_quantity = item.quantity
        tentative_new_quantity = previous_quantity + quantity_change
        if tentative_new_quantity < 0:
            quantity_change = -previous_quantity
            tentative_new_quantity = Decimal('0')

        item.quantity = tentative_new_quantity
        item.save(update_fields=['quantity', 'updated_at'])

        tx = InventoryTransaction.objects.create(
            item=item,
            transaction_type=transaction_type,
            quantity_change=quantity_change,
            previous_quantity=previous_quantity,
            new_quantity=tentative_new_quantity,
            related_activity=related_activity,
            related_listing=related_listing,
            performed_by=performed_by,
            notes=notes,
        )

        _evaluate_low_stock(item)
        return tx


def _match_inventory_item(farm, category: str, description: str | None) -> InventoryItem | None:
    """Pick an inventory item within a farm for the given category, preferring description matches."""

    qs = InventoryItem.objects.filter(farm=farm, category=category).order_by('expiry_date', 'id')
    if description:
        match = qs.filter(name__iexact=description.strip()).first()
        if match:
            return match
    return qs.first()


def apply_activity_inventory_flow(activity: 'Activity') -> None:
    """Automatically adjust inventory in response to farm activities."""

    mapping = {
        Activity.ActivityType.PLANTING: InventoryItem.Category.SEEDS,
        Activity.ActivityType.FERTILIZING: InventoryItem.Category.FERTILIZERS,
        Activity.ActivityType.PEST_CONTROL: InventoryItem.Category.PESTICIDES,
    }

    if activity.activity_type == Activity.ActivityType.HARVESTING:
        _handle_harvest_activity(activity)
        return

    category = mapping.get(activity.activity_type)
    if not category or activity.quantity <= 0:
        return

    item = _match_inventory_item(activity.field.farm, category, activity.description)
    if not item:
        return

    apply_inventory_transaction(
        item=item,
        quantity_change=Decimal(activity.quantity) * Decimal('-1'),
        transaction_type=InventoryTransaction.TransactionType.USAGE,
        performed_by=activity.performed_by,
        related_activity=activity,
        notes=f"Auto deduction for {activity.get_activity_type_display()}",
    )


def _handle_harvest_activity(activity: 'Activity') -> None:
    if activity.quantity <= 0:
        return

    farm = activity.field.farm
    name_hint = activity.description or activity.field.current_crop or f"Harvest from {activity.field.field_name}"
    item, _created = InventoryItem.objects.get_or_create(
        farm=farm,
        owner=farm.owner,
        category=InventoryItem.Category.HARVEST,
        name=name_hint,
        defaults={
            'unit': activity.unit,
            'quantity': Decimal('0'),
            'minimum_stock_level': Decimal('0'),
        },
    )
    apply_inventory_transaction(
        item=item,
        quantity_change=Decimal(activity.quantity),
        transaction_type=InventoryTransaction.TransactionType.ADJUSTMENT,
        performed_by=activity.performed_by,
        related_activity=activity,
        notes="Harvest yield auto-entry",
    )
