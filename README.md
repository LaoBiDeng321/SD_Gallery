# SD Gallery - AI 图片展示系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)

> 为 Stable Diffusion 用户打造的现代化图片画廊管理工具，告别文件夹翻找，优雅管理你的 AI 生成作品。

##  背景

Stable Diffusion（SD）作为当下最流行的 AI 图像生成工具，产出的图片数量通常非常庞大。默认情况下，SD 将所有输出图片（txt2img、img2img、extras 等）保存在 `outputs` 目录中，以日期和生成类型分散存储。用户若要回顾或筛选生成的作品，只能手动在层层文件夹中翻找，无法按参数（Prompt、Seed、Sampler 等）搜索，也无法快速收藏或浏览大图，体验极不友好。

**SD Gallery** 应运而生——它直接读取 SD 的 `outputs` 目录，自动扫描所有图片，提取生成参数（Prompt、Negative Prompt、Seed、Sampler、CFG Scale 等），并提供网页端画廊界面，让你能够像使用专业图片管理软件一样轻松管理 AI 作品。

##  项目目的

- **打破文件夹壁垒**：无视 SD 原始的日期/类型嵌套目录，以统一的视图展示所有图片。
- **参数自动提取**：从图片元数据中读取 SD 生成参数（无需额外配置），并支持基于参数的搜索。
- **高效筛选与检索**：按图片类型（文生图/图生图/后期处理）、时间范围、文件名/参数关键词快速定位目标图片。
- **流畅的浏览体验**：网格/列表双视图、懒加载、无限滚动分页、深色/浅色主题、图片灯箱（可复制参数、下载原图）。
- **便捷的管理操作**：收藏图片、重命名、删除（同步删除磁盘文件）。
- **完全本地部署**：数据不上传任何服务器，保证隐私安全。

##  项目结构

```
sd-gallery/
├── css/                      # 样式文件
│   ├── base.css              # 全局变量、重置样式、滚动条等
│   ├── layout.css            # 布局（导航栏、侧边栏、主区域）
│   ├── components.css        # 组件样式（按钮、卡片、输入框、模态框等）
│   ├── themes.css            # 深色/浅色主题变量及切换动画
│   └── pager.css             # 分页组件样式
├── js/                       # 前端脚本
│   ├── api.js                # API 客户端（封装 fetch 请求、缓存）
│   ├── app.js                # 应用入口（初始化视图、菜单切换）
│   ├── filter.js             # 筛选管理器（持久化筛选状态）
│   ├── gallery.js            # 画廊核心逻辑（加载图片、渲染、收藏、重命名、删除）
│   ├── lightbox.js           # 灯箱组件（大图展示、导航、参数显示）
│   ├── modal.js              # 模态框组件（重命名、删除确认）
│   ├── pager.js              # 分页器（页数导航、页面记忆）
│   ├── responsive.js         # 响应式管理器（根据屏幕尺寸调整每页数量）
│   └── theme.js              # 主题管理器（深色/浅色切换）
├── index.html                # 主页面
├── server.py                 # Flask 后端服务（图片扫描、元数据提取、文件操作 API）
├── requirements.txt          # Python 依赖
├── 启动.bat                  # Windows 快速启动脚本
└── README.md                 # 本文档
```

##  功能介绍

### 1. 自动扫描 SD 输出目录
- 默认读取 `../outputs`（即 SD WebUI 所在目录的 `outputs` 文件夹）。
- 支持递归扫描，自动识别图片类型：
  - `txt2img-images` / `txt2img-grids` → 文生图
  - `img2img-images` / `img2img-grids` → 图生图
  - `extras-images` / `extras` → 后期处理

### 2. 元数据提取
- 从 PNG/JPEG 等文件中读取 SD 嵌入的生成参数（`parameters` 块）。
- 提取内容：Prompt、Negative Prompt、Steps、Sampler、CFG Scale、Seed、Size、Model Hash、Model Name。
- 若无参数，相应字段留空，不影响浏览。

### 3. 多维度筛选
| 筛选方式       | 说明                                       |
| -------------- | ------------------------------------------ |
| **图片类型**   | 全部 / 文生图 / 图生图 / 后期处理          |
| **时间范围**   | 全部 / 今天 / 本周 / 本月                  |
| **收藏夹**     | 仅显示已收藏图片                           |

筛选状态自动保存到 LocalStorage，下次打开页面无需重新设置。

### 4. 画廊视图
- **网格视图**：卡片式展示，鼠标悬浮显示收藏/查看按钮。
- **列表视图**：紧凑型列表，展示更多元数据（尺寸、Seed、采样器等），并直接提供重命名、删除、收藏、查看按钮。
- 视图模式自动记忆。

### 5. 图片灯箱（Lightbox）
- 点击任意图片打开大图预览。
- 导航：上一张/下一张（支持键盘左右键）。
- 显示详细参数：Prompt、Negative Prompt、种子、采样器、步数、CFG、文件大小、创建时间等。
- 一键复制生成参数到剪贴板。
- 一键下载原图。
- 收藏/取消收藏实时同步。
- 当切换到超出当前页的图片时，自动请求下一页数据并无缝继续浏览。

### 6. 文件管理
- **重命名**：修改图片文件名（支持中文、英文、数字及常见符号），修改后自动刷新画廊并更新收藏记录。
- **删除**：删除图片文件（同时从磁盘删除），收藏列表同步清理。
- 所有操作均有确认对话框，防止误操作。

### 7. 分页与性能
- 后端分页，避免一次性加载过多图片导致浏览器卡顿。
- 每页数量根据屏幕分辨率自动计算（虽然可能不是很合理）。
- 图片懒加载（Intersection Observer），滚动到可视区域才加载。
- 服务端图片缓存 + 文件修改时间检测，扫描效率高。
- 首个加载页显示“正在初始化图片库，请耐心等待...”提示，避免空屏。

