"""NSFW keyword management service for SD Gallery."""

import json
from pathlib import Path

from ..utils.logger import get_logger

logger = get_logger('sd-gallery.nsfw-service')


class NSFWService:
    """Service for managing NSFW keywords."""

    def __init__(self, keywords_file):
        self.keywords_file = keywords_file

    def load_keywords(self):
        """Load NSFW keywords from file.

        Returns:
            list: List of keywords
        """
        if self.keywords_file.exists():
            try:
                with open(self.keywords_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('keywords', [])
            except Exception as e:
                logger.error(f"Error loading keywords: {e}")
        return []

    def save_keywords(self, keywords):
        """Save NSFW keywords to file.

        Args:
            keywords: List of keywords to save

        Returns:
            bool: True if successful
        """
        try:
            with open(self.keywords_file, 'w', encoding='utf-8') as f:
                json.dump({'keywords': keywords}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving keywords: {e}")
            return False

    def add_keywords(self, new_keywords):
        """Add keywords to existing list.

        Args:
            new_keywords: List of keywords to add

        Returns:
            tuple: (updated_keywords, added_keywords)
        """
        existing = self.load_keywords()
        existing_set = set(existing)

        added = []
        for kw in new_keywords:
            if isinstance(kw, str):
                clean_kw = kw.lower().strip()
                if clean_kw and clean_kw not in existing_set:
                    existing.append(clean_kw)
                    existing_set.add(clean_kw)
                    added.append(clean_kw)

        self.save_keywords(existing)
        return existing, added

    def remove_keywords(self, to_remove):
        """Remove keywords from list.

        Args:
            to_remove: List of keywords to remove

        Returns:
            tuple: (updated_keywords, removed_keywords)
        """
        existing = self.load_keywords()

        remove_set = set()
        for kw in to_remove:
            if isinstance(kw, str):
                remove_set.add(kw.lower().strip())

        new_keywords = [kw for kw in existing if kw not in remove_set]
        removed = [kw for kw in existing if kw in remove_set]

        self.save_keywords(new_keywords)
        return new_keywords, removed

    def check_prompt(self, prompt, keywords):
        """Check if prompt contains any NSFW keywords.

        Args:
            prompt: Prompt text to check
            keywords: List of keywords to check against

        Returns:
            bool: True if prompt contains NSFW keywords
        """
        if not prompt or len(keywords) == 0:
            return False

        lower = prompt.lower()
        return any(kw in lower for kw in keywords)