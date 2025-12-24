"""User models for AgriConnect."""

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
	"""Custom manager that uses email for authentication."""

	def create_user(self, email: str, password: str | None = None, **extra_fields):
		if not email:
			raise ValueError('An email address must be provided.')
		if not password:
			raise ValueError('A password must be provided.')

		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, email: str, password: str | None = None, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		extra_fields.setdefault('is_active', True)

		if extra_fields.get('is_staff') is not True:
			raise ValueError('Superuser must have is_staff=True.')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('Superuser must have is_superuser=True.')

		return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
	"""User model with email login and role support."""

	class Roles(models.TextChoices):
		FARMER = 'farmer', 'Farmer'
		BUYER = 'buyer', 'Buyer'
		ANALYST = 'analyst', 'Analyst'
		ADMIN = 'admin', 'Platform Admin'

	email = models.EmailField(unique=True)
	first_name = models.CharField(max_length=150, blank=True)
	last_name = models.CharField(max_length=150, blank=True)
	phone_regex = RegexValidator(r'^\+?[0-9]{7,15}$', 'Enter a valid international phone number.')
	phone_number = models.CharField(max_length=20, blank=True, validators=[phone_regex])
	role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.FARMER)

	is_staff = models.BooleanField(default=False)
	is_active = models.BooleanField(default=True)
	date_joined = models.DateTimeField(default=timezone.now)
	updated_at = models.DateTimeField(auto_now=True)

	objects = CustomUserManager()

	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS: list[str] = []

	class Meta:
		ordering = ['-date_joined']

	def __str__(self) -> str:
		return self.email

	@property
	def full_name(self) -> str:
		return f"{self.first_name} {self.last_name}".strip()

# Create your models here.
