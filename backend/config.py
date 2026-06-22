"""SD Gallery 配置模块 - 定义项目路径和服务配置"""

import socket
from pathlib import Path


# 项目路径配置
PROJECT_ROOT = Path(__file__).parent.parent  # sd-gallery directory
WEBUI_ROOT = PROJECT_ROOT.parent  # sd-webui-aki-v4.11.1-cu128 directory

# 目录配置
OUTPUTS_DIR = WEBUI_ROOT / 'outputs'
TRASH_DIR = OUTPUTS_DIR / '.trash'
TRASH_MANIFEST = TRASH_DIR / 'manifest.json'
NSFW_KEYWORDS_FILE = PROJECT_ROOT / 'nsfw_keywords.json'
LORA_MAPPINGS_FILE = PROJECT_ROOT / 'lora_mappings.json'
THUMBS_DIR = PROJECT_ROOT / '.thumbs'
LOGS_DIR = PROJECT_ROOT / 'logs'

# 服务配置
HOST = '0.0.0.0'
PORT = 5000
DEBUG = True

# 日志配置
LOG_FILE = 'sd-gallery'
LOG_RETAIN_DAYS = 7
LOG_MAX_SIZE_MB = 10
LOG_MAX_FILES = 100


def get_local_ip():
    """获取本机局域网IP地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return None
