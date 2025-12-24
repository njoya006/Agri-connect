"""Notification API views."""

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
	serializer_class = NotificationSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = Notification.objects.select_related('recipient')
		if self.request.user.is_staff:
			return qs
		return qs.filter(recipient=self.request.user)

	def perform_create(self, serializer):
		serializer.save(recipient=self.request.user)

	@action(detail=True, methods=['post'])
	def mark_read(self, request, pk=None):
		notification = self.get_object()
		notification.is_read = True
		notification.save(update_fields=['is_read'])
		return Response({'detail': 'Notification marked as read.'}, status=status.HTTP_200_OK)
