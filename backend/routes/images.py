"""Image-related API routes for SD Gallery."""

import base64
import traceback
from collections import defaultdict
from datetime import datetime
from flask import jsonify, request, send_from_directory, send_file, abort

from ..utils.path import safe_resolve_path
from ..utils.logger import get_logger
from ..services.image_service import ImageService
from ..utils.metadata import normalize_model_name

logger = get_logger('sd-gallery.routes')


def group_models_by_normalized(images):
    """Group models by normalized name for intelligent merging.

    Args:
        images: List of image dicts with metadata

    Returns:
        list: List of model groups with merged counts and display names
        Each item: {name: str (display name), normalized: str, count: int, aliases: [str]}
    """
    # First pass: collect all original names under their normalized form
    normalized_groups = defaultdict(lambda: {'count': 0, 'original_names': []})

    for img in images:
        original_name = img['metadata'].get('model_name', '')

        # 优先使用已计算的 normalized 值，否则动态计算（兼容旧缓存）
        normalized_name = img['metadata'].get('model_normalized', '')
        if not normalized_name and original_name:
            normalized_name = normalize_model_name(original_name)

        if not original_name or not normalized_name:
            continue

        group = normalized_groups[normalized_name]
        group['count'] += 1
        if original_name not in group['original_names']:
            group['original_names'].append(original_name)

    # Second pass: for each group, pick the most common original name as display name
    result = []
    for normalized_name, group in normalized_groups.items():
        # Use the longest/most detailed name as the display name
        display_name = max(group['original_names'], key=lambda n: len(n))

        result.append({
            'name': display_name,
            'normalized': normalized_name,
            'count': group['count'],
            'aliases': sorted(group['original_names'])
        })

    # Sort by count descending
    return sorted(result, key=lambda x: -x['count'])


