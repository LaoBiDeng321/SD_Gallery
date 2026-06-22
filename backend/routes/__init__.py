"""Backend routes package for SD Gallery."""

from .images import register_image_routes
from .trash import register_trash_routes
from .nsfw import register_nsfw_routes
from .lora import register_lora_routes

__all__ = ['register_image_routes', 'register_trash_routes', 'register_nsfw_routes', 'register_lora_routes']