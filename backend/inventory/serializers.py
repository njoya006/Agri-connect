"""Inventory serializers."""

from __future__ import annotations

from decimal import Decimal
from rest_framework import serializers

from .models import InventoryItem, InventoryTransaction, LowStockAlert


class InventoryTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    farm_name = serializers.CharField(source='item.farm.name', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = (
            'id',
            'item',
            'item_name',
            'farm_name',
            'transaction_type',
            'quantity_change',
            'previous_quantity',
            'new_quantity',
            'related_activity',
            'related_listing',
            'performed_by',
            'transaction_date',
            'notes',
        )
        read_only_fields = ('id', 'previous_quantity', 'new_quantity', 'transaction_date')

    def validate_item(self, value: InventoryItem) -> InventoryItem:
        request = self.context.get('request')
        if request and not request.user.is_staff and value.farm.owner != request.user:
            raise serializers.ValidationError('You cannot modify another farm\'s inventory.')
        return value


class LowStockAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    farm_name = serializers.CharField(source='item.farm.name', read_only=True)

    class Meta:
        model = LowStockAlert
        fields = (
            'id',
            'item',
            'item_name',
            'farm_name',
            'current_quantity',
            'alerted_at',
            'acknowledged',
            'resolved',
            'resolved_at',
        )
        read_only_fields = ('id', 'current_quantity', 'alerted_at', 'resolved_at')


class InventoryItemSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    total_value = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    is_expiring_soon = serializers.SerializerMethodField()
    transactions = InventoryTransactionSerializer(source='transactions', many=True, read_only=True)

    class Meta:
        model = InventoryItem
        fields = (
            'id',
            'farm',
            'farm_name',
            'category',
            'name',
            'description',
            'quantity',
            'unit',
            'minimum_stock_level',
            'purchase_price',
            'selling_price',
            'expiry_date',
            'storage_location',
            'supplier_info',
            'last_audited',
            'created_at',
            'updated_at',
            'total_value',
            'is_low_stock',
            'is_expiring_soon',
            'transactions',
        )
        read_only_fields = ('id', 'farm_name', 'created_at', 'updated_at', 'total_value', 'is_low_stock', 'is_expiring_soon', 'transactions')

    def validate(self, attrs):
        request = self.context.get('request')
        if request and not request.user.is_staff:
            farm = attrs.get('farm') or getattr(self.instance, 'farm', None)
            if farm and farm.owner != request.user:
                raise serializers.ValidationError('You can only manage inventory for your farms.')
        return super().validate(attrs)

    def get_total_value(self, obj: InventoryItem) -> Decimal:
        return obj.total_value

    def get_is_low_stock(self, obj: InventoryItem) -> bool:
        return obj.is_low_stock

    def get_is_expiring_soon(self, obj: InventoryItem) -> bool:
        return obj.is_expiring_soon
