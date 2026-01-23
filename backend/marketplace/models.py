"""Marketplace models."""

from django.conf import settings
from django.db import models


class Listing(models.Model):
	class Status(models.TextChoices):
		ACTIVE = 'active', 'Active'
		SOLD = 'sold', 'Sold'
		INACTIVE = 'inactive', 'Inactive'

	farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='listings')
	seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings')
	title = models.CharField(max_length=255)
	description = models.TextField()
	unit_price = models.DecimalField(max_digits=12, decimal_places=2)
	quantity_available = models.DecimalField(max_digits=12, decimal_places=2)
	unit = models.CharField(max_length=50, default='kg')
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
	available_from = models.DateField()
	available_to = models.DateField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return self.title

# Create your models here.
