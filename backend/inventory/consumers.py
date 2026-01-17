"""WebSocket consumers for inventory notifications."""

from __future__ import annotations

import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AlertsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # join the global alerts group
        await self.channel_layer.group_add("alerts", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("alerts", self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # client-to-server messages not expected; ignore
        return

    async def low_stock(self, event):
        # forward the payload to the websocket client
        payload = event.get("payload")
        await self.send(text_data=json.dumps(payload))
