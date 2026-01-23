"""Farm serializers."""

from rest_framework import serializers

from .models import Farm


class FarmSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)

    class Meta:
        model = Farm
        fields = (
            'id',
            'owner',
            'owner_email',
            'name',
            'location',
            'acreage',
            'crop_types',
            'irrigation_type',
            'soil_type',
            'certifications',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'owner', 'owner_email', 'created_at', 'updated_at')
