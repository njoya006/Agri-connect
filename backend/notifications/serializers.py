"""Notification serializers."""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id',
            'recipient',
            'recipient_email',
            'title',
            'message',
            'category',
            'metadata',
            'is_read',
            'created_at',
        )
        read_only_fields = ('id', 'recipient', 'recipient_email', 'created_at')