### 8. 界面主题
- 浅色 / 深色主题，支持跟随系统偏好。
- 主题偏好保存到 LocalStorage。
- 所有组件均适配主题变量（背景模糊、边框、阴影等）。

##  如何使用

### 环境要求
- **Python 3.10+**（推荐 3.10 ~ 3.12）
- **Stable Diffusion WebUI**（Automatic1111 或其他兼容 `outputs` 目录结构的版本）
- 现代浏览器（Chrome / Firefox / Edge / Safari）

### 安装与运行

1. **克隆或下载本仓库** 到 SD WebUI 所在机器的任意位置。
克隆项目：

   ```bash
    git clone https://github.com/LaoBiDeng321/SD_Gallery.git
    cd SD_Gallery
   ```

2. **安装 Python 依赖**（建议使用虚拟环境）：
   ```bash
   pip install -r requirements.txt
   ```

3. **确认 `outputs` 目录路径**  
   默认情况下，`server.py` 会寻找 `../outputs`（即项目父目录下的 outputs）。如果你的 SD WebUI 不在同级目录，可以修改 `server.py` 中的 `OUTPUTS_DIR` 变量：
   ```python
   OUTPUTS_DIR = Path(r"D:\stable-diffusion-webui\outputs")   # Windows 示例
   # 或
   OUTPUTS_DIR = Path("/home/user/stable-diffusion-webui/outputs")  # Linux 示例
   ```

4. **启动服务**：
   - Windows: 双击 `启动.bat`。
   - 其他系统: 在终端中执行 `python server.py`。

   启动成功后终端会显示：
   ```
   ============================================================
   SD Gallery - AI图片展示系统
   ============================================================

   outputs目录: D:\stable-diffusion-webui\outputs

   正在启动服务...
   ✓ 服务启动成功

   ============================================================
   访问地址: http://localhost:5000
   按 Ctrl+C 停止服务
   ============================================================
   ```

5. **访问画廊**：打开浏览器，访问 `http://localhost:5000`。

### 首次加载说明
- 第一次访问时，服务端会扫描 `outputs` 目录下所有图片并提取元数据，**耗时取决于图片数量**（几千张可能需要几秒）。页面上会显示“正在初始化图片库，请耐心等待...”。
- 后续刷新或重启服务，如果 `outputs` 目录没有新增/删除/修改文件，则直接使用缓存，加载极快。
- 当你通过 SD WebUI 生成了新图片后，需要刷新页面（或稍等几秒），服务端会自动检测到变化并重新扫描。

##  配置说明

所有配置均位于 `server.py` 顶部，可按需修改：

| 变量名               | 默认值                        | 说明                                 |
| -------------------- | ----------------------------- | ------------------------------------ |
| `OUTPUTS_DIR`        | `../outputs`                  | SD 输出目录的绝对或相对路径           |
| `MAX_FILE_SIZE`      | `50 * 1024 * 1024` (50MB)     | 可预览/下载的最大图片大小（字节）     |
| `ALLOWED_EXTENSIONS` | `{'.png', '.jpg', '.jpeg', '.webp', '.gif'}` | 支持的图片格式 |
| `CACHE_DURATION`     | `60` 秒                       | 文件系统变化检测间隔                  |

##  技术栈

- **后端**: Flask 2.3.3 + Pillow（图像处理）
- **前端**: 原生 JavaScript（ES6+）、CSS3（变量、Grid、Flex、动画）
- **通信**: Fetch API + XMLHttpRequest（文件操作）
- **存储**: LocalStorage（用户偏好、收藏、筛选状态）

##  许可证

本项目采用 **MIT 许可证**。  
你可以自由使用、修改、分发、甚至用于商业目的，但需保留原始版权声明。

##  贡献

欢迎提交 Issue 和 Pull Request！  
如果你有更好的功能建议（例如支持更多 SD 后端、批量导出参数为 CSV、自动标记 NSFW 等），请随时提出。

##  常见问题

**Q: 为什么有些图片没有显示 Prompt 等参数？**  
A: 可能原因：
- 图片不是由 SD WebUI 生成的（或参数被其他软件擦除）。
- 图片格式不支持元数据（例如某些 WebP 没有嵌入参数）。
- 服务端提取逻辑有遗漏（请提交 Issue 并提供示例图片）。

**Q: 可以修改图片展示的排序方式吗？**  
A: 目前固定按创建时间倒序（最新在上）。后续版本会增加“按文件名”、“按尺寸”等排序选项。

**Q: 支持远程访问（局域网/公网）吗？**  
A: 默认只监听 `0.0.0.0:5000`，所以同局域网设备可通过 `http://你的IP:5000` 访问。如需公网访问，请配置反向代理并注意安全。

**Q: 删除图片后能否恢复？**  
A: 删除操作会直接从磁盘删除文件，**不可恢复**。请谨慎操作，或定期备份 `outputs` 目录。

**Q: 与 SD Next / ComfyUI 兼容吗？**  
A: 不完全兼容。本项目基于 Automatic1111 的目录结构和元数据格式开发。如果你使用其他 SD 前端，可能需要修改 `server.py` 中的扫描逻辑和元数据提取方式。

**Q: 启动时报错 `PermissionError`？**  
A: 请确保你有读取 `outputs` 目录及其子文件的权限，以及对于重命名/删除操作所在目录的写权限。Windows 下建议以普通用户运行即可，无需管理员。

---

**Enjoy your AI art gallery!**   
如果觉得本项目有帮助，欢迎给个 ⭐Star 支持一下～
