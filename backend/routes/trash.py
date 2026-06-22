"""Trash-related API routes for SD Gallery."""

from datetime import datetime
from flask import jsonify, request

from ..services.trash_service import TrashService
from ..services.image_service import ImageService
from ..utils.logger import get_logger

logger = get_logger('sd-gallery.trash')


def register_trash_routes(app, outputs_dir, trash_dir, manifest_file, thumbs_dir, image_cache):
    """Register trash-related routes.

    Args:
        app: Flask application
        outputs_dir: Path to outputs directory
        trash_dir: Path to trash directory
        manifest_file: Path to manifest file
        thumbs_dir: Path to thumbnails directory
        image_cache: ImageCache instance
    """
    trash_service = TrashService(trash_dir, outputs_dir, manifest_file)
    image_service = ImageService(outputs_dir, thumbs_dir)

    @app.route('/api/trash/list')
    def get_trash_list():
        """Get list of trash items."""
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        search = request.args.get('search', '').lower()

        trash_items = trash_service.list_trash()

        if search:
            trash_items = [
                entry for entry in trash_items
                if search in entry.get('original_path', '').lower()
            ]

        trash_items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        total = len(trash_items)
        total_pages = (total + limit - 1) // limit
        start = (page - 1) * limit
        end = start + limit

        result_items = []
        for entry in trash_items[start:end]:
            trash_file = trash_dir / entry['trash_name']
            info = None
            if trash_file.exists():
                info = image_service._build_image_info(trash_file, f".trash/{entry['trash_name']}")
            result_items.append({
                'original_path': entry['original_path'],
                'trash_name': entry['trash_name'],
                'deleted_at': datetime.strptime(entry['timestamp'], '%Y%m%d_%H%M%S').isoformat() if 'timestamp' in entry else '',
                'exists': trash_file.exists(),
                'info': info
            })

        return jsonify({
            'success': True,
            'data': {
                'items': result_items,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'total_pages': total_pages
                }
            }
        })

    @app.route('/api/trash/restore', methods=['POST'])
    def restore_trash_item():
        """Restore item from trash."""
        try:
            data = request.get_json()
            if not data or 'trash_name' not in data:
                return jsonify({'success': False, 'error': 'Missing parameter trash_name'}), 400

            trash_name = data['trash_name']
            success = trash_service.restore_from_trash(trash_name)

            if success:
                image_cache.mark_dirty()
                return jsonify({'success': True, 'message': 'Restore successful'})
            else:
                return jsonify({'success': False, 'error': 'Restore failed, file may be corrupted'}), 500

        except Exception as e:
            logger.error(f"Restore error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/trash/delete', methods=['POST'])
    def delete_trash_item():
        """Permanently delete item from trash."""
        try:
            data = request.get_json()
            if not data or 'trash_name' not in data:
                return jsonify({'success': False, 'error': 'Missing parameter trash_name'}), 400

            trash_name = data['trash_name']
            success = trash_service.delete_from_trash(trash_name)

            if success:
                return jsonify({'success': True, 'message': 'Permanently deleted'})
            else:
                return jsonify({'success': False, 'error': 'File not found'}), 404

        except Exception as e:
            logger.error(f"Trash delete error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/trash/empty', methods=['POST'])
    def empty_trash_handler():
        """Empty trash completely."""
        try:
            trash_service.empty_trash()
            return jsonify({'success': True, 'message': 'Trash emptied'})
        except Exception as e:
            logger.error(f"Empty trash error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/trash/count')
    def get_trash_count():
        """Get count of items in trash."""
        count = trash_service.get_trash_count()
        return jsonify({
            'success': True,
            'data': {'count': count}
        })