"""Inventory routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InventoryItemViewSet

router = DefaultRouter()
router.register('inventory', InventoryItemViewSet, basename='inventory-item')

urlpatterns = [
    path('', include(router.urls)),
]
