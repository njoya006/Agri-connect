"""Marketplace routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ListingViewSet, PriceUpdateViewSet
from .order_views import OrderViewSet
from .payments import MockPaymentView, PaymentViewSet

router = DefaultRouter()
router.register('listings', ListingViewSet, basename='listing')
router.register('prices', PriceUpdateViewSet, basename='price')
router.register('orders', OrderViewSet, basename='order')
router.register('payments', PaymentViewSet, basename='payment')

urlpatterns = [
    # custom explicit routes should come before the router so they are matched
    path('payments/mock/', MockPaymentView.as_view(), name='mock-payment'),
    path('', include(router.urls)),
]
