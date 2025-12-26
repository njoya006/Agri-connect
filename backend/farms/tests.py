"""Farm domain tests."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from io import BytesIO
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Activity, Farm, Field


class FarmAPITestCase(APITestCase):
	"""Integration tests covering farm, field, and activity workflows."""

	def setUp(self):
		self.temp_media = tempfile.mkdtemp()
		self.addCleanup(lambda: shutil.rmtree(self.temp_media, ignore_errors=True))
		self.override = override_settings(MEDIA_ROOT=self.temp_media)
		self.override.enable()
		self.addCleanup(self.override.disable)
		self.user = get_user_model().objects.create_user(
			email='farmer@example.com',
			password='Testpass123!',
			first_name='Test',
			last_name='Farmer',
		)
		self.client.force_authenticate(self.user)
		self.farm = Farm.objects.create(
			owner=self.user,
			name='Alpha Farm',
			location='Valley',
			total_area=Decimal('42.50'),
			soil_type=Farm.SoilType.LOAM,
			irrigation_type=Farm.IrrigationType.DRIP,
		)
		self.field = Field.objects.create(
			farm=self.farm,
			field_name='Field 1',
			field_number=1,
			area=Decimal('10.00'),
		)

	def _create_image(self) -> SimpleUploadedFile:
		image = Image.new('RGB', (10, 10), color='white')
		buffer = BytesIO()
		image.save(buffer, format='JPEG')
		buffer.seek(0)
		return SimpleUploadedFile('test.jpg', buffer.read(), content_type='image/jpeg')

	def test_nested_field_creation(self):
		url = reverse('farm-fields', args=[self.farm.id])
		payload = {
			'field_name': 'Field 2',
			'field_number': 2,
			'area': '12.00',
			'notes': 'Test expansion',
		}
		response = self.client.post(url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
		self.assertEqual(self.farm.fields.count(), 2)

	def test_stats_endpoint_returns_expected_payload(self):
		Activity.objects.create(
			field=self.field,
			activity_type=Activity.ActivityType.HARVESTING,
			date=date.today(),
			quantity=Decimal('15.50'),
			performed_by=self.user,
		)
		url = reverse('farm-stats', args=[self.farm.id])
		response = self.client.get(url)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(Decimal(str(response.data['total_yield'])), Decimal('15.50'))
		self.assertEqual(response.data['field_count'], 1)

	def test_activity_updates_field_metadata(self):
		url = reverse('field-activities', args=[self.field.id])
		payload = {
			'activity_type': Activity.ActivityType.PLANTING,
			'date': date.today().isoformat(),
			'description': 'Maize',
			'quantity': '0',
			'unit': 'kg',
			'cost': '0',
		}
		response = self.client.post(url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
		self.field.refresh_from_db()
		self.assertEqual(self.field.current_crop, 'Maize')
		self.assertEqual(len(self.field.crop_history), 1)

	def test_activity_image_upload_persists_media_path(self):
		url = reverse('activity-list')
		payload = {
			'field': self.field.id,
			'activity_type': Activity.ActivityType.IRRIGATION,
			'date': date.today().isoformat(),
			'quantity': '0',
			'unit': 'L',
			'cost': '0',
			'upload_images': [self._create_image()],
		}
		response = self.client.post(url, payload, format='multipart')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
		activity = Activity.objects.get(id=response.data['id'])
		self.assertGreater(len(activity.images), 0)

	def test_farm_export_returns_csv(self):
		Activity.objects.create(
			field=self.field,
			activity_type=Activity.ActivityType.WEEDING,
			date=date.today(),
			performed_by=self.user,
		)
		url = reverse('farm-export', args=[self.farm.id])
		response = self.client.get(url)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response['Content-Type'], 'text/csv')
		self.assertIn('Field Name', response.content.decode('utf-8'))

	def test_user_cannot_access_foreign_farm(self):
		other = get_user_model().objects.create_user(email='other@example.com', password='Testpass123!')
		foreign_farm = Farm.objects.create(
			owner=other,
			name='Foreign',
			location='Remote',
			total_area=Decimal('5.00'),
			soil_type=Farm.SoilType.CLAY,
		)
		url = reverse('farm-detail', args=[foreign_farm.id])
		response = self.client.get(url)
		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
