"""Analytics serializers."""

from rest_framework import serializers

from .models import FarmMetric


class FarmMetricSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source='farm.name', read_only=True)

    class Meta:
        model = FarmMetric
        fields = (
            'id',
            'farm',
            'farm_name',
            'metric_type',
            'value',
            'unit',
            'notes',
            'recorded_at',
        )
        read_only_fields = ('id', 'farm_name')
