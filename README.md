# SD Gallery - AI图片展示系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)

> 为 Stable Diffusion 用户打造的现代化图片画廊管理工具，告别文件夹翻找，优雅管理你的 AI 生成作品。
> ** 重大更新（自嗨版）**：其实我已经把画廊服务跑进 WebUI 内部了——没错，就是那种不用单独 `python -m backend.app`、不用切端口、直接打开 SD WebUI 就能在专属 Tab 里逛画廊的丝滑体验 。Flask 后端通过 WSGIMiddleware 挂载在 FastAPI 上，共享一个端口，连 CORS 都不用配，优雅得一批。
>
> 然鹅……因为我是直接改的整合包代码，改到一半才发现这玩意儿怎么发 PR 啊（笑死，根本理不清 diff）。所以——
>
> **兄弟们目前还是将就用老版本吧** 🥹。新版的发布嘛……自己研究研究，**遥遥无期 ing** （懂的都懂）🤡🤝
>
> <details>
> <summary>🔧 给想自己动手的勇士（点开看技术细节）</summary>
>
> 核心思路：在 `extensions-builtin/sd-gallery/scripts/sd_gallery.py` 里用 `script_callbacks.on_ui_tabs` 注册一个 iframe Tab，再用 `on_app_started` 把 Flask app 通过 `WSGIMiddleware` 挂到 FastAPI 上。前端不用改，后端直接把 `OUTPUTS_DIR` 指向 WebUI 的 outputs 目录就好。
>
> 大概长这样：
> ```python
> from modules import script_callbacks
> from sd_gallery.backend.app import app as flask_app
> from fastapi.middleware.wsgi import WSGIMiddleware
>
> def on_app_started(demo, app):
>     app.mount("/sd-gallery", WSGIMiddleware(flask_app))
>
> def on_ui_tabs():
>     with gr.Blocks() as tab:
>         gr.HTML('<iframe src="/sd-gallery" style="width:100%;height:100vh;border:none;">')
>     return [(tab, "画廊", "sd-gallery-tab")]
>
> script_callbacks.on_app_started(on_app_started)
> script_callbacks.on_ui_tabs(on_ui_tabs)
> ```
>
> 就这，没了。但整合包的依赖、路径、各种边角料细节才是真正的 💩 山，自己体会吧 (doge)
>
> </details>


## 背景

Stable Diffusion（SD）作为当下最流行的 AI 图像生成工具，产出的图片数量通常非常庞大。默认情况下，SD 将所有输出图片（txt2img、img2img、extras 等）保存在 `outputs` 目录中，以日期和生成类型分散存储。**SD 本身并没有内置的画廊浏览功能**，用户若要回顾或筛选生成的作品，只能手动在层层文件夹中翻找：

- 无法按 Prompt、Seed、Sampler 等参数搜索
- 无法快速浏览大图
- 无法按图片类型（文生图/图生图/后期处理）统一筛选
- 无法在删除前预览确认，误删后无法找回
- 浏览体验极不友好，缺乏现代化的画廊界面

**SD Gallery** 应运而生——它直接读取 SD 的 `outputs` 目录，自动扫描所有图片，提取生成参数（Prompt、Negative Prompt、Seed、Sampler、CFG Scale 等），并提供网页端画廊界面，让你能够像使用专业图片管理软件一样轻松管理 AI 作品。

## 项目目的

- **打破文件夹壁垒**：无视 SD 原始的日期/类型嵌套目录，以统一的视图展示所有图片
- **参数自动提取**：从图片元数据中读取 SD 生成参数（无需额外配置），并支持基于参数的搜索
- **高效筛选与检索**：按图片类型、时间范围、关键词搜索快速定位目标图片
- **流畅的浏览体验**：网格/列表双视图、自适应分页、图片懒加载、深色/浅色主题、图片灯箱
- **便捷的管理操作**：重命名、删除（硬删除/软删除可选）
- **安全保护机制**：软删除模式将文件移入回收站，支持恢复和彻底删除，防止误操作
- **NSFW 内容管理**：基于关键词自动检测并模糊 NSFW 图片，可自定义关键词列表
- **完全本地部署**：数据不上传任何服务器，保证隐私安全

## 项目结构

