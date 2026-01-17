"""Marketplace models."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


def _default_expiry() -> timezone.datetime:
	return timezone.now() + timedelta(days=30)


class Listing(models.Model):
	"""Marketplace listing for buying or selling agricultural goods."""

	class Category(models.TextChoices):
		CROPS = 'crops', 'Crops'
		SEEDS = 'seeds', 'Seeds'
		EQUIPMENT = 'equipment', 'Equipment'
		FERTILIZERS = 'fertilizers', 'Fertilizers'

	class QualityGrade(models.TextChoices):
		PREMIUM = 'premium', 'Premium'
		A = 'grade_a', 'Grade A'
		B = 'grade_b', 'Grade B'
		C = 'grade_c', 'Grade C'

	class Status(models.TextChoices):
		ACTIVE = 'active', 'Active'
		SOLD = 'sold', 'Sold'
		EXPIRED = 'expired', 'Expired'

	farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='listings')
	seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings')
	category = models.CharField(max_length=20, choices=Category.choices, default=Category.CROPS)
	title = models.CharField(max_length=255)
	description = models.TextField()
	quantity = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
	unit = models.CharField(max_length=50, default='kg')
	price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
	quality_grade = models.CharField(max_length=20, choices=QualityGrade.choices, default=QualityGrade.A)
	location = models.CharField(max_length=255, blank=True, default='')
	images = ArrayField(models.URLField(), default=list, blank=True)
	is_negotiable = models.BooleanField(default=False)
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
	expires_at = models.DateTimeField(default=_default_expiry)
	views_count = models.PositiveIntegerField(default=0)
	inventory_item = models.ForeignKey('inventory.InventoryItem', null=True, blank=True, on_delete=models.SET_NULL, related_name='marketplace_listings')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return self.title

	@classmethod
	def expire_outdated(cls) -> None:
		cls.objects.filter(status=cls.Status.ACTIVE, expires_at__lt=timezone.now()).update(status=cls.Status.EXPIRED)

	def mark_viewed(self) -> None:
		self.views_count = models.F('views_count') + 1
		self.save(update_fields=['views_count'])
		self.refresh_from_db(fields=['views_count'])

	def clean_inventory_link(self) -> None:
		if self.inventory_item and self.inventory_item.owner_id != self.seller_id:
			raise ValueError('Inventory item must belong to the seller.')

	def save(self, *args, **kwargs):
		if not self.expires_at:
			self.expires_at = _default_expiry()
		if self.status == self.Status.ACTIVE and self.expires_at < timezone.now():
			self.status = self.Status.EXPIRED
		self.clean_inventory_link()
		super().save(*args, **kwargs)


class PriceUpdate(models.Model):
	"""Admin-curated commodity price board entry."""

	class MarketType(models.TextChoices):
		WHOLESALE = 'wholesale', 'Wholesale'
		RETAIL = 'retail', 'Retail'

	commodity = models.CharField(max_length=255)
	grade = models.CharField(max_length=50)
	market = models.CharField(max_length=20, choices=MarketType.choices, default=MarketType.WHOLESALE)
	price_per_unit = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
	unit = models.CharField(max_length=32, default='kg')
	effective_date = models.DateField(default=timezone.now)
	is_current = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-effective_date', '-created_at']
		unique_together = ('commodity', 'grade', 'market', 'effective_date')

	def __str__(self) -> str:
		return f"{self.commodity} {self.grade} {self.market}"
