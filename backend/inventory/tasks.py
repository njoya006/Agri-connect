"""Celery tasks for inventory workflows."""

from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils.module_loading import import_string
from asgiref.sync import async_to_sync
import csv
from django.core.files.storage import default_storage
from django.utils import timezone
import os


def _publish_alert_via_channel_layer(payload: dict):
    try:
        # Lazy import to avoid hard dependency if channels isn't installed
        from channels.layers import get_channel_layer  # type: ignore

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)("alerts", {"type": "low_stock", "payload": payload})
    except Exception:
        # Silently ignore if channels isn't configured in this environment
        return


@shared_task
def send_low_stock_notification(alert_id: int) -> None:
    """Send a low stock notification email for the provided alert id."""

    from .models import LowStockAlert  # Local import to avoid circulars

    try:
        alert = LowStockAlert.objects.select_related('item', 'item__owner', 'item__farm').get(pk=alert_id)
    except LowStockAlert.DoesNotExist:
        return

    recipient = getattr(alert.item.owner, 'email', None)
    if not recipient:
        return

    subject = f"Low stock alert: {alert.item.name}"
    body = (
        f"Hello {alert.item.owner.get_full_name() or alert.item.owner.email},\n\n"
        f"Inventory item '{alert.item.name}' from {alert.item.farm.name} is below the configured minimum.\n"
        f"Current quantity: {alert.current_quantity} {alert.item.unit}."
        "\nPlease restock or acknowledge this alert in AgriConnect."
    )

    send_mail(
        subject,
        body,
        getattr(settings, 'DEFAULT_FROM_EMAIL', 'alerts@agriconnect.local'),
        [recipient],
        fail_silently=True,
    )

    # also push to channel layer so websocket clients receive the alert in real-time
    try:
        payload = {
            'type': 'low_stock',
            'alert_id': alert.pk,
            'item_id': alert.item_id,
            'current_quantity': str(alert.current_quantity),
            'message': f'Low stock for {alert.item.name}',
        }
        _publish_alert_via_channel_layer(payload)
    except Exception:
        # best-effort only
        pass


@shared_task(bind=True)
def export_inventory_csv_task(self, user_id, filters=None):
    """Export inventory CSV with progress updates and file output."""
    from inventory.models import InventoryItem
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.get(id=user_id)
    qs = InventoryItem.objects.filter(owner=user)
    if filters:
        # Apply filters if needed
        pass
    total = qs.count()
    filename = f"inventory_export_{user_id}_{timezone.now().strftime('%Y%m%d%H%M%S')}.csv"
    file_path = os.path.join(settings.MEDIA_ROOT, filename)
    fieldnames = [
        'id', 'farm', 'category', 'name', 'description', 'quantity', 'unit',
        'minimum_stock_level', 'purchase_price', 'selling_price', 'expiry_date',
        'storage_location', 'supplier_info', 'last_audited', 'created_at', 'updated_at'
    ]
    with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for i, item in enumerate(qs.iterator()):
            writer.writerow({
                'id': item.id,
                'farm': item.farm_id,
                'category': item.category,
                'name': item.name,
                'description': item.description,
                'quantity': item.quantity,
                'unit': item.unit,
                'minimum_stock_level': item.minimum_stock_level,
                'purchase_price': item.purchase_price,
                'selling_price': item.selling_price,
                'expiry_date': item.expiry_date,
                'storage_location': item.storage_location,
                'supplier_info': item.supplier_info,
                'last_audited': item.last_audited,
                'created_at': item.created_at,
                'updated_at': item.updated_at,
            })
            if total > 0:
                self.update_state(state='PROGRESS', meta={'current': i+1, 'total': total})
    return {'file': filename, 'total': total}
