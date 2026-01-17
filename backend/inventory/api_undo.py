from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from inventory.models import InventoryTransaction, InventoryItem

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def undo_activity_inventory(request):
    """
    Undo all inventory deductions for a given activity.
    Expects: {"activity_id": int}
    """
    activity_id = request.data.get('activity_id')
    if not activity_id:
        return Response({'error': 'activity_id is required'}, status=400)
    with transaction.atomic():
        txs = InventoryTransaction.objects.filter(related_activity_id=activity_id, transaction_type=InventoryTransaction.TransactionType.USAGE)
        undone = []
        for tx in txs:
            item = tx.item
            item.quantity += abs(tx.quantity_change)
            item.save(update_fields=['quantity', 'updated_at'])
            tx.notes += ' [REVERTED]'
            tx.save(update_fields=['notes'])
            undone.append({'item_id': item.id, 'restored_quantity': abs(tx.quantity_change)})
    return Response({'undone': undone})
