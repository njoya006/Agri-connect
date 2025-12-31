"""Inventory models."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class InventoryItem(models.Model):
	"""Physical or harvested item tracked inside a farm's inventory."""

	class Category(models.TextChoices):
		SEEDS = 'seeds', 'Seeds'
		FERTILIZERS = 'fertilizers', 'Fertilizers'
		PESTICIDES = 'pesticides', 'Pesticides'
		EQUIPMENT = 'equipment', 'Equipment'
		HARVEST = 'harvest', 'Harvest'

	farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='inventory_items')
	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inventory_items')
	category = models.CharField(max_length=20, choices=Category.choices)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	quantity = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)], default=0)
	unit = models.CharField(max_length=32, default='kg')
	minimum_stock_level = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)], default=0)
	purchase_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)], null=True, blank=True)
	selling_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)], null=True, blank=True)
	expiry_date = models.DateField(null=True, blank=True)
	storage_location = models.CharField(max_length=255, blank=True)
	supplier_info = models.CharField(max_length=255, blank=True)
	last_audited = models.DateField(null=True, blank=True)
	updated_at = models.DateTimeField(auto_now=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']
		unique_together = ('farm', 'name', 'category')

	def __str__(self) -> str:
		return f"{self.name} ({self.farm.name})"

	@property
	def total_value(self) -> Decimal:
		"""Estimated valuation for the stock based on available pricing."""

		price = self.selling_price or self.purchase_price or Decimal('0')
		return (price * self.quantity).quantize(Decimal('0.01')) if price else Decimal('0')

	@property
	def is_low_stock(self) -> bool:
		return self.quantity < self.minimum_stock_level if self.minimum_stock_level else False

	@property
	def is_expiring_soon(self) -> bool:
		if not self.expiry_date:
			return False
		today = timezone.now().date()
		return self.expiry_date <= today + timedelta(days=14)


class InventoryTransaction(models.Model):
	"""Audit trail for inventory movements."""

	class TransactionType(models.TextChoices):
		PURCHASE = 'purchase', 'Purchase'
		USAGE = 'usage', 'Usage'
		SALE = 'sale', 'Sale'
		ADJUSTMENT = 'adjustment', 'Adjustment'

	item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
	transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
	quantity_change = models.DecimalField(max_digits=12, decimal_places=2)
	previous_quantity = models.DecimalField(max_digits=12, decimal_places=2)
	new_quantity = models.DecimalField(max_digits=12, decimal_places=2)
	related_activity = models.ForeignKey('farms.Activity', null=True, blank=True, on_delete=models.SET_NULL, related_name='inventory_transactions')
	related_listing = models.ForeignKey('marketplace.Listing', null=True, blank=True, on_delete=models.SET_NULL, related_name='inventory_transactions')
	performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='inventory_transactions')
	transaction_date = models.DateTimeField(default=timezone.now)
	notes = models.CharField(max_length=255, blank=True)

	class Meta:
		ordering = ['-transaction_date', '-id']

	def __str__(self) -> str:
		return f"{self.get_transaction_type_display()} {self.quantity_change} {self.item.unit} for {self.item.name}"


class LowStockAlert(models.Model):
	"""Automatic alert when stock drops below configured minimum."""

	item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='alerts')
	current_quantity = models.DecimalField(max_digits=12, decimal_places=2)
	alerted_at = models.DateTimeField(auto_now_add=True)
	acknowledged = models.BooleanField(default=False)
	resolved = models.BooleanField(default=False)
	resolved_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ['-alerted_at']

	def __str__(self) -> str:
		return f"Low stock alert for {self.item.name}"

