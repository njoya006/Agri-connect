"""Marketplace serializers."""

from __future__ import annotations

import os
from typing import Iterable
from uuid import uuid4

from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import Listing, PriceUpdate


class ListingSerializer(serializers.ModelSerializer):
    seller_email = serializers.EmailField(source='seller.email', read_only=True)
    image_uploads = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False, allow_empty=True
    )
    clear_images = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Listing
        fields = (
            'id',
            'farm',
            'seller',
            'seller_email',
            'category',
            'title',
            'description',
            'quantity',
            'unit',
            'price_per_unit',
            'quality_grade',
            'location',
            'images',
            'image_uploads',
            'clear_images',
            'is_negotiable',
            'status',
            'expires_at',
            'views_count',
            'inventory_item',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'seller',
            'seller_email',
            'views_count',
            'created_at',
            'updated_at',
        )
        extra_kwargs = {'images': {'required': False}}

    def validate_inventory_item(self, value: Listing.inventory_item) -> Listing.inventory_item:
        request = self.context.get('request')
        if value and request and not request.user.is_staff and value.owner != request.user:
            raise serializers.ValidationError('Inventory item must belong to you.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        farm = attrs.get('farm') or getattr(self.instance, 'farm', None)
        if request and farm and not request.user.is_staff and farm.owner != request.user:
            raise serializers.ValidationError('You can only list products for your own farm.')
        inventory_item = attrs.get('inventory_item')
        if inventory_item:
            if farm and inventory_item.farm_id != farm.id:
                raise serializers.ValidationError('Inventory item must be part of the selected farm.')
            quantity = attrs.get('quantity') or getattr(self.instance, 'quantity', None)
            if quantity and inventory_item.quantity < quantity:
                raise serializers.ValidationError('Listed quantity exceeds available inventory stock.')
            category = attrs.get('category') or getattr(self.instance, 'category', None)
            if category == Listing.Category.CROPS and inventory_item.category != inventory_item.Category.HARVEST:
                raise serializers.ValidationError('Crop listings must reference harvest inventory items.')
        location = attrs.get('location')
        if not location and not getattr(self.instance, 'location', None):
            raise serializers.ValidationError('Location is required.')
        return attrs

    def create(self, validated_data):
        images = self._pop_uploaded_images(validated_data)
        instance = super().create(validated_data)
        if images is not None:
            instance.images = images
            instance.save(update_fields=['images'])
        return instance

    def update(self, instance, validated_data):
        images = self._pop_uploaded_images(validated_data, existing=instance.images)
        instance = super().update(instance, validated_data)
        if images is not None:
            instance.images = images
            instance.save(update_fields=['images'])
        return instance

    def _pop_uploaded_images(self, validated_data, existing: Iterable[str] | None = None):
        clear_images = validated_data.pop('clear_images', False)
        uploads = validated_data.pop('image_uploads', None)
        if uploads is None and not clear_images:
            return None
        images = [] if clear_images else list(existing or [])
        if uploads:
            for upload in uploads:
                images.append(self._store_image(upload))
        return images

    @staticmethod
    def _store_image(upload) -> str:
        ext = os.path.splitext(upload.name)[1]
        path = f"marketplace/listings/{uuid4().hex}{ext}"
        saved_path = default_storage.save(path, upload)
        return default_storage.url(saved_path)


class PriceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceUpdate
        fields = (
            'id',
            'commodity',
            'grade',
            'market',
            'price_per_unit',
            'unit',
            'effective_date',
            'is_current',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
