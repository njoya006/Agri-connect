"""Farm serializers."""

from rest_framework import serializers

from .models import Activity, Farm, Field
from .utils import store_activity_images


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for field activities including image uploads."""

    field = serializers.PrimaryKeyRelatedField(queryset=Field.objects.all(), required=False)
    performer_email = serializers.SerializerMethodField()
    field_name = serializers.CharField(source='field.field_name', read_only=True)
    upload_images = serializers.ListField(
        child=serializers.ImageField(max_length=None, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Activity
        fields = (
            'id',
            'field',
            'field_name',
            'activity_type',
            'date',
            'description',
            'quantity',
            'unit',
            'cost',
            'weather_conditions',
            'performed_by',
            'performer_email',
            'images',
            'upload_images',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('performed_by', 'performer_email', 'images', 'created_at', 'updated_at')
        extra_kwargs = {'field': {'required': False}}

    def get_performer_email(self, obj):
        return obj.performed_by.email if obj.performed_by else None

    def _persist_images(self, instance, uploads):
        if not uploads:
            return
        paths = store_activity_images(uploads)
        instance.images = list(instance.images or []) + paths
        instance.save(update_fields=['images'])

    def create(self, validated_data):
        uploads = validated_data.pop('upload_images', [])
        validated_data['performed_by'] = self.context['request'].user
        activity = super().create(validated_data)
        self._persist_images(activity, uploads)
        return activity

    def update(self, instance, validated_data):
        uploads = validated_data.pop('upload_images', [])
        activity = super().update(instance, validated_data)
        self._persist_images(activity, uploads)
        return activity


class FieldSerializer(serializers.ModelSerializer):
    """Serializer for farm fields."""

    farm = serializers.PrimaryKeyRelatedField(queryset=Farm.objects.all(), required=False)
    farm_name = serializers.CharField(source='farm.name', read_only=True)
    activity_count = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = (
            'id',
            'farm',
            'farm_name',
            'field_name',
            'field_number',
            'area',
            'current_crop',
            'crop_history',
            'soil_ph',
            'last_fertilized_date',
            'last_harvest_date',
            'notes',
            'is_active',
            'activity_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'activity_count',
            'created_at',
            'updated_at',
            'last_fertilized_date',
            'last_harvest_date',
        )
        extra_kwargs = {'farm': {'required': False}}

    def get_activity_count(self, obj):
        return obj.activities.count()


class FarmSerializer(serializers.ModelSerializer):
    """Serializer handling nested farm context."""

    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    fields = FieldSerializer(many=True, read_only=True)
    active_field_count = serializers.SerializerMethodField()
    total_yield = serializers.SerializerMethodField()
    last_activity_date = serializers.SerializerMethodField()

    class Meta:
        model = Farm
        fields = (
            'id',
            'owner',
            'owner_email',
            'name',
            'location',
            'total_area',
            'soil_type',
            'irrigation_type',
            'latitude',
            'longitude',
            'established_date',
            'is_active',
            'active_field_count',
            'total_yield',
            'last_activity_date',
            'fields',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'owner',
            'owner_email',
            'active_field_count',
            'total_yield',
            'last_activity_date',
            'created_at',
            'updated_at',
        )

    def get_active_field_count(self, obj):
        return obj.get_active_fields().count()

    def get_total_yield(self, obj):
        return obj.calculate_total_yield()

    def get_last_activity_date(self, obj):
        activity = Activity.objects.filter(field__farm=obj).order_by('-date', '-created_at').first()
        return activity.date if activity else None
