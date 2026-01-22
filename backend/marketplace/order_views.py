from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.db.models import Sum

from .orders import Order
from .order_serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.select_related('buyer').prefetch_related('items__listing')
        if self.request.user.is_staff:
            return qs
        return qs.filter(buyer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    @action(detail=False, methods=['get'], url_path='seller')
    def seller(self, request):
        """Return orders containing items sold by the requesting seller.

        Supports optional query params: `date_from`, `date_to` (ISO date strings),
        `status`, and standard DRF page query param `page`.
        """
        qs = Order.objects.select_related('buyer').prefetch_related('items__listing')

        # Non-staff sellers only see orders that include their listings
        if not request.user.is_staff:
            qs = qs.filter(items__listing__seller=request.user).distinct()

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        status_q = request.query_params.get('status')

        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
        if status_q:
            qs = qs.filter(status=status_q)

        qs = qs.order_by('-created_at')

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='seller/summary')
    def seller_summary(self, request):
        """Return a per-listing sales summary for the requesting seller.

        Aggregates completed orders by default. Supports `date_from`/`date_to` filters.
        """
        qs = Order.objects.prefetch_related('items__listing')

        # restrict to orders that include this seller's listings
        if not request.user.is_staff:
            qs = qs.filter(items__listing__seller=request.user)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        # consider only completed orders for sales numbers
        qs = qs.filter(status=Order.Status.COMPLETED)

        # aggregate totals per listing
        agg = (
            qs.values('items__listing', 'items__listing__title')
            .annotate(total_quantity=Sum('items__quantity'), total_sales=Sum('items__subtotal'))
            .order_by('-total_sales')
        )

        # normalize keys for response
        data = [
            {
                'listing_id': a['items__listing'],
                'title': a.get('items__listing__title'),
                'total_quantity': a['total_quantity'],
                'total_sales': a['total_sales'],
            }
            for a in agg
        ]

        return Response({'summary': data}, status=status.HTTP_200_OK)