```
sd-gallery/
├── css/ # 样式文件
│ ├── base.css # 全局变量、重置样式、滚动条等
│ ├── layout.css # 布局（导航栏、侧边栏、主区域）
│ ├── components.css # 组件样式（按钮、卡片、输入框、模态框等）
│ ├── themes.css # 深色/浅色主题变量及切换动画
│ └── pager.css # 分页组件样式
├── js/ # 前端脚本
│ ├── api.js # API 客户端（封装 fetch 请求、缓存）
│ ├── app.js # 应用入口（初始化视图、菜单切换）
│ ├── filter.js # 筛选管理器（持久化筛选状态）
│ ├── gallery.js # 画廊核心逻辑（加载、渲染、重命名、删除、乐观更新）
│ ├── lightbox.js # 灯箱组件（大图展示、导航、参数显示、跨页浏览）
│ ├── modal.js # 模态框组件（重命名、删除确认、提示）
│ ├── pager.js # 分页器（页数导航、页面记忆）
│ ├── responsive.js # 响应式管理器（根据屏幕尺寸调整每页数量）
│ ├── theme.js # 主题管理器（深色/浅色/跟随系统切换）
│ ├── nsfw.js # NSFW 检测器（关键词匹配、图片模糊处理）
│ ├── settings.js # 设置管理器（软删除开关、NSFW 显示开关、关键词管理）
│ └── trash-manager.js # 回收站管理器（恢复、彻底删除、清空）
├── index.html # 主页面
├── server.py # Flask 后端服务（图片扫描、元数据提取、API、回收站管理）
├── requirements.txt # Python 依赖
├── 启动.bat # Windows 快速启动脚本
├── run.sh # macOS\Linux 快速启动脚本
└── README.md # 本文档
```

## 功能介绍

### 1. 自动扫描 SD 输出目录
- 默认读取 `../outputs`（即 SD WebUI 所在目录的 `outputs` 文件夹）
- 支持递归扫描，自动识别图片类型：
  - `txt2img-images` / `txt2img-grids` → 文生图
  - `img2img-images` / `img2img-grids` → 图生图
  - `extras-images` / `extras` → 后期处理
- 智能增量缓存：仅在有文件变化时重新扫描，大幅提升重复访问速度

### 2. 元数据提取
- 从 PNG/JPEG 等文件中读取 SD 嵌入的生成参数（`parameters` 块）
- 提取内容：Prompt、Negative Prompt、Steps、Sampler、CFG Scale、Seed、Size、Model Hash、Model Name
- 若无参数，相应字段留空，不影响浏览

### 3. 多维度筛选

| 筛选方式     | 说明                                       |
| ------------ | ------------------------------------------ |
| **视图模式** | 全部图片 / 回收站                 |
| **图片类型** | 全部 / 文生图 / 图生图 / 后期处理          |
| **时间范围** | 全部 / 今天 / 本周 / 本月                  |
| **关键词搜索** | 搜索文件名、Prompt、Negative Prompt      |

筛选状态自动保存到 LocalStorage，下次打开页面无需重新设置。

### 4. 画廊视图
- **网格视图**：卡片式展示，鼠标悬浮显示操作按钮
- **列表视图**：紧凑型列表，展示更多元数据（尺寸、Seed、采样器等），直接提供操作按钮
- 视图模式自动记忆
- 自适应分页：根据屏幕分辨率自动计算每页显示数量
- 图片懒加载：Intersection Observer 实现滚动到可视区域才加载

### 5. 图片灯箱（Lightbox）
- 点击任意图片打开大图预览
- 导航：上一张/下一张（支持键盘左右键、触屏滑动）
- 显示详细参数：Prompt、Negative Prompt、种子、采样器、步数、CFG、尺寸、文件大小、创建时间等
- 一键复制生成参数到剪贴板
- 一键下载原图
- 灯箱内直接删除图片（遵循软/硬删除模式）
- 跨页浏览：当切换到超出当前页的图片时，自动请求下一页数据并无缝继续浏览
- 关闭灯箱后自动导航到包含最后查看图片的页面

### 6. 文件管理
- **重命名**：修改图片文件名，采用乐观 UI 更新，操作即时响应，后端失败时自动回滚
- **删除**：
  - **硬删除**：直接删除磁盘文件（不可恢复）
  - **软删除**：文件移入 `.trash/` 回收站目录（可在回收站中恢复或彻底删除）
- 删除模式可在设置面板中切换，默认使用硬删除
- 所有操作均采用乐观 UI 更新策略，操作即时响应，无卡顿体验

### 7. 回收站
- 软删除的文件统一存放在 `outputs/.trash/` 目录下
- 支持查看回收站文件列表（含删除时间、原始路径）
- 单个恢复 / 单个彻底删除 / 一键清空回收站
- 导航栏和侧边栏实时显示回收站文件数量

### 8. NSFW 内容管理
- 基于关键词自动检测 NSFW 图片（关键词存储在 LocalStorage）
- 默认模糊遮挡 NSFW 图片，可在设置中开启直接显示
- 支持自定义 NSFW 关键词列表（多个关键词用逗号分隔）
- 可选择是否记住 NSFW 显示偏好

### 9. 设置面板
- **软删除开关**：开启后删除操作将文件移至回收站
- **NSFW 显示开关**：控制 NSFW 图片是否直接显示
- **NSFW 关键词管理**：添加/删除自定义 NSFW 检测关键词

### 10. 分页与性能
- 后端分页，避免一次性加载过多图片导致浏览器卡顿
- 每页数量根据屏幕分辨率自动计算
- 图片懒加载（Intersection Observer）
- 服务端图片缓存 + 文件修改时间检测，扫描效率高
- 乐观 UI 更新：重命名、删除等操作即时响应，后端异步确认
- 首个加载页显示初始化提示，避免空屏