def register_image_routes(app, outputs_dir, thumbs_dir, image_cache, project_root):
    """Register image-related routes.

    Args:
        app: Flask application
        outputs_dir: Path to outputs directory
        thumbs_dir: Path to thumbnails directory
        image_cache: ImageCache instance
        project_root: Path to project root directory (sd-gallery)
    """
    image_service = ImageService(outputs_dir, thumbs_dir)

    @app.route('/')
    def index():
        """Serve index page."""
        return send_from_directory(str(project_root), 'index.html')

    # Handle src directory static files
    @app.route('/src/<path:filename>')
    def serve_src_files(filename):
        """Serve files from src directory."""
        return send_from_directory(str(project_root / 'src'), filename)

    @app.route('/api/images')
    def get_images():
        """Get list of images with pagination and filters."""
        image_type = request.args.get('type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        model = request.args.get('model', '').strip()
        lora = request.args.get('lora', '').strip()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        search = request.args.get('search', '').lower()

        images = image_service.scan_images(image_cache)

        # Apply filters
        if image_type and image_type != 'all':
            images = [img for img in images if img['type'] == image_type]

        if model:
            # Support filtering by both original and normalized model name
            normalized_filter = normalize_model_name(model)
            images = [img for img in images if
                      img['metadata'].get('model_name', '') == model or
                      img['metadata'].get('model_normalized', '') == normalized_filter or
                      normalize_model_name(img['metadata'].get('model_name', '')) == normalized_filter]

        if lora:
            lora_lower = lora.lower()
            images = [img for img in images if
                      any(lora_lower == l.lower() for l in img['metadata'].get('loras', []))]

        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from)
                images = [img for img in images if datetime.fromisoformat(img['created_at']) >= from_date]
            except:
                pass

        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to)
                to_date = to_date.replace(hour=23, minute=59, second=59)
                images = [img for img in images if datetime.fromisoformat(img['created_at']) <= to_date]
            except:
                pass

        if search:
            images = [img for img in images if
                      search in img['filename'].lower() or
                      search in img['metadata']['prompt'].lower() or
                      (img['metadata']['negative_prompt'] and search in img['metadata']['negative_prompt'].lower())]

        # Pagination
        total = len(images)
        total_pages = (total + limit - 1) // limit
        start = (page - 1) * limit
        end = start + limit

        # Collect all models for filter options (using same logic as /api/models)
        models_grouped = []
        model_normalized_map = {}  # normalized -> {name, count, aliases}

        # Build unique model list first
        temp_groups = defaultdict(lambda: {'original_names': []})
        for img in images:
            original_name = img['metadata'].get('model_name', '')
            norm = img['metadata'].get('model_normalized', '')
            if not norm and original_name:
                norm = normalize_model_name(original_name)
            if original_name and norm and original_name not in temp_groups[norm]['original_names']:
                temp_groups[norm]['original_names'].append(original_name)

        # Count using same filter logic
        for norm_name, group in temp_groups.items():
            display_name = max(group['original_names'], key=lambda n: len(n))
            filtered_count = len([img for img in images if
                img['metadata'].get('model_name', '') == display_name or
                img['metadata'].get('model_name', '') in group['original_names'] or
                img['metadata'].get('model_normalized', '') == norm_name or
                normalize_model_name(img['metadata'].get('model_name', '')) == norm_name])
            models_grouped.append({
                'name': display_name,
                'normalized': norm_name,
                'count': filtered_count,
                'aliases': sorted(group['original_names'])
            })
        models_grouped.sort(key=lambda x: -x['count'])

        # Build lora counts from currently filtered images
        lora_counts = defaultdict(int)
        for img in images:
            for lora_name in img['metadata'].get('loras', []):
                lora_counts[lora_name] += 1
        loras_list = sorted(
            [{'name': name, 'count': count} for name, count in lora_counts.items()],
            key=lambda x: -x['count']
        )

        return jsonify({
            'success': True,
            'data': {
                'images': images[start:end],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'total_pages': total_pages
                },
                'filters': {
                    'types': ['txt2img', 'img2img', 'extras'],
                    'models': [{'name': m['name'], 'normalized': m['normalized'], 'count': m['count'], 'aliases': m['aliases']} for m in models_grouped],
                    'loras': loras_list,
                    'date_range': {
                        'min': min([img['created_at'] for img in images]) if images else None,
                        'max': max([img['created_at'] for img in images]) if images else None
                    }
                }
            }
        })

    @app.route('/api/image/<path:encoded_path>')
    def get_image(encoded_path):
        """Serve image file."""
        try:
            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            image_path = safe_resolve_path(rel_path, outputs_dir)

            if not image_path.exists():
                abort(404)

            if image_path.stat().st_size > ImageService.MAX_FILE_SIZE:
                abort(413)

            return send_from_directory(str(outputs_dir), rel_path)

        except Exception as e:
            logger.error(f"Error serving image: {e}")
            abort(500)

    @app.route('/api/thumb/<path:encoded_path>')
    def get_thumbnail(encoded_path):
        """Serve thumbnail image."""
        try:
            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            image_path = safe_resolve_path(rel_path, outputs_dir)

            if not image_path.exists():
                abort(404)

            # Ensure thumbnail directory exists
            thumbs_dir.mkdir(parents=True, exist_ok=True)

            # Get thumbnail path
            thumb_path = image_service.get_thumbnail_path(image_path)

            # Check if needs regeneration
            if image_service.needs_thumbnail_regeneration(image_path, thumb_path):
                if not image_service.generate_thumbnail(image_path, thumb_path):
                    # If generation fails, return original
                    return send_from_directory(str(outputs_dir), rel_path)

            return send_file(str(thumb_path))

        except Exception as e:
            logger.error(f"Error serving thumbnail: {e}")
            abort(500)

    @app.route('/api/image/<path:encoded_path>/meta')
    def get_image_meta(encoded_path):
        """Get image metadata."""
        try:
            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            image_path = safe_resolve_path(rel_path, outputs_dir)

            if not image_path.exists():
                abort(404)

            stat = image_path.stat()
            from ..utils.metadata import extract_metadata
            metadata = extract_metadata(str(image_path))

            return jsonify({
                'success': True,
                'data': {
                    **metadata,
                    'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'file_size': stat.st_size
                }
            })

        except Exception as e:
            logger.error(f"Error getting metadata: {e}")
            abort(500)

    @app.route('/api/download/<path:encoded_path>')
    def download_image(encoded_path):
        """Download image file."""
        try:
            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            image_path = safe_resolve_path(rel_path, outputs_dir)

            if not image_path.exists():
                abort(404)

            if image_path.stat().st_size > ImageService.MAX_FILE_SIZE:
                abort(413)

            return send_from_directory(
                str(outputs_dir),
                rel_path,
                as_attachment=True,
                download_name=image_path.name
            )

        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            abort(500)

    @app.route('/api/stats')
    def get_stats():
        """Get statistics."""
        images = image_service.scan_images(image_cache)

        type_counts = {}
        for img in images:
            img_type = img['type']
            type_counts[img_type] = type_counts.get(img_type, 0) + 1

        # Use same filter-based counting for model statistics
        temp_groups = defaultdict(lambda: {'original_names': []})
        for img in images:
            original_name = img['metadata'].get('model_name', '')
            norm = img['metadata'].get('model_normalized', '')
            if not norm and original_name:
                norm = normalize_model_name(original_name)
            if original_name and norm and original_name not in temp_groups[norm]['original_names']:
                temp_groups[norm]['original_names'].append(original_name)

        models_grouped = []
        for norm_name, group in temp_groups.items():
            display_name = max(group['original_names'], key=lambda n: len(n))
            filtered_count = len([img for img in images if
                img['metadata'].get('model_name', '') == display_name or
                img['metadata'].get('model_name', '') in group['original_names'] or
                img['metadata'].get('model_normalized', '') == norm_name or
                normalize_model_name(img['metadata'].get('model_name', '')) == norm_name])
            models_grouped.append({
                'name': display_name,
                'normalized': norm_name,
                'count': filtered_count
            })
        models_grouped.sort(key=lambda x: -x['count'])

        # Build lora statistics
        lora_counts = defaultdict(int)
        for img in images:
            for lora_name in img['metadata'].get('loras', []):
                lora_counts[lora_name] += 1
        loras_grouped = sorted(
            [{'name': name, 'count': count} for name, count in lora_counts.items()],
            key=lambda x: -x['count']
        )

        return jsonify({
            'success': True,
            'data': {
                'total': len(images),
                'by_type': type_counts,
                'by_model': models_grouped,
                'by_lora': loras_grouped
            }
        })

    @app.route('/api/models')
    def get_models():
        """Get list of all available models with image counts (with intelligent grouping).

        Uses the same filtering logic as /api/images to ensure counts are accurate.
        """
        images = image_service.scan_images(image_cache)

        # Step 1: Group all images by normalized model name (to get unique model list)
        normalized_groups = defaultdict(lambda: {'original_names': [], 'display_name': ''})

        for img in images:
            original_name = img['metadata'].get('model_name', '')
            normalized_name = img['metadata'].get('model_normalized', '')
            if not normalized_name and original_name:
                normalized_name = normalize_model_name(original_name)

            if not original_name or not normalized_name:
                continue

            group = normalized_groups[normalized_name]
            if original_name not in group['original_names']:
                group['original_names'].append(original_name)

        # Step 2: For each unique model, use the SAME filter logic to get accurate count
        result = []
        for normalized_name, group in normalized_groups.items():
            display_name = max(group['original_names'], key=lambda n: len(n))

            # Use identical filter logic as /api/images endpoint
            filtered = [img for img in images if
                       img['metadata'].get('model_name', '') == display_name or
                       img['metadata'].get('model_name', '') in group['original_names'] or
                       img['metadata'].get('model_normalized', '') == normalized_name or
                       normalize_model_name(img['metadata'].get('model_name', '')) == normalized_name]

            result.append({
                'name': display_name,
                'normalized': normalized_name,
                'count': len(filtered),  # Real count from actual filter logic
                'aliases': sorted(group['original_names'])
            })

        # Sort by count descending
        result.sort(key=lambda x: -x['count'])

        return jsonify({
            'success': True,
            'data': {
                'models': result,
                'total': len(result)
            }
        })

    @app.route('/api/loras')
    def get_loras():
        """Get list of all available LoRAs with image counts.

        Uses the same filtering logic as /api/images to ensure counts are accurate.
        """
        images = image_service.scan_images(image_cache)

        # Count images containing each LoRA
        from collections import defaultdict
        lora_counts = defaultdict(int)

        for img in images:
            loras = img['metadata'].get('loras', [])
            for lora_name in loras:
                lora_counts[lora_name] += 1

        # Build result list sorted by count descending
        result = sorted(
            [{'name': name, 'count': count} for name, count in lora_counts.items()],
            key=lambda x: -x['count']
        )

        return jsonify({
            'success': True,
            'data': {
                'loras': result,
                'total': len(result)
            }
        })

    @app.route('/api/rename', methods=['POST'])
    def rename_image():
        """Rename image file."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'Invalid request data'}), 400

            encoded_path = data.get('path')
            new_name = data.get('newName')

            if not encoded_path or not new_name:
                return jsonify({'success': False, 'error': 'Missing required parameters'}), 400

            if len(new_name) > 50:
                return jsonify({'success': False, 'error': 'Name length cannot exceed 50 characters'}), 400

            if encoded_path.startswith('/api/image/'):
                encoded_path = encoded_path[11:]

            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            old_path = safe_resolve_path(rel_path, outputs_dir)

            if not old_path.exists():
                return jsonify({'success': False, 'error': 'File not found'}), 404

            if not old_path.is_file():
                return jsonify({'success': False, 'error': 'Path is not a file'}), 400

            parent_dir = old_path.parent
            new_path = parent_dir / new_name

            if new_path.exists():
                return jsonify({'success': False, 'error': 'Name already exists'}), 409

            old_path.rename(new_path)
            logger.info(f"Renamed: {old_path.name} -> {new_name}")

            # Update cache
            new_rel_path = str(new_path.relative_to(outputs_dir)).replace('\\', '/')
            image_cache.mark_dirty()

            new_info = image_service._build_image_info(new_path, image_service._get_image_type(parent_dir.name))

            return jsonify({
                'success': True,
                'message': 'Rename successful',
                'oldName': old_path.name,
                'newName': new_name,
                'data': new_info
            })

        except Exception as e:
            logger.error(f"Rename error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/delete', methods=['POST'])
    def delete_image():
        """Delete image file."""
        try:
            data = request.get_json(silent=True)

            if not data:
                return jsonify({'success': False, 'error': 'Invalid request data'}), 400

            encoded_path = data.get('path')
            if not encoded_path:
                return jsonify({'success': False, 'error': 'Missing file path'}), 400

            mode = data.get('mode', 'hard')

            try:
                if encoded_path.startswith('/api/image/'):
                    encoded_path = encoded_path[11:]

                rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
            except Exception as decode_error:
                return jsonify({'success': False, 'error': f'Path encoding error: {str(decode_error)}'}), 400

            image_path = safe_resolve_path(rel_path, outputs_dir)

            if not image_path.exists() or not image_path.is_file():
                return jsonify({'success': False, 'error': 'File not found'}), 404

            if mode == 'soft':
                from ..services.trash_service import TrashService
                trash_service = TrashService(outputs_dir / '.trash', outputs_dir, outputs_dir / '.trash' / 'manifest.json')
                moved = trash_service.move_to_trash(image_path)
                if not moved:
                    return jsonify({'success': False, 'error': 'Failed to move to trash'}), 500

                image_cache.mark_dirty()

                return jsonify({
                    'success': True,
                    'message': 'Moved to trash',
                    'mode': 'soft',
                    'filename': image_path.name
                })
            else:
                # Hard delete
                try:
                    image_path.unlink()
                except PermissionError as pe:
                    return jsonify({'success': False, 'error': f'Permission denied: {str(pe)}'}), 403
                except OSError as ose:
                    return jsonify({'success': False, 'error': f'System error: {str(ose)}'}), 500

                image_cache.mark_dirty()

                return jsonify({
                    'success': True,
                    'message': 'Delete successful',
                    'mode': 'hard',
                    'filename': image_path.name
                })

        except Exception as e:
            logger.error(f"Delete error: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({'success': False, 'error': str(e)}), 500