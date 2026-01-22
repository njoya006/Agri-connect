"""Inventory views and endpoints."""

from __future__ import annotations

import csv
import io
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import DecimalField, ExpressionWrapper, F, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import StreamingHttpResponse
import time
import json
from django.views import View
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from celery.result import AsyncResult
from django.conf import settings
import os
from .tasks import export_inventory_csv_task

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
		from django.db import IntegrityError
		try:
			serializer.save(owner=self.request.user)
		except IntegrityError as e:
			from rest_framework.exceptions import ValidationError
			if 'unique' in str(e).lower():
				raise ValidationError({'detail': 'An item with this name and category already exists for this farm.'})
			raise

	def perform_update(self, serializer):
		from django.db import IntegrityError
		quantity = serializer.validated_data.pop('quantity', None)
		try:
			item = serializer.save()
		except IntegrityError as e:
			from rest_framework.exceptions import ValidationError
			if 'unique' in str(e).lower():
				raise ValidationError({'detail': 'An item with this name and category already exists for this farm.'})
			raise
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

	def perform_create(self, serializer):
		from django.core.exceptions import ValidationError
		validated = serializer.validated_data
		try:
			tx = apply_inventory_transaction(
				item=validated['item'],
				quantity_change=validated['quantity_change'],
				transaction_type=validated['transaction_type'],
				performed_by=self.request.user,
				related_activity=validated.get('related_activity'),
				notes=validated.get('notes', ''),
			)
			serializer.instance = tx
		except ValidationError as e:
			from rest_framework.exceptions import ValidationError as DRFValidationError
			raise DRFValidationError({"detail": str(e)})
	def get_queryset(self):
		qs = InventoryItem.objects.select_related('farm')
		if self.request.user.is_staff:
			return qs
		return qs.filter(owner=self.request.user)

	@action(detail=False, methods=['get'], url_path='restocking-prediction')
	def restocking_prediction(self, request):
		"""Predict restocking needs for each inventory item based on usage trends and minimum stock."""
		from django.db.models import Avg
		days = int(request.GET.get('days', 30))
		end_date = timezone.now()
		start_date = end_date - timedelta(days=days)
		items = self.get_queryset()
		predictions = []
		for item in items:
			# Calculate average daily usage (negative quantity_change for USAGE/SALE)
			usage_qs = item.transactions.filter(
				transaction_type__in=[
					InventoryTransaction.TransactionType.USAGE,
					InventoryTransaction.TransactionType.SALE
				],
				transaction_date__range=(start_date, end_date)
			)
			total_usage = usage_qs.aggregate(total=Coalesce(Sum('quantity_change'), Value(0)))['total']
			avg_daily_usage = abs(float(total_usage)) / days if days > 0 else 0
			days_until_restock = None
			if avg_daily_usage > 0:
				days_until_restock = float(item.quantity) / avg_daily_usage if item.quantity > 0 else 0
			predictions.append({
				'item_id': item.id,
				'item_name': item.name,
				'current_quantity': float(item.quantity),
				'minimum_stock_level': float(item.minimum_stock_level),
				'avg_daily_usage': avg_daily_usage,
				'days_until_restock': days_until_restock,
				'should_restock': item.quantity < item.minimum_stock_level or (days_until_restock is not None and days_until_restock < 7),
			})
		return Response(predictions)

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

	@action(detail=False, methods=['get'], url_path='turnover-rate')
	def turnover_rate(self, request):
		"""Calculate inventory turnover rate for each item (sales/average inventory)."""
		# For demo: turnover = total out transactions / average inventory (last 30 days)
		from django.db.models import Avg, Q
		days = int(request.GET.get('days', 30))
		end_date = timezone.now()
		start_date = end_date - timedelta(days=days)
		items = self.get_queryset()
		result = []
		for item in items:
			# Out transactions (sales, deduction, etc.)
			from django.db.models import DecimalField
			out_tx = item.transactions.filter(
				transaction_type__in=[
					InventoryTransaction.TransactionType.USAGE,
					InventoryTransaction.TransactionType.SALE,
					InventoryTransaction.TransactionType.ADJUSTMENT,
				],
				transaction_date__range=(start_date, end_date)
			).aggregate(total_out=Coalesce(Sum('quantity_change'), Value(0), output_field=DecimalField()))
			# Average inventory (approximate: avg quantity at start/end)
			start_qty = item.quantity
			# Optionally, could use historical logs for more accuracy
			avg_inventory = item.quantity  # Placeholder for now
			turnover = float(out_tx['total_out']) / float(avg_inventory) if avg_inventory else 0
			result.append({
				'item_id': item.id,
				'item_name': item.name,
				'turnover_rate': turnover,
				'total_out': float(out_tx['total_out']),
				'average_inventory': float(avg_inventory),
			})
		return Response(result)

	@action(detail=False, methods=['get'], url_path='stock-value-trend')
	def stock_value_trend(self, request):
		"""Return stock value trend for the last N days (default 30)."""
		days = int(request.GET.get('days', 30))
		end_date = timezone.now().date()
		start_date = end_date - timedelta(days=days)
		items = self.get_queryset()
		trend = []
		for i in range(days + 1):
			day = start_date + timedelta(days=i)
			day_items = items.filter(updated_at__date__lte=day)
			value_expression = ExpressionWrapper(
				F('quantity') * Coalesce(F('selling_price'), F('purchase_price'), Value(0)),
				output_field=DecimalField(max_digits=18, decimal_places=2),
			)
			total_value = day_items.aggregate(tv=Coalesce(Sum(value_expression), Value(0)))['tv']
			trend.append({'date': str(day), 'total_value': float(total_value)})
		return Response(trend)


