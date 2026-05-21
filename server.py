import os
import json
import base64
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS
from PIL import Image

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

OUTPUTS_DIR = Path(__file__).parent.parent / 'outputs'
TRASH_DIR = OUTPUTS_DIR / '.trash'
TRASH_MANIFEST = TRASH_DIR / 'manifest.json'
MAX_FILE_SIZE = 50 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}

_image_cache = {}
_cache_timestamp = 0
_CACHE_DURATION = 60
_cache_dirty = False

def should_refresh_cache():
    global _cache_timestamp
    if not OUTPUTS_DIR.exists():
        return True
    current_time = time.time()
    if current_time - _cache_timestamp > _CACHE_DURATION:
        return True
    return False

def get_directory_mtime():
    if not OUTPUTS_DIR.exists():
        return 0
    try:
        max_mtime = 0
        for path in OUTPUTS_DIR.rglob('*'):
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

def get_image_type(folder_name):
    type_mapping = {
        'txt2img-images': 'txt2img',
        'txt2img-grids': 'txt2img-grid',
        'img2img-images': 'img2img',
        'img2img-grids': 'img2img-grid',
        'extras-images': 'extras',
        'extras': 'extras',
    }
    return type_mapping.get(folder_name, folder_name)

def safe_resolve_path(rel_path: str) -> Path:
    """Resolve a relative path within OUTPUTS_DIR, preventing traversal attacks."""
    full_path = (OUTPUTS_DIR / rel_path).resolve()
    if not str(full_path).startswith(str(OUTPUTS_DIR.resolve())):
        abort(403)
    return full_path


def extract_metadata(image_path):
    metadata = {
        'prompt': '',
        'negative_prompt': '',
        'steps': None,
        'sampler': '',
        'cfg_scale': None,
        'seed': None,
        'size': '',
        'model_hash': '',
        'model_name': ''
    }

    try:
        geninfo = None

        # 方法1: 使用 PIL 读取图片元数据（与 SD WebUI 一致，最可靠）
        try:
            with Image.open(image_path) as img:
                if 'parameters' in img.info:
                    geninfo = img.info['parameters']
                elif 'Comment' in img.info:
                    comment = img.info['Comment']
                    if isinstance(comment, bytes):
                        geninfo = comment.decode('utf-8', errors='ignore')
                    else:
                        geninfo = comment
        except Exception:
            pass

        # 方法2: 回退到原始二进制搜索（兼容特殊情况）
        if not geninfo:
            with open(image_path, 'rb') as f:
                data = f.read(5 * 1024 * 1024)

                if b'parameters' in data:
                    parts = data.split(b'parameters')
                    if len(parts) > 1:
                        param_data = parts[1].split(b'end parameters')[0] if b'end parameters' in parts[1] else parts[1]
                        geninfo = param_data.decode('utf-8', errors='ignore')

        if not geninfo:
            return metadata

        # 使用 Negative prompt: 作为分隔，正确提取多行 prompt
        neg_split = geninfo.strip().split('Negative prompt:', 1)
        metadata['prompt'] = neg_split[0].strip()

        if len(neg_split) > 1:
            rest = neg_split[1].strip()

            steps_idx = rest.find('Steps:')
            if steps_idx >= 0:
                metadata['negative_prompt'] = rest[:steps_idx].strip().rstrip(',')
                params_line = rest[steps_idx:]
            else:
                metadata['negative_prompt'] = rest
                params_line = ''
        else:
            params_line = ''

        if 'Steps:' in params_line:
            steps_part = params_line.split('Steps:')[1]
            if ',' in steps_part:
                steps_match = steps_part.split(',')[0].strip()
            else:
                steps_match = steps_part.strip().split()[0] if steps_part.strip() else ''
            try:
                metadata['steps'] = int(steps_match)
            except:
                pass

        if 'Sampler:' in params_line:
            sampler_part = params_line.split('Sampler:')[1]
            if ',' in sampler_part:
                metadata['sampler'] = sampler_part.split(',')[0].strip()
            else:
                metadata['sampler'] = sampler_part.strip()

        if 'CFG scale:' in params_line:
            cfg_part = params_line.split('CFG scale:')[1]
            if ',' in cfg_part:
                cfg_match = cfg_part.split(',')[0].strip()
            else:
                cfg_match = cfg_part.strip().split()[0] if cfg_part.strip() else ''
            try:
                metadata['cfg_scale'] = float(cfg_match)
            except:
                pass

        if 'Seed:' in params_line:
            seed_part = params_line.split('Seed:')[1]
            if ',' in seed_part:
                seed_match = seed_part.split(',')[0].strip()
            else:
                seed_match = seed_part.strip().split()[0] if seed_part.strip() else ''
            try:
                metadata['seed'] = int(seed_match)
            except:
                pass

        if 'Size:' in params_line:
            size_part = params_line.split('Size:')[1]
            if ',' in size_part:
                metadata['size'] = size_part.split(',')[0].strip()
            else:
                metadata['size'] = size_part.strip().split()[0] if size_part.strip() else ''

        if 'Model hash:' in params_line:
            hash_part = params_line.split('Model hash:')[1]
            if ',' in hash_part:
                metadata['model_hash'] = hash_part.split(',')[0].strip()
            else:
                metadata['model_hash'] = hash_part.strip().split()[0] if hash_part.strip() else ''

        if 'Model:' in params_line:
            model_part = params_line.split('Model:')[1]
            if ',' in model_part:
                metadata['model_name'] = model_part.split(',')[0].strip()
            else:
                metadata['model_name'] = model_part.strip().split()[0] if model_part.strip() else ''

    except Exception as e:
        print(f"Error extracting metadata from {image_path}: {e}")

    return metadata

