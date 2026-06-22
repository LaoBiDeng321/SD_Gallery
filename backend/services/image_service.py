"""Image processing service for SD Gallery."""

import os
import base64
import hashlib
from datetime import datetime
from pathlib import Path
from PIL import Image

from ..utils.metadata import extract_metadata
from ..utils.path import get_image_type
from ..utils.logger import get_logger

logger = get_logger('sd-gallery.image-service')


class ImageService:
    """Service for handling image operations."""

    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
    MAX_FILE_SIZE = 50 * 1024 * 1024
    THUMB_SIZE = (400, 400)
    THUMB_QUALITY = 85

    def __init__(self, outputs_dir, thumbs_dir):
        self.outputs_dir = outputs_dir
        self.thumbs_dir = thumbs_dir

    def scan_images(self, cache):
        """Scan all images in outputs directory.

        Args:
            cache: ImageCache instance

        Returns:
            list: List of image info dictionaries
        """
        if not self.outputs_dir.exists():
            cache.set([])
            return []

        # Get directory modification time
        dir_mtime = self._get_directory_mtime()

        if not cache.is_dirty() and cache.get_mtime() == dir_mtime:
            return cache.get('images')

        images = []

        for type_dir in self.outputs_dir.iterdir():
            if not type_dir.is_dir():
                continue
            if type_dir.name == '.trash':
                continue

            image_type = get_image_type(type_dir.name)

            for image_file in type_dir.rglob('*'):
                if not image_file.is_file():
                    continue

                if image_file.suffix.lower() not in self.ALLOWED_EXTENSIONS:
                    continue

                try:
                    image_info = self._build_image_info(image_file, image_type)
                    if image_info:
                        images.append(image_info)
                except Exception as e:
                    logger.error(f"Error processing {image_file}: {e}")
                    continue

        images.sort(key=lambda x: x['created_at'], reverse=True)

        cache.set(images, mtime=dir_mtime)
        return images

    def _build_image_info(self, image_path, image_type):
        """Build image info dictionary from file path.

        Args:
            image_path: Path to image file
            image_type: Type of image (txt2img, img2img, etc.)

        Returns:
            dict: Image info dictionary
        """
        stat = image_path.stat()
        created_time = datetime.fromtimestamp(stat.st_mtime)

        metadata = extract_metadata(str(image_path))

        dimensions = {'width': 0, 'height': 0}
        if metadata['size']:
            try:
                w, h = metadata['size'].split('x')
                dimensions = {'width': int(w), 'height': int(h)}
            except:
                pass

        rel_path = str(image_path.relative_to(self.outputs_dir)).replace('\\', '/')

        return {
            'id': base64.urlsafe_b64encode(str(image_path).encode()).decode()[:16],
            'filename': image_path.name,
            'path': f'/api/image/{base64.urlsafe_b64encode(rel_path.encode()).decode()}',
            'type': image_type,
            'thumbnail': f'/api/thumb/{base64.urlsafe_b64encode(rel_path.encode()).decode()}',
            'created_at': created_time.isoformat(),
            'size': stat.st_size,
            'dimensions': dimensions,
            'metadata': metadata
        }

    def _get_directory_mtime(self):
        """Get maximum modification time of all files in outputs directory."""
        if not self.outputs_dir.exists():
            return 0

        try:
            max_mtime = 0
            for path in self.outputs_dir.rglob('*'):
                if path.is_file():
                    try:
                        mtime = path.stat().st_mtime
                        if mtime > max_mtime:
                            max_mtime = mtime
                    except:
                        continue
            return max_mtime
        except:
            return 0

    def generate_thumbnail(self, image_path, thumb_path):
        """Generate thumbnail for image.

        Args:
            image_path: Path to original image
            thumb_path: Path to save thumbnail

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with Image.open(image_path) as img:
                # Convert to RGB (handle RGBA and other modes)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGBA')
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Generate thumbnail
                img.thumbnail(self.THUMB_SIZE, Image.Resampling.LANCZOS)
                img.save(thumb_path, 'JPEG', quality=self.THUMB_QUALITY, optimize=True)
                return True
        except Exception as e:
            logger.error(f"Failed to generate thumbnail for {image_path}: {e}")
            return False

    def get_thumbnail_path(self, image_path):
        """Get thumbnail path for image.

        Args:
            image_path: Path to original image

        Returns:
            Path: Path to thumbnail file
        """
        file_hash = hashlib.md5(str(image_path).encode()).hexdigest()
        return self.thumbs_dir / f"{file_hash}.jpg"

    def needs_thumbnail_regeneration(self, image_path, thumb_path):
        """Check if thumbnail needs regeneration.

        Args:
            image_path: Path to original image
            thumb_path: Path to thumbnail

        Returns:
            bool: True if needs regeneration
        """
        if not thumb_path.exists():
            return True

        original_mtime = image_path.stat().st_mtime
        thumb_mtime = thumb_path.stat().st_mtime

        return thumb_mtime < original_mtime