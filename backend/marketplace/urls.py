"""Marketplace routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ListingViewSet, PriceUpdateViewSet

router = DefaultRouter()
router.register('listings', ListingViewSet, basename='listing')
router.register('prices', PriceUpdateViewSet, basename='price')

urlpatterns = [
    path('', include(router.urls)),
]
