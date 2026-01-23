"""Inventory models."""

from django.db import models


class InventoryItem(models.Model):
	farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='inventory_items')
	name = models.CharField(max_length=255)
	category = models.CharField(max_length=100, blank=True)
	quantity = models.DecimalField(max_digits=12, decimal_places=2)
	unit = models.CharField(max_length=32, default='kg')
	reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	notes = models.TextField(blank=True)
	last_audited = models.DateField(null=True, blank=True)
	updated_at = models.DateTimeField(auto_now=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['name']

	def __str__(self) -> str:
		return f"{self.name} ({self.farm.name})"

# Create your models here.
