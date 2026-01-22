from decimal import Decimal

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .orders import Order, OrderItem
from marketplace.models import Listing
from inventory.models import InventoryItem, InventoryTransaction
from notifications.models import Notification

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'listing', 'quantity', 'price_per_unit', 'subtotal']
        read_only_fields = ['id', 'subtotal', 'price_per_unit']

    def create(self, validated_data):
        listing = validated_data['listing']
        validated_data['price_per_unit'] = listing.price_per_unit
        validated_data['subtotal'] = validated_data['quantity'] * listing.price_per_unit
        return super().create(validated_data)

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    class Meta:
        model = Order
        fields = ['id', 'buyer', 'status', 'total_price', 'created_at', 'updated_at', 'items']
        read_only_fields = ['id', 'buyer', 'status', 'total_price', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        if request is None:
            raise ValidationError('Request context is required to create an order.')

        total = Decimal('0')
        with transaction.atomic():
            order = Order.objects.create(buyer=request.user)
            for item_data in items_data:
                listing = item_data.get('listing')
                quantity = item_data.get('quantity')
                if listing is None:
                    raise ValidationError('Listing is required for order items.')

                inventory_item = listing.inventory_item
                if inventory_item is None:
                    raise ValidationError(f'Listing "{listing.title}" is not linked to an inventory item.')

                # Lock the inventory row and validate stock
                inv = InventoryItem.objects.select_for_update().get(pk=inventory_item.pk)
                if inv.quantity < quantity:
                    raise ValidationError(f'Not enough stock for "{listing.title}" (requested {quantity}, available {inv.quantity}).')

                previous_qty = inv.quantity
                inv.quantity = inv.quantity - quantity
                inv.save(update_fields=['quantity'])

                InventoryTransaction.objects.create(
                    item=inv,
                    transaction_type=InventoryTransaction.TransactionType.SALE,
                    quantity_change=-quantity,
                    previous_quantity=previous_qty,
                    new_quantity=inv.quantity,
                    related_listing=listing,
                    performed_by=request.user,
                )

                item_data['order'] = order
                item_data['price_per_unit'] = listing.price_per_unit
                item_data['subtotal'] = listing.price_per_unit * quantity
                item = OrderItemSerializer().create(item_data)
                total += Decimal(item.subtotal)

            order.total_price = total
            order.save()

            # create notifications: buyer and sellers
            Notification.objects.create(
                recipient=request.user,
                title=f"Order #{order.id} placed",
                message=f"Your order #{order.id} has been placed. Total: {order.total_price}",
                category='marketplace',
                metadata={'order_id': order.id},
            )

            # notify sellers for each item
            seller_ids = set()
            for item in order.items.select_related('listing__seller').all():
                seller = item.listing.seller
                if seller and seller.id not in seller_ids:
                    seller_ids.add(seller.id)
                    Notification.objects.create(
                        recipient=seller,
                        title=f"New order #{order.id}",
                        message=f"An order including your listing '{item.listing.title}' was placed (qty {item.quantity}).",
                        category='marketplace',
                        metadata={'order_id': order.id, 'listing_id': item.listing.id},
                    )

        return order
