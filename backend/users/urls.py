"""User URL routes."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CurrentUserView, PasswordChangeView, RegistrationView, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

registration_view = RegistrationView.as_view({'post': 'create'})

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', registration_view, name='user-register'),
    path('auth/me/', CurrentUserView.as_view(), name='user-me'),
    path('auth/password-change/', PasswordChangeView.as_view(), name='user-password-change'),
]
