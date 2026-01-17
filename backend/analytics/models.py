"""Analytics models."""

from django.db import models
from django.utils import timezone


class FarmMetric(models.Model):
	farm = models.ForeignKey('farms.Farm', on_delete=models.CASCADE, related_name='metrics')
	metric_type = models.CharField(max_length=100)
	value = models.DecimalField(max_digits=14, decimal_places=2)
	unit = models.CharField(max_length=32, blank=True)
	notes = models.TextField(blank=True)
	recorded_at = models.DateTimeField(default=timezone.now)

	class Meta:
		ordering = ['-recorded_at']

	def __str__(self) -> str:
		return f"{self.metric_type} - {self.farm.name}"

# Create your models here.
