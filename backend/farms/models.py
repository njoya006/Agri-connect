"""Farm domain models."""

from django.conf import settings
from django.db import models


class Farm(models.Model):
	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farms')
	name = models.CharField(max_length=255)
	location = models.CharField(max_length=255)
	acreage = models.DecimalField(max_digits=10, decimal_places=2)
	crop_types = models.JSONField(default=list, blank=True)
	irrigation_type = models.CharField(max_length=100, blank=True)
	soil_type = models.CharField(max_length=100, blank=True)
	certifications = models.JSONField(default=list, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f"{self.name} ({self.owner.email})"

# Create your models here.
