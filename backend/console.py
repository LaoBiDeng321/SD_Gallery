"""控制台输出样式模块 - 提供彩色输出和格式化打印功能"""

import sys
import shutil


# ANSI Color Codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

    # Foreground
    BLACK = '\033[30m'
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'

    # Bright Foreground
    BRIGHT_BLACK = '\033[90m'
    BRIGHT_RED = '\033[91m'
    BRIGHT_GREEN = '\033[92m'
    BRIGHT_YELLOW = '\033[93m'
    BRIGHT_BLUE = '\033[94m'
    BRIGHT_MAGENTA = '\033[95m'
    BRIGHT_CYAN = '\033[96m'
    BRIGHT_WHITE = '\033[97m'


def get_terminal_width():
    """获取终端宽度，默认50"""
    try:
        return shutil.get_terminal_size().columns
    except Exception:
        return 50


def center_text(text, width):
    """将文本居中显示"""
    # 去除ANSI颜色码计算实际长度
    import re
    clean_text = re.sub(r'\033\[[0-9;]*m', '', text)
    padding = max(0, (width - len(clean_text)) // 2)
    return ' ' * padding + text


def display_width(text):
    """计算文本在终端中的实际显示宽度（处理中文双宽度字符）"""
    import unicodedata
    width = 0
    for ch in text:
        if unicodedata.east_asian_width(ch) in ('F', 'W'):
            width += 2
        else:
            width += 1
    return width


def clean_length(text):
    """计算纯文本长度（去除ANSI颜色码）"""
    import re
    return display_width(re.sub(r'\033\[[0-9;]*m', '', text))


def print_banner(outputs_dir, logs_dir, local_ip=None):
    """打印启动横幅（双层边框）

    Args:
        outputs_dir: 图片输出目录路径
        logs_dir: 日志目录路径
        local_ip: 局域网IP地址
    """
    width = get_terminal_width()

    if sys.stdout.isatty():
        c = {
            'cyan': Colors.CYAN,
            'green': Colors.GREEN,
            'dim': Colors.DIM,
            'bold': Colors.BOLD,
            'white': Colors.WHITE,
            'reset': Colors.RESET,
            'bb': Colors.BRIGHT_BLACK,
            'bg': Colors.BRIGHT_GREEN,
        }
    else:
        c = {k: '' for k in ['cyan', 'green', 'dim', 'bold', 'white', 'reset', 'bb', 'bg']}

    # 外层边框宽度（比终端宽少2，留左右边距）
    outer_width = width - 2
    inner_width = outer_width - 4  # 内层内容区（外框内缩2格每侧）

    # ── 外层边框（所有行统一宽度: outer_width + 2）──
    outer_top = '─' * outer_width
    outer_empty = f"{c['cyan']}│{c['reset']}{' ' * outer_width}{c['cyan']}│{c['reset']}"
    outer_bottom = '─' * outer_width

    # ── 内层边框（标题栏）──
    title = f"{c['bold']}SD Gallery{c['reset']} {c['dim']}- AI 图片展示系统{c['reset']}"
    title_len = clean_length(title)
    title_pad = max(0, (inner_width - 4 - title_len) // 2)  # -4为内框自身占位
    inner_border = '─' * (inner_width - 2)

    def print_centered(label, value, value_color=''):
        label_text = f"{c['dim']}{label}:{c['reset']}  {value_color}{value}{c['reset']}"
        total_len = clean_length(label_text)
        pad = inner_width - total_len
        left = pad // 2
        right = pad - left
        return f"{' ' * left}{label_text}{' ' * right}"

    def print_left(label):
        """左对齐标签"""
        indent = (inner_width // 4)
        return f"{' ' * indent}{c['dim']}{label}{c['reset']}"

    def print_left_link(prefix, text):
        """左对齐链接"""
        indent = (inner_width // 4)
        return f"{' ' * indent}  {c['green']}▶{c['reset']}  {prefix}   {c['bg']}{text}{c['reset']}"

    # ── 组装所有内层行 ──
    lines = []
    lines.append(f"┌{inner_border}┐")
    lines.append(f"│{' ' * title_pad}{title}{' ' * max(0, inner_width - 2 - title_pad - title_len)}│")
    lines.append(f"└{inner_border}┘")
    lines.append("")
    lines.append(print_centered("图片目录", str(outputs_dir), c['bb']))
    lines.append("")
    lines.append(print_centered("日志目录", str(logs_dir), c['bb']))
    lines.append("")
    lines.append(print_left("访问地址:"))
    lines.append(print_left_link("Local:", "http://localhost:5000"))
    if local_ip:
        lines.append(print_left_link("LAN:", f"http://{local_ip}:5000"))
    lines.append("")
    lines.append(print_left(f"按 {c['white']}Ctrl+C{c['dim']} 停止服务"))

    # ── 输出 ──
    print()
    print(f"{c['cyan']}╭{outer_top}╮{c['reset']}")
    print(outer_empty)

    for line in lines:
        print(f"{c['cyan']}│{c['reset']}  {line}{' ' * max(0, outer_width - 2 - clean_length(line))}{c['cyan']}│{c['reset']}")

    print(outer_empty)
    print(f"{c['cyan']}╰{outer_bottom}╯{c['reset']}")
    print()
