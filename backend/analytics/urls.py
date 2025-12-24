"""Analytics routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FarmAnalyticsSummaryView, FarmMetricViewSet

router = DefaultRouter()
router.register('metrics', FarmMetricViewSet, basename='metric')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', FarmAnalyticsSummaryView.as_view(), name='farm-metric-summary'),
]
