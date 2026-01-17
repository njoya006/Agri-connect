from django.urls import re_path

from channels.routing import ProtocolTypeRouter, URLRouter

from inventory.consumers import AlertsConsumer

websocket_urlpatterns = [
    re_path(r"ws/alerts/?$", AlertsConsumer.as_asgi()),
]
