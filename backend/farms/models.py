"""Farm domain models."""

from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone


class Farm(models.Model):
	"""Represents a farm owned by a specific user."""

	class SoilType(models.TextChoices):
		LOAM = 'loam', 'Loam'
		CLAY = 'clay', 'Clay'
		SANDY = 'sandy', 'Sandy'
		SILT = 'silt', 'Silt'
		PEAT = 'peat', 'Peat'

	class IrrigationType(models.TextChoices):
		DRIP = 'drip', 'Drip'
		SPRINKLER = 'sprinkler', 'Sprinkler'
		FLOOD = 'flood', 'Flood'
		NONE = 'none', 'None'

	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farms')
	name = models.CharField(max_length=255)
	location = models.CharField(max_length=255)
	total_area = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
	soil_type = models.CharField(max_length=10, choices=SoilType.choices, default=SoilType.LOAM)
	irrigation_type = models.CharField(max_length=12, choices=IrrigationType.choices, default=IrrigationType.NONE)
	latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
	longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
	established_date = models.DateField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		unique_together = ('owner', 'name')

	def __str__(self) -> str:
		return f"{self.name} ({self.owner.email})"

	def calculate_total_yield(self) -> Decimal:
		"""Return cumulative quantity harvested for this farm."""

		total = (
			Activity.objects.filter(field__farm=self, activity_type=Activity.ActivityType.HARVESTING)
			.aggregate(total=Sum('quantity'))
			.get('total')
		)
		return total or Decimal('0')

	def get_active_fields(self):
		"""Return the queryset of active fields for the farm."""

		return self.fields.filter(is_active=True)

	@property
	def gps_coordinates(self) -> tuple[Decimal | None, Decimal | None]:
		return (self.latitude, self.longitude)


class Field(models.Model):
	"""Specific cultivable field inside a farm."""

	farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='fields')
	field_name = models.CharField(max_length=255)
	field_number = models.PositiveIntegerField()
	area = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
	current_crop = models.CharField(max_length=255, blank=True)
	crop_history = models.JSONField(default=list, blank=True)
	soil_ph = models.DecimalField(max_digits=4, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(14)], null=True, blank=True)
	last_fertilized_date = models.DateField(null=True, blank=True)
	last_harvest_date = models.DateField(null=True, blank=True)
	notes = models.TextField(blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['field_name']
		unique_together = ('farm', 'field_number')

	def __str__(self) -> str:
		return f"{self.field_name} - {self.farm.name}"


class Activity(models.Model):
	"""Operational activity executed on a field."""

	class ActivityType(models.TextChoices):
		PLANTING = 'planting', 'Planting'
		FERTILIZING = 'fertilizing', 'Fertilizing'
		IRRIGATION = 'irrigation', 'Irrigation'
		PEST_CONTROL = 'pest_control', 'Pest Control'
		WEEDING = 'weeding', 'Weeding'
		HARVESTING = 'harvesting', 'Harvesting'

	field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='activities')
	activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
	date = models.DateField(default=timezone.now)
	description = models.TextField(blank=True)
	quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
	unit = models.CharField(max_length=50, default='kg')
	cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)], default=0)
	weather_conditions = models.JSONField(default=dict, blank=True)
	performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='activities_performed')
	images = ArrayField(models.CharField(max_length=255), default=list, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-date', '-created_at']

	def __str__(self) -> str:
		return f"{self.get_activity_type_display()} - {self.field.field_name}"

	def apply_field_effects(self):
		"""Update field metadata whenever an activity is logged."""

		field = self.field
		update_fields: list[str] = ['updated_at']
		field.updated_at = timezone.now()
		if self.activity_type == self.ActivityType.HARVESTING:
			field.last_harvest_date = self.date
			update_fields.append('last_harvest_date')
		elif self.activity_type == self.ActivityType.FERTILIZING:
			field.last_fertilized_date = self.date
			update_fields.append('last_fertilized_date')
		elif self.activity_type == self.ActivityType.PLANTING and self.description:
			field.current_crop = self.description
			history = list(field.crop_history or [])
			history.append({'crop': self.description, 'planted_on': str(self.date)})
			field.crop_history = history
			update_fields.extend(['current_crop', 'crop_history'])
		field.save(update_fields=list(set(update_fields)))

	def save(self, *args, **kwargs):
		super().save(*args, **kwargs)
		self.apply_field_effects()
