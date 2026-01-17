"""Inventory routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryItemViewSet,
    InventoryTransactionViewSet,
    LowStockAlertViewSet,
    InventoryReportViewSet,
)

router = DefaultRouter()
router.register('inventory/items', InventoryItemViewSet, basename='inventory-item')
router.register('inventory/transactions', InventoryTransactionViewSet, basename='inventory-transaction')
router.register('inventory/alerts', LowStockAlertViewSet, basename='inventory-alert')
router.register('inventory/reports', InventoryReportViewSet, basename='inventory-report')

urlpatterns = [
    path('', include(router.urls)),
]