def alerts_stream(request):
	"""SSE stream of low-stock alerts (simple polling-based implementation).

	This endpoint yields Server-Sent Events for newly created LowStockAlert rows.
	It's intentionally simple for development: it polls the DB every 2 seconds for
	alerts with id > last_id and yields them as JSON payloads.
	 """
	# optional starting id
	try:
		last_id = int(request.GET.get('since_id', '0') or 0)
	except ValueError:
		last_id = 0

	def event_stream():
		nonlocal last_id
		while True:
			qs = LowStockAlert.objects.filter(pk__gt=last_id).select_related('item').order_by('pk')
			for alert in qs:
				payload = {
					'type': 'low_stock',
					'alert_id': alert.pk,
					'item_id': alert.item_id,
					'current_quantity': str(alert.current_quantity),
					'message': f'Low stock for {alert.item.name}',
				}
				last_id = alert.pk
				yield f"event: low_stock\n"
				yield f"data: {json.dumps(payload)}\n\n"
			time.sleep(2)

	return StreamingHttpResponse(event_stream(), content_type='text/event-stream')



from django.views import View
from django.http import JsonResponse, HttpResponseForbidden

class InventoryExportStartView(View):
	def post(self, request):
		if not request.user.is_authenticated:
			return HttpResponseForbidden("Authentication required.")
		filters = request.POST.get('filters')
		task = export_inventory_csv_task.apply_async(args=[request.user.id, filters])
		return JsonResponse({'task_id': task.id}, status=202)



class InventoryExportStatusView(View):
	def get(self, request, task_id):
		if not request.user.is_authenticated:
			return HttpResponseForbidden("Authentication required.")
		result = AsyncResult(task_id)
		if result.state == 'SUCCESS':
			file = result.result.get('file')
			url = os.path.join(settings.MEDIA_URL, file)
			return JsonResponse({'state': result.state, 'url': url, 'total': result.result.get('total')})
		return JsonResponse({'state': result.state, 'progress': result.info}, status=200)


# --- Server-side streaming CSV export ---
from django.utils.encoding import smart_str

class InventoryExportStreamView(View):
	def get(self, request):
		# Manual authentication check
		if not request.user.is_authenticated:
			from django.http import HttpResponseForbidden
			return HttpResponseForbidden("Authentication required.")

		filters = {}
		farm = request.GET.get('farm')
		if farm:
			filters['farm_id'] = farm
		category = request.GET.get('category')
		if category:
			filters['category'] = category

		# Date range filtering (created_at)
		start_date = request.GET.get('start_date')
		end_date = request.GET.get('end_date')

		qs = InventoryItem.objects.select_related('farm', 'owner')
		if not request.user.is_staff:
			qs = qs.filter(owner=request.user)
		if filters:
			qs = qs.filter(**filters)
		if start_date:
			qs = qs.filter(created_at__gte=start_date)
		if end_date:
			qs = qs.filter(created_at__lte=end_date)

		# Allow user to specify fields to export
		default_fields = [
			'id', 'farm', 'category', 'name', 'description', 'quantity', 'unit',
			'minimum_stock_level', 'purchase_price', 'selling_price', 'expiry_date',
			'storage_location', 'supplier_info', 'last_audited', 'created_at', 'updated_at'
		]
		fields_param = request.GET.get('fields')
		if fields_param:
			# Only allow valid fields
			requested_fields = [f.strip() for f in fields_param.split(',') if f.strip() in default_fields]
			fieldnames = requested_fields if requested_fields else default_fields
		else:
			fieldnames = default_fields

		def row_generator():
			output = io.StringIO()
			writer = csv.DictWriter(output, fieldnames=fieldnames)
			writer.writeheader()
			yield smart_str(output.getvalue())
			output.seek(0)
			output.truncate(0)
			for item in qs.iterator():
				row = {}
				for field in fieldnames:
					if field == 'farm':
						row['farm'] = item.farm_id
					else:
						row[field] = getattr(item, field, '')
				writer.writerow(row)
				yield smart_str(output.getvalue())
				output.seek(0)
				output.truncate(0)

		response = StreamingHttpResponse(row_generator(), content_type='text/csv', status=200)
		response['Content-Disposition'] = 'attachment; filename="inventory_stream.csv"'
		return response
