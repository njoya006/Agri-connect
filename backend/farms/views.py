"""Farm API views."""

import csv
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Activity, Farm, Field
from .serializers import ActivitySerializer, FarmSerializer, FieldSerializer


class FarmViewSet(viewsets.ModelViewSet):
	"""CRUD plus nested utilities for farms."""

	serializer_class = FarmSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = Farm.objects.select_related('owner').prefetch_related('fields__activities')
		if self.request.user.is_staff:
			return qs
		return qs.filter(owner=self.request.user)

	def perform_create(self, serializer):
		serializer.save(owner=self.request.user)

	@action(detail=True, methods=['get', 'post'], url_path='fields')
	def fields(self, request, pk=None):
		farm = self.get_object()
		if request.method == 'GET':
			serializer = FieldSerializer(farm.fields.all(), many=True, context={'request': request})
			return Response(serializer.data)
		payload = request.data.copy()
		payload['farm'] = farm.pk
		serializer = FieldSerializer(data=payload, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save(farm=farm)
		return Response(serializer.data, status=status.HTTP_201_CREATED)

	@action(detail=True, methods=['get'], url_path='stats')
	def stats(self, request, pk=None):
		farm = self.get_object()
		fields = farm.fields.all()
		activities = Activity.objects.filter(field__farm=farm)
		total_area = fields.aggregate(total=Sum('area'))['total'] or Decimal('0')
		last_activity = activities.order_by('-date', '-created_at').first()
		upcoming = activities.filter(date__gt=timezone.now().date()).count()
		return Response(
			{
				'field_count': fields.count(),
				'active_field_count': fields.filter(is_active=True).count(),
				'total_area': total_area,
				'total_yield': farm.calculate_total_yield(),
				'last_activity_date': last_activity.date if last_activity else None,
				'upcoming_activity_count': upcoming,
			}
		)

	@action(detail=True, methods=['get'], url_path='export')
	def export(self, request, pk=None):
		farm = self.get_object()
		response = HttpResponse(content_type='text/csv')
		response['Content-Disposition'] = f'attachment; filename=farm_{farm.id}_activities.csv'
		writer = csv.writer(response)
		writer.writerow([
			'Field Name',
			'Activity Type',
			'Date',
			'Quantity',
			'Unit',
			'Cost',
			'Performed By',
		])
		for field in farm.fields.all().prefetch_related('activities', 'activities__performed_by'):
			for activity in field.activities.all():
				writer.writerow([
					field.field_name,
					activity.get_activity_type_display(),
					activity.date,
					activity.quantity,
					activity.unit,
					activity.cost,
					activity.performed_by.email if activity.performed_by else '',
				])
		return response

	@action(detail=False, methods=['get'], url_path='dashboard')
	def dashboard(self, request):
		farms = self.get_queryset()
		fields = Field.objects.filter(farm__in=farms)
		activities = Activity.objects.filter(field__farm__in=farms)
		total_area = fields.aggregate(total=Sum('area'))['total'] or Decimal('0')
		harvest_total = activities.filter(activity_type=Activity.ActivityType.HARVESTING).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
		recent = activities.order_by('-date', '-created_at')[:5]
		return Response(
			{
				'farm_count': farms.count(),
				'field_count': fields.count(),
				'active_field_count': fields.filter(is_active=True).count(),
				'total_area': total_area,
				'total_yield': harvest_total,
				'recent_activities': ActivitySerializer(recent, many=True, context={'request': request}).data,
			}
		)


class FieldViewSet(viewsets.ModelViewSet):
	"""Field CRUD with nested activity helpers."""

	serializer_class = FieldSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = Field.objects.select_related('farm', 'farm__owner').prefetch_related('activities')
		if self.request.user.is_staff:
			return qs
		return qs.filter(farm__owner=self.request.user)

	def _assert_owner(self, farm):
		if self.request.user.is_staff:
			return
		if farm.owner != self.request.user:
			raise PermissionDenied("You cannot modify another farmer's data.")

	def perform_create(self, serializer):
		farm = serializer.validated_data['farm']
		self._assert_owner(farm)
		serializer.save()

	def perform_update(self, serializer):
		self._assert_owner(serializer.instance.farm)
		serializer.save()

	def perform_destroy(self, instance):
		self._assert_owner(instance.farm)
		instance.delete()

	@action(detail=True, methods=['get', 'post'], url_path='activities')
	def activities(self, request, pk=None):
		field = self.get_object()
		if request.method == 'GET':
			serializer = ActivitySerializer(field.activities.all(), many=True, context={'request': request})
			return Response(serializer.data)
		payload = request.data.copy()
		payload['field'] = field.pk
		serializer = ActivitySerializer(data=payload, context={'request': request})
		serializer.is_valid(raise_exception=True)
		serializer.save(field=field)
		return Response(serializer.data, status=status.HTTP_201_CREATED)


class ActivityViewSet(viewsets.ModelViewSet):
	"""Activity CRUD constrained to farm ownership."""

	serializer_class = ActivitySerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = Activity.objects.select_related('field', 'field__farm', 'performed_by', 'field__farm__owner')
		if self.request.user.is_staff:
			return qs
		return qs.filter(field__farm__owner=self.request.user)

	def _assert_field_owner(self, field):
		if self.request.user.is_staff:
			return
		if field.farm.owner != self.request.user:
			raise PermissionDenied("You cannot log activities for another farmer.")

	def perform_create(self, serializer):
		field = serializer.validated_data['field']
		self._assert_field_owner(field)
		serializer.save()

	def perform_update(self, serializer):
		self._assert_field_owner(serializer.instance.field)
		serializer.save()

	def perform_destroy(self, instance):
		self._assert_field_owner(instance.field)
		instance.delete()
