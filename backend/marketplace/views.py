"""Marketplace API views."""

from __future__ import annotations

from django.db.models import Q
from django_filters import rest_framework as df_filters
from rest_framework import filters, mixins, parsers, permissions, viewsets
from rest_framework.response import Response

from .models import Listing, PriceUpdate
from .serializers import ListingSerializer, PriceUpdateSerializer




class ListingFilterSet(df_filters.FilterSet):
	price_min = df_filters.NumberFilter(field_name='price_per_unit', lookup_expr='gte')
	price_max = df_filters.NumberFilter(field_name='price_per_unit', lookup_expr='lte')
	expires_before = df_filters.DateTimeFilter(field_name='expires_at', lookup_expr='lte')
	expires_after = df_filters.DateTimeFilter(field_name='expires_at', lookup_expr='gte')

	class Meta:
		model = Listing
		fields = {
			'category': ['exact'],
			'quality_grade': ['exact'],
			'status': ['exact'],
			'is_negotiable': ['exact'],
			'seller': ['exact'],
			'farm': ['exact'],
		}


class IsSellerOrReadOnly(permissions.BasePermission):
	def has_permission(self, request, view):
		if view.action in ['create', 'update', 'partial_update', 'destroy']:
			return request.user and request.user.is_authenticated
		return True

	def has_object_permission(self, request, view, obj):
		if request.method in permissions.SAFE_METHODS:
			return True
		return request.user.is_staff or obj.seller_id == getattr(request.user, 'id', None)


class AdminOrReadOnly(permissions.BasePermission):
	def has_permission(self, request, view):
		if request.method in permissions.SAFE_METHODS:
			return True
		return request.user and request.user.is_staff


class ListingViewSet(viewsets.ModelViewSet):
	serializer_class = ListingSerializer
	queryset = Listing.objects.select_related('seller', 'farm', 'inventory_item')
	permission_classes = [IsSellerOrReadOnly]
	parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
	filter_backends = [df_filters.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_class = ListingFilterSet
	search_fields = ['title', 'description', 'location']
	ordering_fields = ['price_per_unit', 'created_at', 'expires_at', 'views_count']
	ordering = ['-created_at']

	def get_queryset(self):
		Listing.expire_outdated()
		qs = super().get_queryset()
		user = self.request.user
		mine = self.request.query_params.get('mine') == 'true'
		if self.action == 'list':
			if mine and user.is_authenticated:
				return qs.filter(seller=user)
			if user.is_staff:
				return qs
			return qs.filter(status=Listing.Status.ACTIVE)
		if self.action == 'retrieve':
			if user.is_staff:
				return qs
			if user.is_authenticated:
				return qs.filter(Q(status=Listing.Status.ACTIVE) | Q(seller=user))
			return qs.filter(status=Listing.Status.ACTIVE)
		return qs

	def perform_create(self, serializer):
		serializer.save(seller=self.request.user)

	def perform_update(self, serializer):
		serializer.save(seller=self.request.user)

	def retrieve(self, request, *args, **kwargs):
		instance = self.get_object()
		if request.method == 'GET':
			instance.mark_viewed()
		serializer = self.get_serializer(instance)
		return Response(serializer.data)


class PriceUpdateViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
	serializer_class = PriceUpdateSerializer
	queryset = PriceUpdate.objects.all()
	permission_classes = [AdminOrReadOnly]
	filter_backends = [df_filters.DjangoFilterBackend]
	filterset_fields = ('commodity', 'grade', 'market', 'is_current')
