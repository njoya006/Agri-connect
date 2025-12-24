"""Inventory views."""

from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from .models import InventoryItem
from .serializers import InventoryItemSerializer


class InventoryItemViewSet(viewsets.ModelViewSet):
	serializer_class = InventoryItemSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = InventoryItem.objects.select_related('farm', 'farm__owner')
		if self.request.user.is_staff:
			return qs
		return qs.filter(farm__owner=self.request.user)

	def perform_create(self, serializer):
		farm = serializer.validated_data['farm']
		if not self.request.user.is_staff and farm.owner != self.request.user:
			raise PermissionDenied('You cannot add inventory for another farmer.')
		serializer.save()

	def perform_update(self, serializer):
		farm = serializer.validated_data.get('farm', serializer.instance.farm)
		if not self.request.user.is_staff and farm.owner != self.request.user:
			raise PermissionDenied('You cannot modify inventory for another farmer.')
		serializer.save()
