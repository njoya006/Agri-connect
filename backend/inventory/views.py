"""Inventory views and endpoints."""

from __future__ import annotations

import csv
import io
from datetime import timedelta
from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from farms.models import Farm

from .models import InventoryItem, InventoryTransaction, LowStockAlert
from .serializers import InventoryItemSerializer, InventoryTransactionSerializer, LowStockAlertSerializer
from .services import apply_inventory_transaction


class InventoryItemViewSet(viewsets.ModelViewSet):
	"""CRUD for inventory items plus CSV utilities."""

	serializer_class = InventoryItemSerializer
	permission_classes = [permissions.IsAuthenticated]
	queryset = InventoryItem.objects.select_related('farm', 'farm__owner', 'owner')

	def get_queryset(self):
		if self.request.user.is_staff:
			return self.queryset
		return self.queryset.filter(owner=self.request.user)

	def perform_create(self, serializer):
		serializer.save(owner=self.request.user)

	def perform_update(self, serializer):
		quantity = serializer.validated_data.pop('quantity', None)
		item = serializer.save()
		if quantity is not None:
			quantity = Decimal(quantity)
			current_quantity = item.quantity
			delta = quantity - current_quantity
			if delta:
				apply_inventory_transaction(
					item=item,
					quantity_change=delta,
					transaction_type=InventoryTransaction.TransactionType.ADJUSTMENT,
					performed_by=self.request.user,
					notes='Manual adjustment via item update',
				)

	@action(detail=False, methods=['post'], url_path='import')
	def import_csv(self, request):
		file = request.FILES.get('file')
		if not file:
			return Response({'detail': 'Upload a CSV file under the "file" key.'}, status=status.HTTP_400_BAD_REQUEST)

		decoded = file.read().decode('utf-8-sig')
		reader = csv.DictReader(io.StringIO(decoded))
		created = 0

		def _decimal(value, default='0'):
			try:
				return Decimal(str(value))
			except (InvalidOperation, TypeError):
				return Decimal(default)

		for row in reader:
			farm_id = row.get('farm')
			if not farm_id:
				continue
			farm_qs = Farm.objects.all()
			if not request.user.is_staff:
				farm_qs = farm_qs.filter(owner=request.user)
			farm = farm_qs.filter(pk=farm_id).first()
			if not farm:
				continue
			category_value = (row.get('category') or InventoryItem.Category.SEEDS).lower()
			if category_value not in InventoryItem.Category.values:
				category_value = InventoryItem.Category.SEEDS
			InventoryItem.objects.create(
				farm=farm,
				owner=farm.owner,
				category=category_value,
				name=row.get('name') or 'Unnamed Item',
				description=row.get('description', ''),
				quantity=_decimal(row.get('quantity'), '0'),
				unit=row.get('unit', 'kg'),
				minimum_stock_level=_decimal(row.get('minimum_stock_level'), '0'),
				purchase_price=_decimal(row.get('purchase_price'), '0') if row.get('purchase_price') else None,
				selling_price=_decimal(row.get('selling_price'), '0') if row.get('selling_price') else None,
				expiry_date=row.get('expiry_date') or None,
				storage_location=row.get('storage_location', ''),
				supplier_info=row.get('supplier_info', ''),
			)
			created += 1
		return Response({'created': created})

	@action(detail=False, methods=['get'], url_path='export')
	def export_csv(self, request):
		fieldnames = [
			'id', 'farm', 'category', 'name', 'description', 'quantity', 'unit',
			'minimum_stock_level', 'purchase_price', 'selling_price', 'expiry_date',
			'storage_location', 'supplier_info', 'last_audited', 'created_at', 'updated_at'
		]
		response = HttpResponse(content_type='text/csv')
		response['Content-Disposition'] = 'attachment; filename="inventory.csv"'
		writer = csv.DictWriter(response, fieldnames=fieldnames)
		writer.writeheader()
		for item in self.get_queryset():
			writer.writerow({
				'id': item.id,
				'farm': item.farm_id,
				'category': item.category,
				'name': item.name,
				'description': item.description,
				'quantity': item.quantity,
				'unit': item.unit,
				'minimum_stock_level': item.minimum_stock_level,
				'purchase_price': item.purchase_price,
				'selling_price': item.selling_price,
				'expiry_date': item.expiry_date,
				'storage_location': item.storage_location,
				'supplier_info': item.supplier_info,
				'last_audited': item.last_audited,
				'created_at': item.created_at,
				'updated_at': item.updated_at,
			})
		return response


class InventoryTransactionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
	serializer_class = InventoryTransactionSerializer
	permission_classes = [permissions.IsAuthenticated]
	queryset = InventoryTransaction.objects.select_related('item', 'item__farm', 'performed_by')

	def get_queryset(self):
		if self.request.user.is_staff:
			return self.queryset
		return self.queryset.filter(item__owner=self.request.user)

	def perform_create(self, serializer):
		validated = serializer.validated_data
		tx = apply_inventory_transaction(
			item=validated['item'],
			quantity_change=validated['quantity_change'],
			transaction_type=validated['transaction_type'],
			performed_by=self.request.user,
			related_activity=validated.get('related_activity'),
			related_listing=validated.get('related_listing'),
			notes=validated.get('notes', ''),
		)
		if not tx:
			raise serializers.ValidationError('Unable to record transaction; verify quantity change is non-zero.')
		serializer.instance = tx


class LowStockAlertViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
	serializer_class = LowStockAlertSerializer
	permission_classes = [permissions.IsAuthenticated]
	queryset = LowStockAlert.objects.select_related('item', 'item__farm')

	def get_queryset(self):
		if self.request.user.is_staff:
			return self.queryset
		return self.queryset.filter(item__owner=self.request.user)

	def perform_update(self, serializer):
		instance = serializer.save()
		if instance.resolved and not instance.resolved_at:
			instance.resolved_at = timezone.now()
			instance.save(update_fields=['resolved_at'])


class InventoryReportViewSet(viewsets.ViewSet):
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		qs = InventoryItem.objects.select_related('farm')
		if self.request.user.is_staff:
			return qs
		return qs.filter(owner=self.request.user)

	def list(self, request):
		"""Return the default summary report when listing the endpoint."""
		return self.summary(request)

	@action(detail=False, methods=['get'], url_path='summary')
	def summary(self, request):
		items = self.get_queryset()
		value_expression = ExpressionWrapper(
			F('quantity') * Coalesce(F('selling_price'), F('purchase_price'), Value(0)),
			output_field=DecimalField(max_digits=18, decimal_places=2),
		)
		aggregates = items.aggregate(total_value=Coalesce(Sum(value_expression), Value(0)))
		low_stock_count = items.filter(quantity__lt=F('minimum_stock_level')).count()
		now = timezone.now().date()
		expiring_threshold = now + timedelta(days=14)
		expiring_qs = items.filter(expiry_date__isnull=False, expiry_date__lte=expiring_threshold)
		category_totals = list(items.values('category').annotate(total=Sum('quantity')).order_by('category'))
		data = {
			'total_items': items.count(),
			'total_value': Decimal(aggregates['total_value']),
			'low_stock_items': low_stock_count,
			'expiring_soon': expiring_qs.count(),
			'categories': category_totals,
		}
		return Response(data)
