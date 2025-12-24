"""Analytics API views."""

from django.db.models import Avg, Count, Sum
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FarmMetric
from .serializers import FarmMetricSerializer


class FarmMetricViewSet(viewsets.ModelViewSet):
	serializer_class = FarmMetricSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = FarmMetric.objects.select_related('farm', 'farm__owner')
		metric_type = self.request.query_params.get('metric_type')
		if metric_type:
			qs = qs.filter(metric_type=metric_type)
		if self.request.user.is_staff:
			return qs
		return qs.filter(farm__owner=self.request.user)

	def perform_create(self, serializer):
		farm = serializer.validated_data['farm']
		if not self.request.user.is_staff and farm.owner != self.request.user:
			raise PermissionDenied('You cannot submit metrics for another farmer.')
		serializer.save()


class FarmAnalyticsSummaryView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	def get(self, request):
		qs = FarmMetric.objects.select_related('farm')
		metric_type = request.query_params.get('metric_type')
		if metric_type:
			qs = qs.filter(metric_type=metric_type)
		if not request.user.is_staff:
			qs = qs.filter(farm__owner=request.user)

		data = (
			qs.values('farm__id', 'farm__name')
			.annotate(
				total_value=Sum('value'),
				metric_count=Count('id'),
				average_value=Avg('value'),
			)
			.order_by('farm__name')
		)
		return Response(list(data))
