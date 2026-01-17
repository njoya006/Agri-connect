from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import InventoryItem
from .serializers import InventoryItemSerializer

# Map activity types to inventory categories
ACTIVITY_CATEGORY_MAP = {
    'planting': ['seeds', 'fertilizers'],
    'harvesting': ['equipment', 'harvest'],
    # Add more mappings as needed
}

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suggest_inventory_items(request):
    activity_type = request.GET.get('activity_type')
    categories = ACTIVITY_CATEGORY_MAP.get(activity_type, [])
    items = InventoryItem.objects.filter(category__in=categories, quantity__gt=0, owner=request.user)
    serializer = InventoryItemSerializer(items, many=True)
    data = serializer.data
    # Fallback: if no items, suggest option to add new
    if not data:
        data.append({'id': None, 'name': 'Add new item', 'quantity': 0, 'unit': ''})
    return Response(data)