def scan_images(force_refresh=False):
    global _image_cache, _cache_timestamp, _cache_dirty

    if _cache_dirty:
        force_refresh = True
        _cache_dirty = False

    if not force_refresh and not should_refresh_cache():
        return _image_cache.get('images', [])

    images = []

    if not OUTPUTS_DIR.exists():
        _image_cache = {'images': images}
        _cache_timestamp = time.time()
        return images

    dir_mtime = get_directory_mtime()
    
    if not force_refresh and _image_cache.get('mtime') == dir_mtime:
        _cache_timestamp = time.time()
        return _image_cache.get('images', [])

    for type_dir in OUTPUTS_DIR.iterdir():
        if not type_dir.is_dir():
            continue
        if type_dir.name == '.trash':
            continue

        image_type = get_image_type(type_dir.name)

        for image_file in type_dir.rglob('*'):
            if not image_file.is_file():
                continue

            if image_file.suffix.lower() not in ALLOWED_EXTENSIONS:
                continue

            try:
                stat = image_file.stat()
                created_time = datetime.fromtimestamp(stat.st_mtime)

                dimensions = {'width': 0, 'height': 0}
                try:
                    with Image.open(str(image_file)) as img:
                        dimensions = {'width': img.width, 'height': img.height}
                except Exception as img_error:
                    pass

                metadata = extract_metadata(str(image_file))

                rel_path = str(image_file.relative_to(OUTPUTS_DIR)).replace('\\', '/')

                image_info = {
                    'id': base64.urlsafe_b64encode(str(image_file).encode()).decode()[:16],
                    'filename': image_file.name,
                    'path': f'/api/image/{base64.urlsafe_b64encode(rel_path.encode()).decode()}',
                    'type': image_type,
                    'thumbnail': f'/api/thumb/{base64.urlsafe_b64encode(rel_path.encode()).decode()}',
                    'created_at': created_time.isoformat(),
                    'size': stat.st_size,
                    'dimensions': dimensions,
                    'metadata': metadata
                }

                images.append(image_info)

            except Exception as e:
                print(f"Error processing {image_file}: {e}")
                continue

    images.sort(key=lambda x: x['created_at'], reverse=True)
    
    _image_cache = {'images': images, 'mtime': dir_mtime}
    _cache_timestamp = time.time()
    return images

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/images')
def get_images():
    image_type = request.args.get('type')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '').lower()
    images = scan_images()

    if image_type and image_type != 'all':
        images = [img for img in images if img['type'] == image_type]

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

    total = len(images)
    total_pages = (total + limit - 1) // limit
    start = (page - 1) * limit
    end = start + limit

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
                'date_range': {
                    'min': min([img['created_at'] for img in images]) if images else None,
                    'max': max([img['created_at'] for img in images]) if images else None
                }
            }
        }
    })

