from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from users.models import CustomUser as User
from inventory.models import InventoryItem
from marketplace.models import Listing
from farms.models import Farm


class ListingSellerAssignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(email="seller@example.com", password="pass")
        self.other = User.objects.create_user(email="other@example.com", password="pass")

        self.farm = Farm.objects.create(owner=self.seller, name="Seller Farm", location="Here", total_area=Decimal('1.0'))

        self.inventory = InventoryItem.objects.create(
            farm=self.farm,
            owner=self.seller,
            category="harvest",
            name="Cassava",
            quantity=Decimal('50.00'),
            unit="kg",
        )

    def test_create_listing_assigns_seller_from_inventory(self):
        # owner can create listing and seller should be assigned from inventory owner
        self.client.force_authenticate(user=self.seller)
        payload = {
            "farm": self.farm.id,
            "inventory_item": self.inventory.id,
            "title": "Cassava lot",
            "description": "Good cassava",
            "quantity": "10.00",
            "unit": "kg",
            "price_per_unit": "100.00",
            "location": "Testville",
        }
        resp = self.client.post('/api/listings/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        created = Listing.objects.get(pk=resp.data['id'])
        self.assertEqual(created.seller_id, self.seller.id)

        # non-owner should be rejected when referencing someone else's inventory
        self.client.force_authenticate(user=self.other)
        resp2 = self.client.post('/api/listings/', payload, format='json')
        self.assertEqual(resp2.status_code, 400)

    def test_update_listing_changes_seller_when_inventory_changed(self):
        # create initial listing authored by seller
        listing = Listing.objects.create(
            farm=self.farm,
            seller=self.seller,
            title="Init",
            description="Init",
            quantity=Decimal('5.00'),
            unit='kg',
            price_per_unit=Decimal('50.00'),
            inventory_item=self.inventory,
        )

        # create another inventory owned by other user
        other_farm = Farm.objects.create(owner=self.other, name="Other Farm", location="X", total_area=Decimal('1.0'))
        other_inventory = InventoryItem.objects.create(
            farm=other_farm,
            owner=self.other,
            category="harvest",
            name="OtherCrop",
            quantity=Decimal('20.00'),
            unit="kg",
        )

        self.client.force_authenticate(user=self.seller)
        resp = self.client.patch(f'/api/listings/{listing.id}/', {"inventory_item": other_inventory.id}, format='json')
        # change should be rejected due to ownership mismatch (validation)
        self.assertIn(resp.status_code, (400, 403))