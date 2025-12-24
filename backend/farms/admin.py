from django.contrib import admin

from .models import Farm


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
	list_display = ('name', 'owner', 'location', 'acreage', 'is_active')
	search_fields = ('name', 'location', 'owner__email')
	list_filter = ('is_active',)
