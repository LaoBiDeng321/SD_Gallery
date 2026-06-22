"""NSFW-related API routes for SD Gallery."""

from flask import jsonify, request

from ..services.nsfw_service import NSFWService
from ..utils.logger import get_logger

logger = get_logger('sd-gallery.nsfw')


def register_nsfw_routes(app, keywords_file):
    """Register NSFW-related routes.

    Args:
        app: Flask application
        keywords_file: Path to keywords file
    """
    nsfw_service = NSFWService(keywords_file)

    @app.route('/api/nsfw/keywords', methods=['GET'])
    def get_nsfw_keywords():
        """Get NSFW keywords list."""
        keywords = nsfw_service.load_keywords()
        return jsonify({
            'success': True,
            'data': {'keywords': keywords}
        })

    @app.route('/api/nsfw/keywords', methods=['POST'])
    def set_nsfw_keywords():
        """Set NSFW keywords list (complete replacement)."""
        try:
            data = request.get_json()
            if not data or 'keywords' not in data:
                return jsonify({'success': False, 'error': 'Missing keywords parameter'}), 400

            keywords = data['keywords']
            if not isinstance(keywords, list):
                return jsonify({'success': False, 'error': 'Keywords must be an array'}), 400

            # Normalize keywords: lowercase, strip spaces, remove duplicates
            normalized = []
            seen = set()
            for kw in keywords:
                if isinstance(kw, str):
                    clean_kw = kw.lower().strip()
                    if clean_kw and clean_kw not in seen:
                        normalized.append(clean_kw)
                        seen.add(clean_kw)

            if nsfw_service.save_keywords(normalized):
                return jsonify({
                    'success': True,
                    'message': 'Keywords saved',
                    'data': {'keywords': normalized}
                })
            else:
                return jsonify({'success': False, 'error': 'Save failed'}), 500

        except Exception as e:
            logger.error(f"Set keywords error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/nsfw/keywords/add', methods=['POST'])
    def add_nsfw_keywords():
        """Add NSFW keywords (append)."""
        try:
            data = request.get_json()
            if not data or 'keywords' not in data:
                return jsonify({'success': False, 'error': 'Missing keywords parameter'}), 400

            new_keywords = data['keywords']
            if not isinstance(new_keywords, list):
                return jsonify({'success': False, 'error': 'Keywords must be an array'}), 400

            updated, added = nsfw_service.add_keywords(new_keywords)

            return jsonify({
                'success': True,
                'message': f'Added {len(added)} keywords',
                'data': {
                    'keywords': updated,
                    'added': added
                }
            })

        except Exception as e:
            logger.error(f"Add keywords error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/nsfw/keywords/remove', methods=['POST'])
    def remove_nsfw_keywords():
        """Remove specified NSFW keywords."""
        try:
            data = request.get_json()
            if not data or 'keywords' not in data:
                return jsonify({'success': False, 'error': 'Missing keywords parameter'}), 400

            to_remove = data['keywords']
            if not isinstance(to_remove, list):
                return jsonify({'success': False, 'error': 'Keywords must be an array'}), 400

            updated, removed = nsfw_service.remove_keywords(to_remove)

            return jsonify({
                'success': True,
                'message': f'Removed {len(removed)} keywords',
                'data': {
                    'keywords': updated,
                    'removed': removed
                }
            })

        except Exception as e:
            logger.error(f"Remove keywords error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500