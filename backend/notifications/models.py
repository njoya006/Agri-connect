"""Notification models."""

from django.conf import settings
from django.db import models


class Notification(models.Model):
	CATEGORY_CHOICES = (
		('system', 'System'),
		('marketplace', 'Marketplace'),
		('inventory', 'Inventory'),
		('analytics', 'Analytics'),
	)

	recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
	title = models.CharField(max_length=255)
	message = models.TextField()
	category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='system')
	metadata = models.JSONField(default=dict, blank=True)
	is_read = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f"Notification to {self.recipient.email}: {self.title}"

# Create your models here.
