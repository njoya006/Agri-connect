from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from inventory.models import InventoryItem
from marketplace.models import Listing


User = get_user_model()


class OrdersFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # seller/owner
        self.seller = User.objects.create_user(email="seller@example.com", password="pass")
        # buyer
        self.buyer = User.objects.create_user(email="buyer@example.com", password="pass")

        # create a farm for the seller
        from farms.models import Farm
        self.farm = Farm.objects.create(owner=self.seller, name="Demo Farm", location="Testville", total_area=Decimal("1.00"))

        # inventory item owned by seller
        self.inventory = InventoryItem.objects.create(
            farm=self.farm,
            owner=self.seller,
            category="harvest",
            name="Maize",
            quantity=Decimal("100.00"),
            unit="kg",
        )

        # listing linked to inventory
        self.listing = Listing.objects.create(
            farm=self.farm,
            seller=self.seller,
            title="Maize Lot",
            description="Fresh maize",
            quantity=Decimal("100.00"),
            unit="kg",
            price_per_unit=Decimal("200.00"),
            inventory_item=self.inventory,
        )

    def test_create_order_reduces_inventory(self):
        self.client.force_authenticate(user=self.buyer)
        payload = {"items": [{"listing": self.listing.id, "quantity": "5.00"}]}
        resp = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(resp.status_code, 201, resp.content)

        inv = InventoryItem.objects.get(pk=self.inventory.pk)
        self.assertEqual(inv.quantity, Decimal("95.00"))

    def test_create_order_fails_when_insufficient_stock(self):
        self.client.force_authenticate(user=self.buyer)
        payload = {"items": [{"listing": self.listing.id, "quantity": "1000.00"}]}
        resp = self.client.post("/api/orders/", payload, format="json")
        self.assertIn(resp.status_code, (400, 409))
        # inventory should be unchanged
        inv = InventoryItem.objects.get(pk=self.inventory.pk)
        self.assertEqual(inv.quantity, Decimal("100.00"))
