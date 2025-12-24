"""Inventory serializers."""

from rest_framework import serializers

from .models import InventoryItem


class InventoryItemSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = (
            'id',
            'farm',
            'farm_name',
            'name',
            'category',
            'quantity',
            'unit',
            'reorder_level',
            'notes',
            'last_audited',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'farm_name', 'created_at', 'updated_at')
