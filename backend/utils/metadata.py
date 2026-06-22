"""Metadata extraction utilities for SD Gallery images."""

import re
import unicodedata
from PIL import Image

from .logger import get_logger

logger = get_logger('sd-gallery.metadata')


def normalize_model_name(model_name):
    """Normalize model name for intelligent grouping.

    Applies the following transformations:
    1. Unify punctuation (Chinese → English commas, full-width → half-width brackets)
    2. Remove version suffixes (_V5, _v4, _V3, -v2, etc.)
    3. Normalize whitespace
    4. Convert to lowercase for comparison

    Args:
        model_name: Raw model name string

    Returns:
        str: Normalized model name for grouping comparison
    """
    if not model_name:
        return ''

    normalized = model_name

    # 1. Unify Chinese/English punctuation
    punctuation_map = {
        '，': ',',   # Chinese comma → English comma
        '。': '.',   # Chinese period → English period
        '【': '[',   # Full-width left bracket → half-width
        '】': ']',   # Full-width right bracket → half-width
        '（': '(',   # Full-width left parenthesis → half-width
        '）': ')',   # Full-width right parenthesis → half-width
        '：': ':',   # Full-width colon → half-width
        '；': ';',   # Full-width semicolon → half-width
        '"': '"',   # Left double quote → straight
        '"': '"',   # Right double quote → straight
        ''': "'",   # Left single quote → straight
        ''': "'",   # Right single quote → straight
        'Ａ': 'A',  # Full-width letters (A-Z)
        'Ｂ': 'B',
        'Ｃ': 'C',
        'Ｄ': 'D',
        'Ｅ': 'E',
        'Ｆ': 'F',
        'Ｇ': 'G',
        'Ｈ': 'H',
        'Ｉ': 'I',
        'Ｊ': 'J',
        'Ｋ': 'K',
        'Ｌ': 'L',
        'Ｍ': 'M',
        'Ｎ': 'N',
        'Ｏ': 'O',
        'Ｐ': 'P',
        'Ｑ': 'Q',
        'Ｒ': 'R',
        'Ｓ': 'S',
        'Ｔ': 'T',
        'Ｕ': 'U',
        'Ｖ': 'V',
        'Ｗ': 'W',
        'Ｘ': 'X',
        'Ｙ': 'Y',
        'Ｚ': 'Z',
        'ａ': 'a',  # Full-width letters (a-z)
        'ｂ': 'b',
        'ｃ': 'c',
        'ｄ': 'd',
        'ｅ': 'e',
        'ｆ': 'f',
        'ｇ': 'g',
        'ｈ': 'h',
        'ｉ': 'i',
        'ｊ': 'j',
        'ｋ': 'k',
        'ｌ': 'l',
        'ｍ': 'm',
        'ｎ': 'n',
        'ｏ': 'o',
        'ｐ': 'p',
        'ｑ': 'q',
        'ｒ': 'r',
        'ｓ': 's',
        'ｔ': 't',
        'ｕ': 'u',
        'ｖ': 'v',
        'ｗ': 'w',
        'ｘ': 'x',
        'ｙ': 'y',
        'ｚ': 'z',
    }

    for char, replacement in punctuation_map.items():
        normalized = normalized.replace(char, replacement)

    # 2. Remove version suffixes: _V5, _v5, _V4, -v4, v3, etc.
    # Matches patterns like: _V5, _v5, -V4, -v4, V3, v3 at end of name
    normalized = re.sub(r'[_\-]?[Vv]\d+[\.\-]?\d*$', '', normalized)

    # Also remove common version patterns like "V5", "v4" at end (with word boundary)
    normalized = re.sub(r'\s+[Vv]\d+[\.\-]?\d*$', '', normalized)

    # 3. Normalize whitespace (multiple spaces → single space, trim)
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized.lower() if normalized else ''


def extract_loras_from_prompt(prompt):
    """Extract LoRA/LyCORIS names from a prompt string.

    Parses <lora:name:weight> and <lyco:name:weight> tags from the prompt.
    Returns a deduplicated list of LoRA names (case-insensitive dedup,
    preserving the first-seen casing).

    Args:
        prompt: Prompt string that may contain LoRA/LyCORIS tags

    Returns:
        list: Deduplicated list of LoRA/LyCORIS names found in the prompt
    """
    if not prompt:
        return []

    # Match <lora:name:weight> or <lyco:name:weight> — weight is optional
    pattern = re.compile(r'<(lora|lyco):([^:>]+)(?::(\d*\.?\d*))?>', re.IGNORECASE)
    matches = pattern.findall(prompt)

    # Deduplicate case-insensitively, preserving first-seen casing
    seen = set()
    loras = []
    for match in matches:
        name = match[1].strip()
        name_lower = name.lower()
        if name_lower not in seen:
            seen.add(name_lower)
            loras.append(name)

    return loras


