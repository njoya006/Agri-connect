from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from .models import Listing, PriceUpdate
from inventory.models import InventoryItem
from .payment_models import Payment

class ListingAdminForm(forms.ModelForm):
	class Meta:
		model = Listing
		fields = '__all__'

	def __init__(self, *args, request=None, **kwargs):
		self.request = request
		super().__init__(*args, **kwargs)
		# Prefer filtering inventory items by the selected seller when possible
		seller_id = None
		if self.data.get('seller'):
			seller_id = self.data.get('seller')
		elif self.instance and getattr(self.instance, 'seller', None):
			seller_id = getattr(self.instance.seller, 'id', None)
		if seller_id:
			self.fields['inventory_item'].queryset = InventoryItem.objects.filter(owner_id=seller_id)
		elif self.request and not self.request.user.is_superuser:
			self.fields['inventory_item'].queryset = InventoryItem.objects.filter(owner=self.request.user)

	def clean(self):
		cleaned = super().clean()
		inventory = cleaned.get('inventory_item')
		seller = cleaned.get('seller')
		if inventory and seller and getattr(inventory, 'owner', None) != seller:
			raise ValidationError('Inventory item must belong to the selected seller.')
		return cleaned


def _make_form_with_request(FormClass, request):
	class AdminForm(FormClass):
		def __init__(self, *args, **kwargs):
			kwargs['request'] = request
			super().__init__(*args, **kwargs)

	return AdminForm


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

	def formfield_for_foreignkey(self, db_field, request, **kwargs):
		if db_field.name == "inventory_item":
			if request.user.is_superuser:
				return super().formfield_for_foreignkey(db_field, request, **kwargs)
			# Only show inventory items owned by the current user
			kwargs["queryset"] = db_field.related_model.objects.filter(owner=request.user)
		return super().formfield_for_foreignkey(db_field, request, **kwargs)

	def get_form(self, request, obj=None, **kwargs):
		# Attach request to the form so it can filter inventory options
		Form = super().get_form(request, obj, **kwargs)
		return _make_form_with_request(Form, request)

	def save_model(self, request, obj, form, change):
		# Prefer inventory ownership when available to keep listing ownership
		# consistent. Fall back to the request user for new objects.
		if getattr(obj, 'inventory_item', None):
			obj.seller = obj.inventory_item.owner
		elif not change and not request.user.is_staff:
			obj.seller = request.user
		# ensure seller is set for updates if still missing
		if not getattr(obj, 'seller', None):
			obj.seller = request.user
		super().save_model(request, obj, form, change)


@admin.register(PriceUpdate)
class PriceUpdateAdmin(admin.ModelAdmin):
		list_display = ('commodity', 'grade', 'market', 'price_per_unit', 'unit', 'effective_date', 'is_current')
		list_filter = ('market', 'is_current')
		search_fields = ('commodity', 'grade')
		ordering = ('-effective_date',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
	list_display = ('id', 'order', 'payer', 'amount', 'currency', 'status', 'created_at')
	list_filter = ('status', 'currency')
	search_fields = ('transaction_id', 'payer__email')
	readonly_fields = ('transaction_id', 'created_at', 'updated_at')
