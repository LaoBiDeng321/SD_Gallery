"""Trash management service for SD Gallery."""

import json
import shutil
from datetime import datetime
from pathlib import Path

from ..utils.logger import get_logger

logger = get_logger('sd-gallery.trash-service')


class TrashService:
    """Service for handling trash operations."""

    def __init__(self, trash_dir, outputs_dir, manifest_file):
        self.trash_dir = trash_dir
        self.outputs_dir = outputs_dir
        self.manifest_file = manifest_file

    def ensure_trash_dir(self):
        """Ensure trash directory exists."""
        self.trash_dir.mkdir(parents=True, exist_ok=True)

    def load_manifest(self):
        """Load trash manifest.

        Returns:
            list: List of manifest entries
        """
        if self.manifest_file.exists():
            with open(self.manifest_file, 'r') as f:
                return json.load(f)
        return []

    def save_manifest(self, manifest):
        """Save trash manifest.

        Args:
            manifest: List of manifest entries
        """
        with open(self.manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)

    def move_to_trash(self, image_path):
        """Move file to trash directory.

        Args:
            image_path: Path to file to move

        Returns:
            bool: True if successful
        """
        self.ensure_trash_dir()

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_name = f"{image_path.stem}_{timestamp}{image_path.suffix}"
        dest = self.trash_dir / new_name

        try:
            shutil.move(str(image_path), str(dest))

            manifest = self.load_manifest()
            manifest.append({
                'original_path': str(image_path.relative_to(self.outputs_dir).as_posix()),
                'trash_name': new_name,
                'timestamp': timestamp
            })
            self.save_manifest(manifest)

            return True
        except Exception as e:
            logger.error(f"Error moving to trash: {e}")
            return False

    def restore_from_trash(self, trash_name):
        """Restore file from trash to original location.

        Args:
            trash_name: Name of file in trash

        Returns:
            bool: True if successful
        """
        manifest = self.load_manifest()

        for entry in manifest:
            if entry['trash_name'] == trash_name:
                src = self.trash_dir / trash_name
                dest = self.outputs_dir / entry['original_path']

                if not src.exists():
                    return False

                try:
                    shutil.move(str(src), str(dest))
                    manifest.remove(entry)
                    self.save_manifest(manifest)
                    return True
                except Exception as e:
                    logger.error(f"Error restoring from trash: {e}")
                    return False

        return False

    def delete_from_trash(self, trash_name):
        """Permanently delete file from trash.

        Args:
            trash_name: Name of file in trash

        Returns:
            bool: True if successful
        """
        manifest = self.load_manifest()

        # Remove from manifest
        updated = [e for e in manifest if e['trash_name'] != trash_name]

        if len(updated) == len(manifest):
            return False

        # Delete file
        trash_file = self.trash_dir / trash_name
        if trash_file.exists():
            try:
                trash_file.unlink()
            except Exception as e:
                logger.error(f"Error deleting trash file: {e}")
                return False

        self.save_manifest(updated)
        return True

    def empty_trash(self):
        """Empty trash directory completely."""
        try:
            if self.trash_dir.exists():
                shutil.rmtree(str(self.trash_dir))
            self.ensure_trash_dir()
            self.save_manifest([])
        except Exception as e:
            logger.error(f"Error emptying trash: {e}")

    def list_trash(self):
        """List all items in trash.

        Returns:
            list: List of trash items with metadata
        """
        manifest = self.load_manifest()

        for entry in manifest:
            trash_file = self.trash_dir / entry['trash_name']
            entry['exists'] = trash_file.exists()

        return manifest

    def get_trash_count(self):
        """Get count of items in trash.

        Returns:
            int: Number of items in trash
        """
        manifest = self.load_manifest()
        return sum(1 for e in manifest if (self.trash_dir / e['trash_name']).exists())