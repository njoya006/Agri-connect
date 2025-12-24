"""Marketplace API views."""

from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Listing
from .serializers import ListingSerializer


class ListingViewSet(viewsets.ModelViewSet):
	serializer_class = ListingSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = Listing.objects.select_related('seller', 'farm')
		if self.request.user.is_staff:
			return qs
		return qs.filter(seller=self.request.user)

	def _validate_farm_owner(self, farm):
		if not self.request.user.is_staff and farm.owner != self.request.user:
			raise PermissionDenied('You cannot publish listings for another farmer.')

	def perform_create(self, serializer):
		farm = serializer.validated_data['farm']
		self._validate_farm_owner(farm)
		serializer.save(seller=self.request.user)

	def perform_update(self, serializer):
		farm = serializer.validated_data.get('farm', serializer.instance.farm)
		self._validate_farm_owner(farm)
		serializer.save(seller=self.request.user)
