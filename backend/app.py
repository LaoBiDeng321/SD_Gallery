"""SD Gallery Flask 应用入口"""

import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

from .config import (
    PROJECT_ROOT, OUTPUTS_DIR, TRASH_DIR, TRASH_MANIFEST,
    NSFW_KEYWORDS_FILE, LORA_MAPPINGS_FILE, THUMBS_DIR, HOST, PORT, DEBUG
)
from .console import print_banner
from .utils.cache import ImageCache
from .utils.logger import setup_logger, get_log_manager
from .routes import register_image_routes, register_trash_routes, register_nsfw_routes, register_lora_routes


# Initialize Flask app
app = Flask(__name__, static_folder=str(PROJECT_ROOT), static_url_path='')
CORS(app)

# Initialize logger
logger = setup_logger(
    name='sd-gallery',
    log_dir=PROJECT_ROOT / 'logs',
    log_file='sd-gallery',
    retain_days=7,
    max_file_size_mb=10,
    max_file_count=100
)

# Configure request logger
flask_logger = logging.getLogger('sd-gallery.request')
flask_logger.setLevel(logging.INFO)
flask_logger.propagate = False
flask_handler = logging.FileHandler(
    PROJECT_ROOT / 'logs' / 'request.log',
    encoding='utf-8'
)
flask_handler.setLevel(logging.INFO)
flask_handler.setFormatter(logging.Formatter(
    fmt='%(asctime)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))
flask_logger.addHandler(flask_handler)

# Disable Flask/Werkzeug default logging
app.logger.handlers.clear()
app.logger.setLevel(logging.ERROR)

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.handlers.clear()
werkzeug_logger.setLevel(logging.CRITICAL)
werkzeug_logger.propagate = False


# Request/Error logging hooks
@app.after_request
def log_request(response):
    from datetime import datetime
    date_str = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
    flask_logger.info(
        f'{request.remote_addr} - - [{date_str}] '
        f'"{request.method} {request.path} HTTP/1.1" {response.status_code} - '
        f'"{request.headers.get("User-Agent", "")}"'
    )
    return response


@app.errorhandler(Exception)
def log_error(error):
    from datetime import datetime
    date_str = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
    flask_logger.error(
        f'{request.remote_addr} - - [{date_str}] '
        f'"{request.method} {request.path} HTTP/1.1" 500 - '
        f'Error: {str(error)}'
    )
    return jsonify({'success': False, 'error': str(error)}), 500


# Initialize cache
image_cache = ImageCache()

# Register routes
register_image_routes(app, OUTPUTS_DIR, THUMBS_DIR, image_cache, PROJECT_ROOT)
register_trash_routes(app, OUTPUTS_DIR, TRASH_DIR, TRASH_MANIFEST, THUMBS_DIR, image_cache)
register_nsfw_routes(app, NSFW_KEYWORDS_FILE)
register_lora_routes(app, LORA_MAPPINGS_FILE)


# Log management endpoints
@app.route('/api/logs/status', methods=['GET'])
def get_logs_status():
    manager = get_log_manager()
    return jsonify(manager.get_status())


@app.route('/api/logs/audit', methods=['GET'])
def get_logs_audit():
    manager = get_log_manager()
    limit = int(request.args.get('limit', 100))
    return jsonify(manager.get_audit_log(limit))


@app.route('/api/logs/cleanup', methods=['POST'])
def trigger_logs_cleanup():
    manager = get_log_manager()
    result = manager.manual_cleanup(operator='api')
    return jsonify(result)


# Cache refresh endpoint (for development/debugging)
@app.route('/api/cache/refresh', methods=['POST'])
def refresh_cache():
    """Force mark cache as dirty to trigger re-scan."""
    image_cache.mark_dirty()
    return jsonify({'success': True, 'message': 'Cache marked for refresh'})


if __name__ == '__main__':
    from .config import get_local_ip
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        print_banner(OUTPUTS_DIR.absolute(), PROJECT_ROOT / 'logs', get_local_ip())
    app.run(host=HOST, port=PORT, debug=DEBUG, use_reloader=True)
