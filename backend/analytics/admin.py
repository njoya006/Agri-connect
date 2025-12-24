from django.contrib import admin

from .models import FarmMetric


@admin.register(FarmMetric)
class FarmMetricAdmin(admin.ModelAdmin):
	list_display = ('farm', 'metric_type', 'value', 'unit', 'recorded_at')
	list_filter = ('metric_type',)
	search_fields = ('farm__name', 'metric_type')
