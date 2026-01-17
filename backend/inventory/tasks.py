"""Celery tasks for inventory workflows."""

from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


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
