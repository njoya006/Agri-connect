"""Utility helpers for the farms application."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from django.conf import settings
from PIL import Image

_ACTIVITY_MEDIA_SUBDIR = 'farm_activity'


def _activity_media_root() -> Path:
    base = Path(settings.MEDIA_ROOT)
    media_path = base / _ACTIVITY_MEDIA_SUBDIR
    media_path.mkdir(parents=True, exist_ok=True)
    return media_path


def _compress_image(image_file, *, max_size: tuple[int, int] = (1280, 1280), quality: int = 75) -> BytesIO:
    image = Image.open(image_file)
    image = image.convert('RGB')
    image.thumbnail(max_size)
    buffer = BytesIO()
    image.save(buffer, format='JPEG', optimize=True, quality=quality)
    buffer.seek(0)
    image.close()
    return buffer


def store_activity_images(files: Iterable) -> list[str]:
    """Compress and persist uploaded images, returning relative media paths."""

    stored_paths: list[str] = []
    media_root = _activity_media_root()
    for upload in files:
        buffer = _compress_image(upload)
        filename = f"{uuid4().hex}.jpg"
        relative_path = Path(_ACTIVITY_MEDIA_SUBDIR) / filename
        destination = media_root / filename
        with open(destination, 'wb') as output:
            output.write(buffer.getbuffer())
        stored_paths.append(str(relative_path).replace('\\', '/'))
    return stored_paths
