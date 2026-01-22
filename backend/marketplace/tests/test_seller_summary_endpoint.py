from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model

from inventory.models import InventoryItem
from marketplace.models import Listing
from farms.models import Farm
from marketplace.payment_models import Payment
from marketplace.orders import Order

User = get_user_model()


class SellerSummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.seller = User.objects.create_user(email='seller@example.com', password='pass')
        self.buyer = User.objects.create_user(email='buyer@example.com', password='pass')

        self.farm = Farm.objects.create(owner=self.seller, name='F', location='L', total_area=Decimal('1.0'))
        self.inv = InventoryItem.objects.create(farm=self.farm, owner=self.seller, category='harvest', name='C', quantity=Decimal('50.00'), unit='kg')
        self.listing = Listing.objects.create(farm=self.farm, seller=self.seller, title='Lot', description='D', quantity=Decimal('10.00'), unit='kg', price_per_unit=Decimal('100.00'), inventory_item=self.inv)

    def test_summary_aggregates_completed_orders(self):
        # create two orders containing the listing and mark them completed
        self.client.force_authenticate(user=self.buyer)
        payload1 = {"items": [{"listing": self.listing.id, "quantity": "2.00"}]}
        r1 = self.client.post('/api/orders/', payload1, format='json')
        self.assertEqual(r1.status_code, 201)
        order1 = Order.objects.get(pk=r1.data['id'])
        order1.status = Order.Status.COMPLETED
        order1.save()

        payload2 = {"items": [{"listing": self.listing.id, "quantity": "3.00"}]}
        r2 = self.client.post('/api/orders/', payload2, format='json')
        self.assertEqual(r2.status_code, 201)
        order2 = Order.objects.get(pk=r2.data['id'])
        order2.status = Order.Status.COMPLETED
        order2.save()

        # create payment records for completeness
        Payment.objects.create(order=order1, payer=self.buyer, amount=Decimal('200.00'))
        Payment.objects.create(order=order2, payer=self.buyer, amount=Decimal('300.00'))

        # seller requests summary
        self.client.force_authenticate(user=self.seller)
        resp = self.client.get('/api/orders/seller/summary/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('summary', [])
        self.assertTrue(len(data) >= 1)
        entry = data[0]
        self.assertEqual(int(entry['listing_id']), self.listing.id)
        self.assertEqual(Decimal(str(entry['total_quantity'])), Decimal('5.00'))
        self.assertEqual(Decimal(str(entry['total_sales'])), Decimal('500.00'))
