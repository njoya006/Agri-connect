"""Celery application for AgriConnect."""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agri_connect.settings')

app = Celery('agri_connect')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
