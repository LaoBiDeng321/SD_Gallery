"""Path handling utilities for SD Gallery."""

from pathlib import Path
from flask import abort


def safe_resolve_path(rel_path: str, base_path: Path) -> Path:
    """Resolve a relative path within base_path, preventing traversal attacks.

    Args:
        rel_path: Relative path string
        base_path: Base directory path

    Returns:
        Path: Resolved absolute path

    Raises:
        403: If path is outside base directory
    """
    try:
        # Normalize base path
        base_path = base_path.resolve()

        # Build and resolve target path
        target_path = (base_path / rel_path).resolve()

        # Use relative_to to ensure target path is within base directory
        target_path.relative_to(base_path)

        return target_path
    except (ValueError, RuntimeError, OSError):
        abort(403)


def get_image_type(folder_name):
    """Get image type from folder name.

    Args:
        folder_name: Name of the folder

    Returns:
        str: Image type (txt2img, img2img, extras, etc.)
    """
    type_mapping = {
        'txt2img-images': 'txt2img',
        'txt2img-grids': 'txt2img-grid',
        'img2img-images': 'img2img',
        'img2img-grids': 'img2img-grid',
        'extras-images': 'extras',
        'extras': 'extras',
    }
    return type_mapping.get(folder_name, folder_name)