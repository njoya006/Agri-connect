"""Marketplace serializers."""

from rest_framework import serializers

from .models import Listing


class ListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.EmailField(source='seller.email', read_only=True)

    class Meta:
        model = Listing
        fields = (
            'id',
            'farm',
            'seller',
            'seller_email',
            'title',
            'description',
            'unit_price',
            'quantity_available',
            'unit',
            'status',
            'available_from',
            'available_to',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'seller', 'seller_email', 'created_at', 'updated_at')
