"""Farm routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActivityViewSet, FarmViewSet, FieldViewSet

router = DefaultRouter()
router.register('farms', FarmViewSet, basename='farm')
router.register('fields', FieldViewSet, basename='field')
router.register('activities', ActivityViewSet, basename='activity')

urlpatterns = [
    path('', include(router.urls)),
]
