"""User API views."""

from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    PasswordChangeSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
	"""Read/update users. Non-staff users are restricted to their profile."""

	serializer_class = UserSerializer
	permission_classes = [permissions.IsAuthenticated]
	http_method_names = ['get', 'patch', 'put', 'head', 'options']

	def get_queryset(self):
		if self.request.user.is_staff:
			return User.objects.all()
		return User.objects.filter(pk=self.request.user.pk)

	def perform_update(self, serializer):
		# Prevent role escalation for non-staff accounts.
		if not self.request.user.is_staff:
			serializer.save(role=self.request.user.role)
		else:
			serializer.save()


class RegistrationView(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = UserSerializer(user)
        return Response(output.data, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password updated successfully.'})
