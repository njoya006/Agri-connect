from django.contrib import admin

from .models import Listing, PriceUpdate


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
	list_display = ('title', 'seller', 'category', 'price_per_unit', 'quantity', 'status', 'expires_at')
	list_filter = ('status', 'category', 'quality_grade', 'is_negotiable')
	search_fields = ('title', 'description', 'seller__email', 'location')
	readonly_fields = ('views_count', 'created_at', 'updated_at')
	fieldsets = (
		(None, {'fields': ('title', 'description', 'category', 'quality_grade', 'images')}),
		('Inventory', {'fields': ('farm', 'inventory_item')}),
		('Pricing', {'fields': ('price_per_unit', 'quantity', 'unit', 'is_negotiable')}),
		('Status', {'fields': ('status', 'expires_at', 'views_count')}),
	)


@admin.register(PriceUpdate)
class PriceUpdateAdmin(admin.ModelAdmin):
	list_display = ('commodity', 'grade', 'market', 'price_per_unit', 'unit', 'effective_date', 'is_current')
	list_filter = ('market', 'is_current')
	search_fields = ('commodity', 'grade')
	ordering = ('-effective_date',)
