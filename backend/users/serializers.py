"""Serializers for user management."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'role',
            'is_active',
            'date_joined',
        )
        read_only_fields = ('id', 'is_active', 'date_joined', 'email')


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'password',
            'confirm_password',
            'first_name',
            'last_name',
            'phone_number',
            'role',
        )
        read_only_fields = ('id',)

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.pop('confirm_password', None)
        if password != confirm_password:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        validate_password(password)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        old_password = self.validated_data['old_password']
        if not user.check_password(old_password):
            raise serializers.ValidationError({'old_password': 'Current password is incorrect.'})
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user
