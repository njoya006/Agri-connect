"""Inventory routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryItemViewSet,
    InventoryTransactionViewSet,
    LowStockAlertViewSet,
    alerts_stream,
    InventoryExportStartView,
    InventoryExportStatusView,
    InventoryExportStreamView,
)

router = DefaultRouter()
router.register('inventory/items', InventoryItemViewSet, basename='inventory-item')
router.register('inventory/transactions', InventoryTransactionViewSet, basename='inventory-transaction')
router.register('inventory/alerts', LowStockAlertViewSet, basename='inventory-alert')


urlpatterns = [
    path('', include(router.urls)),
    path('alerts/stream/', alerts_stream),
    path('inventory/export/start/', InventoryExportStartView.as_view(), name='inventory-export-start'),
    path('inventory/export/status/<str:task_id>/', InventoryExportStatusView.as_view(), name='inventory-export-status'),
    path('inventory/export/stream/', InventoryExportStreamView.as_view(), name='inventory-export-stream'),
]
