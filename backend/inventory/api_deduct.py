from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from .models import InventoryItem

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deduct_inventory_for_activity(request):
    """
    Deducts inventory quantities for a logged activity.
    Expects: {"items": [{"item_id": int, "quantity": float}]}
    """
    items = request.data.get('items', [])
    errors = []
    updated = []
    with transaction.atomic():
        for entry in items:
            try:
                item = InventoryItem.objects.select_for_update().get(id=entry['item_id'], owner=request.user)
                qty = float(entry['quantity'])
                if item.quantity < qty:
                    errors.append({'item_id': item.id, 'error': 'Insufficient stock'})
                    continue
                item.quantity -= qty
                item.save()
                updated.append({'item_id': item.id, 'new_quantity': item.quantity})
            except InventoryItem.DoesNotExist:
                errors.append({'item_id': entry['item_id'], 'error': 'Item not found'})
    return Response({'updated': updated, 'errors': errors})
