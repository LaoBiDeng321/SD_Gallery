"""LoRA name mapping management service for SD Gallery."""

import json
from pathlib import Path

from ..utils.logger import get_logger

logger = get_logger('sd-gallery.lora-service')


class LoraService:
    """Service for managing LoRA name mappings (raw_name -> display_name)."""

    def __init__(self, mappings_file):
        self.mappings_file = mappings_file

    def load_mappings(self):
        """Load LoRA mappings from file.

        Returns:
            dict: {raw_name: display_name} mappings
        """
        if self.mappings_file.exists():
            try:
                with open(self.mappings_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('mappings', {})
            except Exception as e:
                logger.error(f"Error loading LoRA mappings: {e}")
        return {}

    def save_mappings(self, mappings):
        """Save LoRA mappings to file.

        Args:
            mappings: dict of {raw_name: display_name}

        Returns:
            bool: True if successful
        """
        try:
            with open(self.mappings_file, 'w', encoding='utf-8') as f:
                json.dump({'mappings': mappings}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving LoRA mappings: {e}")
            return False

    def add_mapping(self, raw_name, display_name):
        """Add or update a single LoRA mapping.

        Args:
            raw_name: Original LoRA name
            display_name: Display name to map to

        Returns:
            tuple: (updated_mappings_dict, was_added_bool)
        """
        mappings = self.load_mappings()
        existed = raw_name in mappings
        mappings[raw_name] = display_name
        self.save_mappings(mappings)
        return mappings, not existed

    def remove_mapping(self, raw_name):
        """Remove a single LoRA mapping.

        Args:
            raw_name: Original LoRA name to remove mapping for

        Returns:
            tuple: (updated_mappings_dict, was_removed_bool)
        """
        mappings = self.load_mappings()
        if raw_name in mappings:
            del mappings[raw_name]
            self.save_mappings(mappings)
            return mappings, True
        return mappings, False
