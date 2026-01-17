from django.contrib import admin

from .models import InventoryItem, InventoryTransaction, LowStockAlert


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
	list_display = (
		'name',
		'farm',
		'category',
		'quantity',
		'unit',
		'minimum_stock_level',
		'expiry_date',
	)
	search_fields = ('name', 'farm__name', 'owner__email')
	list_filter = ('category', 'farm')


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
	list_display = ('item', 'transaction_type', 'quantity_change', 'performed_by', 'transaction_date')
	search_fields = ('item__name', 'performed_by__email')
	list_filter = ('transaction_type',)
	readonly_fields = ('previous_quantity', 'new_quantity')


@admin.register(LowStockAlert)
class LowStockAlertAdmin(admin.ModelAdmin):
	list_display = ('item', 'current_quantity', 'alerted_at', 'acknowledged', 'resolved')
	search_fields = ('item__name',)
	list_filter = ('acknowledged', 'resolved')
