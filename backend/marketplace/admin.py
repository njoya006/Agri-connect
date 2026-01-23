from django.contrib import admin

from .models import Listing


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
	list_display = ('title', 'seller', 'unit_price', 'quantity_available', 'status')
	list_filter = ('status',)
	search_fields = ('title', 'seller__email')
