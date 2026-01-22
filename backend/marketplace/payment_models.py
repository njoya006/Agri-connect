from django.conf import settings
from django.db import models

from .orders import Order


class Payment(models.Model):
    """Record of a payment attempt for an Order (mock).

    Stores transaction id returned by the mock gateway and a status.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default='XAF')
    transaction_id = models.CharField(max_length=128, blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def mark_success(self, txid: str):
        self.transaction_id = txid
        self.status = self.Status.SUCCESS
        self.save(update_fields=['transaction_id', 'status', 'updated_at'])

    def mark_failed(self):
        self.status = self.Status.FAILED
        self.save(update_fields=['status', 'updated_at'])

    def __str__(self) -> str:
        return f"Payment {self.pk} {self.status} {self.amount} {self.currency}"
