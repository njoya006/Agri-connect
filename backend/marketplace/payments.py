from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

import uuid

from .payment_models import Payment
from .orders import Order
from django.conf import settings
from notifications.models import Notification
try:
    # prefer project-level shared task if available
    from tasks import send_order_email
except Exception:
    from .tasks import send_order_email
from rest_framework import viewsets
from rest_framework import permissions as drf_permissions
from rest_framework import serializers


class PaymentSerializer(serializers.ModelSerializer):
    payer_email = serializers.CharField(source='payer.email', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'order_id', 'payer', 'payer_email', 'amount', 'currency', 'transaction_id', 'status', 'created_at']
        read_only_fields = ['id', 'payer_email', 'order_id', 'transaction_id', 'status', 'created_at']


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for Payment records. Staff-only."""
    queryset = Payment.objects.select_related('payer', 'order').all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [drf_permissions.IsAdminUser]


class MockPaymentView(APIView):
    """Mock payment endpoint that persists a Payment record and links to an Order.

    Expected payload: { amount: "100.00", currency: "XAF", order_id: 123 }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data or {}
        amount = data.get("amount")
        order_id = data.get("order_id")
        currency = data.get("currency", "XAF")
        if not amount or not order_id:
            return Response({"detail": "Missing amount or order_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        # create payment record
        payment = Payment.objects.create(order=order, payer=request.user, amount=Decimal(str(amount)), currency=currency)

        # Simulate external success
        tx_id = f"mock_{uuid.uuid4().hex}"
        payment.mark_success(tx_id)

        # Mark order as completed
        order.status = Order.Status.COMPLETED
        order.save(update_fields=['status', 'updated_at'])

        # create notifications for buyer and involved sellers
        try:
            Notification.objects.create(
                recipient=order.buyer,
                title=f"Payment received for Order #{order.id}",
                message=f"Payment of {payment.amount} {payment.currency} received. Transaction: {tx_id}",
                category='marketplace',
                metadata={'order_id': order.id, 'payment_id': payment.pk},
            )
        except Exception:
            pass

        # notify sellers and send emails
        seller_emails = set()
        for it in order.items.select_related('listing__seller').all():
            seller = it.listing.seller
            if seller:
                try:
                    Notification.objects.create(
                        recipient=seller,
                        title=f"Order #{order.id} paid",
                        message=f"An order including your listing '{it.listing.title}' was paid (qty {it.quantity}).",
                        category='marketplace',
                        metadata={'order_id': order.id, 'listing_id': it.listing.id, 'payment_id': payment.pk},
                    )
                except Exception:
                    pass
                if seller.email:
                    seller_emails.add(seller.email)

        # enqueue templated emails via Celery task: one for buyer, one per seller
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@example.com')

            # build a full item list for the buyer
            items = []
            for it in order.items.select_related('listing__seller').all():
                items.append({
                    'listing_id': it.listing.id,
                    'title': it.listing.title,
                    'quantity': str(it.quantity),
                    'price_per_unit': str(it.price_per_unit),
                    'subtotal': str(it.subtotal),
                    'seller_id': getattr(it.listing.seller, 'id', None),
                    'seller_email': getattr(it.listing.seller, 'email', None),
                })

            buyer_context = {
                'order_id': order.id,
                'transaction_id': tx_id,
                'total': str(payment.amount),
                'buyer_name': getattr(order.buyer, 'first_name', '') or order.buyer.email,
                'items': items,
            }
            send_order_email.delay(subject=f"Payment received for Order #{order.id}", template_name='emails/order_payment_buyer.html', context=buyer_context, from_email=from_email, to_emails=[order.buyer.email])

            # group items per seller and enqueue seller-specific emails
            per_seller = {}
            for it in items:
                sid = it.get('seller_id')
                if not sid:
                    continue
                per_seller.setdefault(sid, []).append(it)

            for sid, its in per_seller.items():
                # find seller email/name from items
                seller_email = its[0].get('seller_email')
                if not seller_email:
                    continue
                seller_name = ''
                seller_context = {
                    'order_id': order.id,
                    'transaction_id': tx_id,
                    'items': its,
                    'seller_name': seller_name,
                    'buyer_email': getattr(order.buyer, 'email', None),
                }
                send_order_email.delay(subject=f"Order #{order.id} paid", template_name='emails/order_payment_seller.html', context=seller_context, from_email=from_email, to_emails=[seller_email])
        except Exception:
            pass

        return Response({"status": "success", "transaction_id": tx_id, "payment_id": payment.pk}, status=status.HTTP_200_OK)