### 11. 界面主题
- 浅色 / 深色主题，支持跟随系统偏好
- 主题偏好保存到 LocalStorage
- 所有组件均适配主题变量（背景模糊、边框、阴影等）

## 如何使用

### 环境要求
- **Python 3.10+**（推荐 3.10 ~ 3.12）
- **Stable Diffusion WebUI**（Automatic1111 或其他兼容 `outputs` 目录结构的版本）
- 现代浏览器（Chrome / Firefox / Edge / Safari）

### 安装与运行

1. **克隆或下载本仓库** 到 SD WebUI 所在机器的任意位置。

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
   - Windows: 双击 `run.bat`
   - 其他系统: 双击`run.sh`

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

5. **访问画廊**：打开浏览器，访问 `http://localhost:5000`

### 首次加载说明
- 第一次访问时，服务端会扫描 `outputs` 目录下所有图片并提取元数据，**耗时取决于图片数量**（几千张可能需要几秒）。页面上会显示"正在初始化图片库，请耐心等待..."
- 后续刷新或重启服务，如果 `outputs` 目录没有新增/删除/修改文件，则直接使用缓存，加载极快
- 当你通过 SD WebUI 生成了新图片后，刷新页面即可，服务端会自动检测到变化并更新

## 配置说明

所有配置均位于 `server.py` 顶部，可按需修改：

| 变量名               | 默认值                        | 说明                                 |
| -------------------- | ----------------------------- | ------------------------------------ |
| `OUTPUTS_DIR`        | `../outputs`                  | SD 输出目录的绝对或相对路径           |
| `TRASH_DIR`          | `../outputs/.trash`           | 回收站目录                           |
| `MAX_FILE_SIZE`      | `50 * 1024 * 1024` (50MB)     | 可预览/下载的最大图片大小（字节）     |
| `ALLOWED_EXTENSIONS` | `{'.png', '.jpg', '.jpeg', '.webp', '.gif'}` | 支持的图片格式 |
| `_CACHE_DURATION`    | `60` 秒                       | 文件系统变化检测间隔                  |

## 技术栈

- **后端**: Flask 2.3.3 + Pillow（图像处理）
- **前端**: 原生 JavaScript（ES6+）、CSS3（变量、Grid、Flex、动画）
- **通信**: Fetch API（JSON 数据交互）
- **存储**: LocalStorage（用户偏好、筛选状态、NSFW 关键词）
- **测试**: Python unittest + 前端测试脚本

## License

本项目采用 **MIT License**。
你可以自由使用、修改、分发、甚至用于商业目的，但需保留原始版权声明。

## 贡献

欢迎提交 Issue 和 Pull Request！
如果你有更好的功能建议（例如支持更多 SD 后端、批量导出参数为 CSV、更多排序方式等），请随时提出。

## 常见问题

**Q: 为什么有些图片没有显示 Prompt 等参数？**
A: 可能原因：
- 图片不是由 SD WebUI 生成的（或参数被其他软件擦除）
- 图片格式不支持元数据（例如某些 WebP 没有嵌入参数）
- 服务端提取逻辑有遗漏（请提交 Issue 并提供示例图片）

**Q: 硬删除和软删除有什么区别？**
A: **硬删除**会直接从磁盘删除文件，不可恢复。**软删除**会将文件移入回收站（`outputs/.trash/`），你可以在回收站中恢复文件或彻底删除。你可以在设置面板中切换删除模式。

**Q: NSFW 检测是如何工作的？**
A: NSFW 检测基于关键词匹配。系统会检查图片的 Prompt 和 Negative Prompt 中是否包含预设的关键词。你可以在设置面板中自定义关键词列表。匹配到的图片会被模糊遮挡，可在设置中关闭遮挡。

**Q: 支持远程访问（局域网/公网）吗？**
A: 默认监听 `0.0.0.0:5000`，同局域网设备可通过 `http://你的IP:5000` 访问。如需公网访问，请配置反向代理并注意安全。

**Q: 删除图片后能否恢复？**
A: 取决于删除模式。使用**硬删除**时不可恢复；使用**软删除**时，文件会进入回收站，可在回收站中恢复。建议开启软删除模式以防止误操作。

**Q: 与 SD Next / ComfyUI 兼容吗？**
A: 不完全兼容。本项目基于 Automatic1111 的目录结构和元数据格式开发。如果你使用其他 SD 前端，可能需要修改 `server.py` 中的扫描逻辑和元数据提取方式。

**Q: 启动时报错 `PermissionError`？**
A: 请确保你有读取 `outputs` 目录及其子文件的权限，以及对于重命名/删除操作所在目录的写权限。Windows 下建议以普通用户运行即可，无需管理员。

**Q: 图片很多时会不会卡顿？**
A: 本项目采用了多项性能优化措施：后端分页、图片懒加载、服务端缓存、乐观 UI 更新等。即使数万张图片也能保持流畅浏览。

---

**Enjoy your AI art gallery!**
如果觉得本项目有帮助，欢迎给个 ⭐Star 支持一下～
