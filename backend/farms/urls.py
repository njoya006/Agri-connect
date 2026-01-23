"""Farm routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FarmViewSet

router = DefaultRouter()
router.register('farms', FarmViewSet, basename='farm')

urlpatterns = [
    path('', include(router.urls)),
]
