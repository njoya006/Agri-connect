"""Farm API views."""

from rest_framework import permissions, viewsets

from .models import Farm
from .serializers import FarmSerializer


class FarmViewSet(viewsets.ModelViewSet):
	serializer_class = FarmSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		if self.request.user.is_staff:
			return Farm.objects.select_related('owner').all()
		return Farm.objects.select_related('owner').filter(owner=self.request.user)

	def perform_create(self, serializer):
		serializer.save(owner=self.request.user)