@app.route('/api/image/<path:encoded_path>')
def get_image(encoded_path):
    try:
        rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        image_path = safe_resolve_path(rel_path)

        if not image_path.exists():
            abort(404)

        if image_path.stat().st_size > MAX_FILE_SIZE:
            abort(413)

        return send_from_directory(str(OUTPUTS_DIR), rel_path)

    except Exception as e:
        print(f"Error serving image: {e}")
        abort(500)

@app.route('/api/thumb/<path:encoded_path>')
def get_thumbnail(encoded_path):
    try:
        rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        image_path = safe_resolve_path(rel_path)

        if not image_path.exists():
            abort(404)

        return send_from_directory(str(OUTPUTS_DIR), rel_path)

    except Exception as e:
        print(f"Error serving thumbnail: {e}")
        abort(500)

@app.route('/api/image/<path:encoded_path>/meta')
def get_image_meta(encoded_path):
    try:
        rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        image_path = safe_resolve_path(rel_path)

        if not image_path.exists():
            abort(404)

        stat = image_path.stat()
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
        print(f"Error getting metadata: {e}")
        abort(500)

@app.route('/api/download/<path:encoded_path>')
def download_image(encoded_path):
    try:
        rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        image_path = safe_resolve_path(rel_path)

        if not image_path.exists():
            abort(404)

        if image_path.stat().st_size > MAX_FILE_SIZE:
            abort(413)

        return send_from_directory(
            str(OUTPUTS_DIR),
            rel_path,
            as_attachment=True,
            download_name=image_path.name
        )

    except Exception as e:
        print(f"Error downloading image: {e}")
        abort(500)

