from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from inventory.models import InventoryTransaction

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_inventory_audit(request, activity_id):
    """
    Return all inventory transactions linked to a given activity.
    """
    txs = InventoryTransaction.objects.filter(related_activity_id=activity_id)
    data = [
        {
            'id': tx.id,
            'item': tx.item.name,
            'transaction_type': tx.transaction_type,
            'quantity_change': float(tx.quantity_change),
            'previous_quantity': float(tx.previous_quantity),
            'new_quantity': float(tx.new_quantity),
            'notes': tx.notes,
            'transaction_date': tx.transaction_date,
        }
        for tx in txs
    ]
    return Response(data)