def extract_metadata(image_path):
    """Extract metadata from an image file.

    Args:
        image_path: Path to the image file

    Returns:
        dict: Metadata dictionary containing prompt, negative_prompt, steps, sampler, etc.
    """
    metadata = {
        'prompt': '',
        'negative_prompt': '',
        'steps': None,
        'sampler': '',
        'cfg_scale': None,
        'seed': None,
        'size': '',
        'model_hash': '',
        'model_name': '',
        'model_normalized': '',  # Normalized version for intelligent grouping
        'loras': [],  # LoRA/LyCORIS names extracted from prompts
        'denoising_strength': None,
        'clip_skip': None,
        'schedule_type': '',
        'version': '',
        'hires_upscale': None,
        'hires_upscaler': ''
    }

    try:
        geninfo = None

        # Method 1: Use PIL to read image metadata (most reliable)
        try:
            with Image.open(image_path) as img:
                # Get size from metadata first
                metadata['size'] = f"{img.width}x{img.height}"

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

        # Method 2: Fallback to raw binary search
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

        # Use 'Negative prompt:' as separator
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
            # 没有 "Negative prompt:" 分隔符（常见于图生图）
            # 尝试从 prompt 中查找 "Steps:" 来分离参数
            prompt_text = metadata['prompt']
            steps_idx = prompt_text.find('Steps:')
            if steps_idx > 0:
                # prompt 文本中包含参数部分，从 "Steps:" 处分离
                params_line = prompt_text[steps_idx:]
                metadata['prompt'] = prompt_text[:steps_idx].strip().rstrip(',')
            elif prompt_text.startswith('Steps:'):
                # 整个 geninfo 就是参数列表（无提示词文本）
                params_line = prompt_text
                metadata['prompt'] = ''
            else:
                params_line = ''

        # Extract LoRA/LyCORIS names from both prompts
        loras_from_pos = extract_loras_from_prompt(metadata['prompt'])
        loras_from_neg = extract_loras_from_prompt(metadata['negative_prompt'])
        loras_seen = set()
        all_loras = []
        for lora_name in loras_from_pos + loras_from_neg:
            name_lower = lora_name.lower()
            if name_lower not in loras_seen:
                loras_seen.add(name_lower)
                all_loras.append(lora_name)
        metadata['loras'] = all_loras

        # Parse parameters
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

        if 'Clip skip:' in params_line:
            clip_part = params_line.split('Clip skip:')[1]
            if ',' in clip_part:
                clip_match = clip_part.split(',')[0].strip()
            else:
                clip_match = clip_part.strip().split()[0] if clip_part.strip() else ''
            try:
                metadata['clip_skip'] = int(clip_match)
            except:
                pass

        if 'Schedule type:' in params_line:
            sched_part = params_line.split('Schedule type:')[1]
            if ',' in sched_part:
                metadata['schedule_type'] = sched_part.split(',')[0].strip()
            else:
                metadata['schedule_type'] = sched_part.strip().split()[0] if sched_part.strip() else ''

        if 'Denoising strength:' in params_line:
            denoise_part = params_line.split('Denoising strength:')[1]
            if ',' in denoise_part:
                denoise_match = denoise_part.split(',')[0].strip()
            else:
                denoise_match = denoise_part.strip().split()[0] if denoise_part.strip() else ''
            try:
                metadata['denoising_strength'] = float(denoise_match)
            except:
                pass

        if 'Version:' in params_line:
            version_part = params_line.split('Version:')[1]
            if ',' in version_part:
                metadata['version'] = version_part.split(',')[0].strip()
            else:
                metadata['version'] = version_part.strip().split()[0] if version_part.strip() else ''

        if 'Hires upscale:' in params_line:
            hires_part = params_line.split('Hires upscale:')[1]
            if ',' in hires_part:
                hires_match = hires_part.split(',')[0].strip()
            else:
                hires_match = hires_part.strip().split()[0] if hires_part.strip() else ''
            try:
                metadata['hires_upscale'] = float(hires_match)
            except:
                pass

        if 'Hires upscaler:' in params_line:
            hires_up_part = params_line.split('Hires upscaler:')[1]
            if ',' in hires_up_part:
                metadata['hires_upscaler'] = hires_up_part.split(',')[0].strip()
            else:
                metadata['hires_upscaler'] = hires_up_part.strip().split()[0] if hires_up_part.strip() else ''

        if 'Model hash:' in params_line:
            hash_part = params_line.split('Model hash:')[1]
            if ',' in hash_part:
                metadata['model_hash'] = hash_part.split(',')[0].strip()
            else:
                metadata['model_hash'] = hash_part.strip().split()[0] if hash_part.strip() else ''

        if 'Model:' in params_line:
            # 使用正则表达式智能提取模型名称
            # 匹配 Model: 后的内容，直到遇到 ",参数名" 或 " 参数名"
            # SD WebUI参数格式：Model: xxx, ParamName: value 或 Model: xxx,ParamName: value
            # 这样可以正确处理包含逗号的模型名称
            match = re.search(r'Model:\s*(.+?)(?:,\s*[A-Z][a-z]|\s*$)', params_line)
            if match:
                metadata['model_name'] = match.group(1).strip()
            else:
                # Fallback: 如果正则没匹配到，使用原始方法
                model_part = params_line.split('Model:')[1]
                if ',' in model_part:
                    metadata['model_name'] = model_part.split(',')[0].strip()
                else:
                    metadata['model_name'] = model_part.strip().split()[0] if model_part.strip() else ''

            # 计算规范化后的模型名称（用于智能分组）
            if metadata['model_name']:
                metadata['model_normalized'] = normalize_model_name(metadata['model_name'])

    except Exception as e:
        logger.error(f"Error extracting metadata from {image_path}: {e}")

    return metadata