"""
ASGI config for agri_connect project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agri_connect.settings')

# Try to wire Channels ProtocolTypeRouter if available, otherwise fall back to regular ASGI app
try:
	from channels.routing import ProtocolTypeRouter, URLRouter
	from channels.auth import AuthMiddlewareStack
	from .routing import websocket_urlpatterns

	django_asgi_app = get_asgi_application()
	application = ProtocolTypeRouter({
		"http": django_asgi_app,
		"websocket": AuthMiddlewareStack(
			URLRouter(websocket_urlpatterns)
		),
	})
except ImportError:
	# Channels not installed or configuration missing — use default ASGI application
	application = get_asgi_application()
