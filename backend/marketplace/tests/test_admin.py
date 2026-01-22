from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model

from inventory.models import InventoryItem
from farms.models import Farm
from marketplace.admin import ListingAdminForm


User = get_user_model()


class TestListingAdmin(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.seller = User.objects.create_user(email='seller_test@example.com', password='Password123!')
        self.other = User.objects.create_user(email='other_test@example.com', password='Password123!')
        self.farm = Farm.objects.create(owner=self.seller, name='Seller Farm', location='Farmville', total_area='1.0')
        self.other_farm = Farm.objects.create(owner=self.other, name='Other Farm', location='Elsewhere', total_area='2.0')
        self.other_inventory = InventoryItem.objects.create(
            farm=self.other_farm,
            owner=self.other,
            category=InventoryItem.Category.HARVEST,
            name='Other Item',
            quantity='10.00',
        )
        self.seller_inventory = InventoryItem.objects.create(
            farm=self.farm,
            owner=self.seller,
            category=InventoryItem.Category.HARVEST,
            name='Seller Item',
            quantity='5.00',
        )

    def test_inventory_item_not_owned_is_invalid(self):
        data = {
            'seller': str(self.seller.id),
            'inventory_item': str(self.other_inventory.id),
            'farm': str(self.farm.id),
            'title': 'Test listing',
            'description': 'desc',
            'quantity': '1.00',
            'price_per_unit': '1.00',
            'unit': 'kg',
            'category': 'crops',
            'quality_grade': 'grade_a',
            'status': 'active',
            'expires_at': '2030-01-01 00:00:00',
            'views_count': '0',
        }
        req = self.factory.post('/admin/marketplace/listing/add/')
        req.user = self.seller
        form = ListingAdminForm(data=data, request=req)
        self.assertFalse(form.is_valid())
        self.assertIn('inventory_item', form.errors)

    def test_inventory_item_owned_by_seller_is_valid(self):
        data = {
            'seller': str(self.seller.id),
            'inventory_item': str(self.seller_inventory.id),
            'farm': str(self.farm.id),
            'title': 'Valid listing',
            'description': 'desc',
            'quantity': '1.00',
            'price_per_unit': '1.00',
            'unit': 'kg',
            'category': 'crops',
            'quality_grade': 'grade_a',
            'status': 'active',
            'expires_at': '2030-01-01 00:00:00',
            'views_count': '0',
        }
        req = self.factory.post('/admin/marketplace/listing/add/')
        req.user = self.seller
        form = ListingAdminForm(data=data, request=req)
        self.assertTrue(form.is_valid())
