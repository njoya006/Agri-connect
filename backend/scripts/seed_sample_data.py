from django.contrib.auth import get_user_model
from farms.models import Farm
from inventory.models import InventoryItem
from marketplace.models import Listing

User = get_user_model()

sellers = [
    ('seller2@example.com', 'Seller Two'),
    ('seller3@example.com', 'Seller Three'),
    ('seller4@example.com', 'Seller Four'),
]

pwd = 'Password123!'
created = []

for email, name in sellers:
    u, created_flag = User.objects.get_or_create(
        email=email, defaults={'first_name': name, 'role': 'farmer'}
    )
    if created_flag or not u.has_usable_password():
        u.set_password(pwd)
    u.is_staff = False
    u.save()

    farm, _ = Farm.objects.get_or_create(
        owner=u, name=f'{name} Farm', defaults={'location': 'Rural', 'total_area': 20}
    )

    item, _ = InventoryItem.objects.get_or_create(
        farm=farm,
        owner=u,
        name=f'{name} Maize',
        defaults={'category': 'harvest', 'quantity': 150, 'unit': 'kg', 'selling_price': 1.0},
    )

    listing, _ = Listing.objects.get_or_create(
        farm=farm,
        seller=u,
        title=f'{name} Maize - Fresh',
        defaults={
            'description': 'Locally grown maize',
            'quantity': 80,
            'unit': 'kg',
            'price_per_unit': 1.2,
            'inventory_item': item,
        },
    )

    created.append((u.email, farm.id, item.id, listing.id))

print('DONE: seeded', len(created), 'sellers')
for row in created:
    print(row)
