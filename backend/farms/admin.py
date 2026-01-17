from django.contrib import admin

from .models import Activity, Farm, Field


class FieldInline(admin.TabularInline):
	model = Field
	extra = 0
	fields = ('field_name', 'field_number', 'area', 'current_crop', 'is_active')
	show_change_link = True


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
	list_display = ('name', 'owner', 'location', 'total_area', 'soil_type', 'irrigation_type', 'is_active', 'created_at')
	search_fields = ('name', 'location', 'owner__email')
	list_filter = ('soil_type', 'irrigation_type', 'is_active')
	inlines = [FieldInline]


@admin.register(Field)
class FieldAdmin(admin.ModelAdmin):
	list_display = ('field_name', 'farm', 'area', 'current_crop', 'is_active')
	search_fields = ('field_name', 'farm__name')
	list_filter = ('is_active',)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
	list_display = ('field', 'activity_type', 'date', 'quantity', 'unit', 'cost', 'performed_by')
	list_filter = ('activity_type', 'date')
	search_fields = ('field__field_name', 'field__farm__name', 'performed_by__email')
