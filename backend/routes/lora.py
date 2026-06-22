"""LoRA mapping-related API routes for SD Gallery."""

from flask import jsonify, request

from ..services.lora_service import LoraService
from ..utils.logger import get_logger

logger = get_logger('sd-gallery.lora')


def register_lora_routes(app, mappings_file):
    """Register LoRA mapping-related routes.

    Args:
        app: Flask application
        mappings_file: Path to lora_mappings.json file
    """
    lora_service = LoraService(mappings_file)

    @app.route('/api/lora/mappings', methods=['GET'])
    def get_lora_mappings():
        """Get all LoRA name mappings."""
        mappings = lora_service.load_mappings()
        return jsonify({
            'success': True,
            'data': {'mappings': mappings}
        })

    @app.route('/api/lora/mappings', methods=['POST'])
    def set_lora_mappings():
        """Set LoRA name mappings (complete replacement)."""
        try:
            data = request.get_json()
            if not data or 'mappings' not in data:
                return jsonify({'success': False, 'error': 'Missing mappings parameter'}), 400

            mappings = data['mappings']
            if not isinstance(mappings, dict):
                return jsonify({'success': False, 'error': 'Mappings must be an object'}), 400

            # Validate: all keys and values should be non-empty strings
            cleaned = {}
            for k, v in mappings.items():
                if isinstance(k, str) and isinstance(v, str):
                    clean_k = k.strip()
                    clean_v = v.strip()
                    if clean_k and clean_v:
                        cleaned[clean_k] = clean_v

            if lora_service.save_mappings(cleaned):
                return jsonify({
                    'success': True,
                    'message': 'Mappings saved',
                    'data': {'mappings': cleaned}
                })
            else:
                return jsonify({'success': False, 'error': 'Save failed'}), 500

        except Exception as e:
            logger.error(f"Set mappings error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/lora/mappings/add', methods=['POST'])
    def add_lora_mapping():
        """Add or update a single LoRA name mapping."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'Invalid request data'}), 400

            raw_name = (data.get('rawName') or '').strip()
            display_name = (data.get('displayName') or '').strip()

            if not raw_name:
                return jsonify({'success': False, 'error': 'Missing rawName parameter'}), 400
            if not display_name:
                return jsonify({'success': False, 'error': 'Missing displayName parameter'}), 400

            mappings, was_added = lora_service.add_mapping(raw_name, display_name)

            return jsonify({
                'success': True,
                'message': 'Mapping added' if was_added else 'Mapping updated',
                'data': {
                    'mappings': mappings,
                    'rawName': raw_name,
                    'displayName': display_name,
                    'wasAdded': was_added
                }
            })

        except Exception as e:
            logger.error(f"Add mapping error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/lora/mappings/remove', methods=['POST'])
    def remove_lora_mapping():
        """Remove a single LoRA name mapping."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'Invalid request data'}), 400

            raw_name = (data.get('rawName') or '').strip()

            if not raw_name:
                return jsonify({'success': False, 'error': 'Missing rawName parameter'}), 400

            mappings, was_removed = lora_service.remove_mapping(raw_name)

            return jsonify({
                'success': True,
                'message': 'Mapping removed' if was_removed else 'Mapping not found',
                'data': {
                    'mappings': mappings,
                    'rawName': raw_name,
                    'wasRemoved': was_removed
                }
            })

        except Exception as e:
            logger.error(f"Remove mapping error: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