@app.route('/api/rename', methods=['POST'])
def rename_image():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400

        encoded_path = data.get('path')
        new_name = data.get('newName')

        if not encoded_path or not new_name:
            return jsonify({'success': False, 'error': '缺少必要参数'}), 400

        if len(new_name) > 50:
            return jsonify({'success': False, 'error': '名称长度不能超过50个字符'}), 400

        if encoded_path.startswith('/api/image/'):
            encoded_path = encoded_path[11:]
            print(f"[Server] Rename: Extracted encoded path: {encoded_path}")

        rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        old_path = safe_resolve_path(rel_path)

        if not old_path.exists():
            return jsonify({'success': False, 'error': '文件不存在'}), 404

        if not old_path.is_file():
            return jsonify({'success': False, 'error': '路径不是文件'}), 400

        parent_dir = old_path.parent
        new_path = parent_dir / new_name

        if new_path.exists():
            return jsonify({'success': False, 'error': '该名称已存在'}), 409

        old_path.rename(new_path)
        print(f"[Server] Renamed: {old_path.name} -> {new_name}")
        # 替换原来的 scan_images(force_refresh=True)
        # 改为增量更新缓存
        new_rel_path = str(new_path.relative_to(OUTPUTS_DIR)).replace('\\', '/')
        update_cache_after_rename(rel_path, new_rel_path, new_path)

        new_info = build_image_info_from_path(new_path, new_rel_path)

        return jsonify({
            'success': True,
            'message': '重命名成功',
            'oldName': old_path.name,
            'newName': new_name,
            'data': new_info
        })


    except Exception as e:
        print(f"[Server] Rename error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete_image():
    try:
        data = request.get_json(silent=True)
        
        if not data:
            return jsonify({'success': False, 'error': '无效的请求数据'}), 400

        encoded_path = data.get('path')
        if not encoded_path:
            return jsonify({'success': False, 'error': '缺少文件路径'}), 400

        mode = data.get('mode', 'hard')

        try:
            if encoded_path.startswith('/api/image/'):
                encoded_path = encoded_path[11:]
            
            rel_path = base64.urlsafe_b64decode(encoded_path.encode()).decode()
        except Exception as decode_error:
            return jsonify({'success': False, 'error': f'路径编码错误: {str(decode_error)}'}), 400

        image_path = safe_resolve_path(rel_path)

        if not image_path.exists() or not image_path.is_file():
            return jsonify({'success': False, 'error': '文件不存在'}), 404

        if mode == 'soft':
            moved = move_to_trash(image_path)
            if not moved:
                return jsonify({'success': False, 'error': '移入回收站失败'}), 500

            update_cache_after_delete(rel_path)

            return jsonify({
                'success': True,
                'message': '已移入回收站',
                'mode': 'soft',
                'filename': image_path.name
            })
        else:
            # 硬删除：直接删除磁盘文件
            try:
                image_path.unlink()
            except PermissionError as pe:
                return jsonify({'success': False, 'error': f'权限不足，无法删除文件: {str(pe)}'}), 403
            except OSError as ose:
                return jsonify({'success': False, 'error': f'系统错误，无法删除文件: {str(ose)}'}), 500

            update_cache_after_delete(rel_path)

            return jsonify({
                'success': True,
                'message': '删除成功',
                'mode': 'hard',
                'filename': image_path.name
            })

    except Exception as e:
        import traceback
        print(f"[Server] Delete error: {e}")
        print(f"[Server] Traceback: {traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/stats')
def get_stats():
    images = scan_images()

    type_counts = {}
    for img in images:
        img_type = img['type']
        type_counts[img_type] = type_counts.get(img_type, 0) + 1

    return jsonify({
        'success': True,
        'data': {
            'total': len(images),
            'by_type': type_counts
        }
    })

@app.route('/api/trash/list')
def get_trash_list():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '').lower()

    trash_items = list_trash()

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
        trash_file = TRASH_DIR / entry['trash_name']
        info = None
        if trash_file.exists():
            info = build_image_info_from_path(trash_file, f".trash/{entry['trash_name']}")
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
    try:
        data = request.get_json()
        if not data or 'trash_name' not in data:
            return jsonify({'success': False, 'error': '缺少参数 trash_name'}), 400

        trash_name = data['trash_name']
        success = restore_from_trash(trash_name)

        if success:
            return jsonify({'success': True, 'message': '恢复成功'})
        else:
            return jsonify({'success': False, 'error': '恢复失败，文件可能已损坏'}), 500

    except Exception as e:
        print(f"[Server] Restore error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trash/delete', methods=['POST'])
def delete_trash_item():
    try:
        data = request.get_json()
        if not data or 'trash_name' not in data:
            return jsonify({'success': False, 'error': '缺少参数 trash_name'}), 400

        trash_name = data['trash_name']
        manifest = load_trash_manifest()
        updated = [e for e in manifest if e['trash_name'] != trash_name]

        if len(updated) == len(manifest):
            return jsonify({'success': False, 'error': '未找到该文件'}), 404

        trash_file = TRASH_DIR / trash_name
        if trash_file.exists():
            trash_file.unlink()

        save_trash_manifest(updated)
        return jsonify({'success': True, 'message': '已彻底删除'})

    except Exception as e:
        print(f"[Server] Trash delete error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trash/empty', methods=['POST'])
def empty_trash_handler():
    try:
        empty_trash()
        return jsonify({'success': True, 'message': '回收站已清空'})
    except Exception as e:
        print(f"[Server] Empty trash error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/trash/count')
def get_trash_count():
    manifest = load_trash_manifest()
    count = sum(1 for e in manifest if (TRASH_DIR / e['trash_name']).exists())
    return jsonify({
        'success': True,
        'data': {'count': count}
    })

# Trash management helper functions
def move_to_trash(image_path: Path) -> bool:
    """Move a file to the trash directory and update manifest."""
    ensure_trash_dir()
    import shutil
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    new_name = f"{image_path.stem}_{timestamp}{image_path.suffix}"
    dest = TRASH_DIR / new_name
    try:
        shutil.move(str(image_path), str(dest))
        manifest = load_trash_manifest()
        manifest.append({
            'original_path': str(image_path.relative_to(OUTPUTS_DIR).as_posix()),
            'trash_name': new_name,
            'timestamp': timestamp
        })
        save_trash_manifest(manifest)
        return True
    except Exception as e:
        print(f"Error moving to trash: {e}")
        return False

def ensure_trash_dir():
    TRASH_DIR.mkdir(parents=True, exist_ok=True)

def load_trash_manifest() -> list:
    if TRASH_MANIFEST.exists():
        with open(TRASH_MANIFEST, 'r') as f:
            return json.load(f)
    return []

def save_trash_manifest(manifest: list):
    with open(TRASH_MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)

def restore_from_trash(trash_name: str) -> bool:
    """Restore a file from trash to its original location."""
    manifest = load_trash_manifest()
    for entry in manifest:
        if entry['trash_name'] == trash_name:
            src = TRASH_DIR / trash_name
            dest = OUTPUTS_DIR / entry['original_path']
            if not src.exists():
                return False
            import shutil
            shutil.move(str(src), str(dest))
            manifest.remove(entry)
            save_trash_manifest(manifest)
            return True
    return False

def empty_trash():
    import shutil
    if TRASH_DIR.exists():
        shutil.rmtree(str(TRASH_DIR))
    ensure_trash_dir()
    save_trash_manifest([])

def list_trash() -> list:
    manifest = load_trash_manifest()
    for entry in manifest:
        trash_file = TRASH_DIR / entry['trash_name']
        entry['exists'] = trash_file.exists()
    return manifest

def build_image_info_from_path(image_path: Path, rel_path: str) -> dict:
    """根据文件路径构建 image_info 字典，用于缓存"""
    try:
        stat = image_path.stat()
        created_time = datetime.fromtimestamp(stat.st_mtime)
        dimensions = {'width': 0, 'height': 0}
        try:
            with Image.open(str(image_path)) as img:
                dimensions = {'width': img.width, 'height': img.height}
        except Exception:
            pass
        metadata = extract_metadata(str(image_path))

        rel_path_posix = rel_path.replace('\\', '/')
        return {
            'id': base64.urlsafe_b64encode(str(image_path).encode()).decode()[:16],
            'filename': image_path.name,
            'path': f'/api/image/{base64.urlsafe_b64encode(rel_path_posix.encode()).decode()}',
            'type': get_image_type(image_path.parent.name),
            'thumbnail': f'/api/thumb/{base64.urlsafe_b64encode(rel_path_posix.encode()).decode()}',
            'created_at': created_time.isoformat(),
            'size': stat.st_size,
            'dimensions': dimensions,
            'metadata': metadata
        }
    except Exception as e:
        print(f"Error building image info for {image_path}: {e}")
        return None


def update_cache_after_delete(rel_path: str):
    """删除缓存中的指定图片条目"""
    global _image_cache, _cache_dirty
    if 'images' not in _image_cache:
        return
    target_encoded = base64.urlsafe_b64encode(rel_path.encode()).decode()
    original_len = len(_image_cache['images'])
    _image_cache['images'] = [
        img for img in _image_cache['images']
        if not img['path'].endswith(target_encoded)
    ]
    if len(_image_cache['images']) != original_len:
        _cache_dirty = True
        print(f"[Cache] Removed image: {rel_path}")


def update_cache_after_rename(old_rel_path: str, new_rel_path: str, new_full_path: Path):
    """重命名后更新缓存中的图片条目"""
    global _image_cache, _cache_dirty
    if 'images' not in _image_cache:
        return
    target_encoded = base64.urlsafe_b64encode(old_rel_path.encode()).decode()
    for i, img in enumerate(_image_cache['images']):
        if img['path'].endswith(target_encoded):
            new_info = build_image_info_from_path(new_full_path, new_rel_path)
            if new_info:
                _image_cache['images'][i] = new_info
                _cache_dirty = True
                print(f"[Cache] Updated image: {old_rel_path} -> {new_rel_path}")
            break

if __name__ == '__main__':
    import os
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        print("=" * 60)
        print("SD Gallery - AI图片展示系统")
        print("=" * 60)
        print()
        print("检查Python环境...")
        print("✓ Python环境正常")
        print()
        print(f"outputs目录: {OUTPUTS_DIR.absolute()}")
        print()
        print("正在启动服务...")
        print("✓ 服务启动成功")
        print()
        print("=" * 60)
        print("访问地址: http://localhost:5000")
        print("按 Ctrl+C 停止服务")
        print("=" * 60)
        print()

    app.run(host='0.0.0.0', port=5000, debug=True)
