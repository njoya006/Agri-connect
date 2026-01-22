from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model

from inventory.models import InventoryItem
from marketplace.models import Listing
from farms.models import Farm

User = get_user_model()


class SellerOrdersEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # users
        self.seller1 = User.objects.create_user(email="seller1@example.com", password="pass")
        self.seller2 = User.objects.create_user(email="seller2@example.com", password="pass")
        self.buyer = User.objects.create_user(email="buyer@example.com", password="pass")

        # farms
        self.farm1 = Farm.objects.create(owner=self.seller1, name="Farm1", location="L", total_area=Decimal('1.0'))
        self.farm2 = Farm.objects.create(owner=self.seller2, name="Farm2", location="L", total_area=Decimal('1.0'))

        # inventories
        self.inv1 = InventoryItem.objects.create(farm=self.farm1, owner=self.seller1, category="harvest", name="CropA", quantity=Decimal('20.00'), unit='kg')
        self.inv2 = InventoryItem.objects.create(farm=self.farm2, owner=self.seller2, category="harvest", name="CropB", quantity=Decimal('30.00'), unit='kg')

        # listings
        self.listing1 = Listing.objects.create(farm=self.farm1, seller=self.seller1, title="Lot A", description="A", quantity=Decimal('10.00'), unit='kg', price_per_unit=Decimal('100.00'), inventory_item=self.inv1)
        self.listing2 = Listing.objects.create(farm=self.farm2, seller=self.seller2, title="Lot B", description="B", quantity=Decimal('15.00'), unit='kg', price_per_unit=Decimal('200.00'), inventory_item=self.inv2)

    def test_seller_endpoint_returns_orders_containing_their_listings(self):
        # buyer creates an order containing items from both sellers
        self.client.force_authenticate(user=self.buyer)
        payload = {"items": [{"listing": self.listing1.id, "quantity": "2.00"}, {"listing": self.listing2.id, "quantity": "3.00"}]}
        resp = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)

        # seller1 should see the order via seller endpoint
        self.client.force_authenticate(user=self.seller1)
        r1 = self.client.get('/api/orders/seller/')
        self.assertEqual(r1.status_code, 200)
        data1 = r1.data.get('results', r1.data)
        # the created order should be present
        self.assertTrue(any(o['id'] == resp.data['id'] for o in data1))

        # seller2 should also see the order
        self.client.force_authenticate(user=self.seller2)
        r2 = self.client.get('/api/orders/seller/')
        self.assertEqual(r2.status_code, 200)
        data2 = r2.data.get('results', r2.data)
        self.assertTrue(any(o['id'] == resp.data['id'] for o in data2))

    def test_seller_endpoint_filters_by_status(self):
        # create an order (status = pending)
        self.client.force_authenticate(user=self.buyer)
        payload = {"items": [{"listing": self.listing1.id, "quantity": "1.00"}]}
        resp = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        order_id = resp.data['id']

        # seller requests with status=pending should return the order
        self.client.force_authenticate(user=self.seller1)
        r = self.client.get('/api/orders/seller/?status=pending')
        self.assertEqual(r.status_code, 200)
        data = r.data.get('results', r.data)
        self.assertTrue(any(o['id'] == order_id for o in data))

        # status=completed should not include it
        r2 = self.client.get('/api/orders/seller/?status=completed')
        self.assertEqual(r2.status_code, 200)
        data_comp = r2.data.get('results', r2.data)
        self.assertFalse(any(o['id'] == order_id for o in data_comp))
