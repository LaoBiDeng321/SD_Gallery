# SD Gallery 项目文件导航说明文档

## 文档说明

本文档详细列出项目中所有文件及其所在路径，清晰描述每个文件的主要功能、职责范围和关键作用。按目录分类组织，包含文件相对路径、文件名、文件类型及详细功能说明。

---

## 一、项目根目录

### 1.1 核心配置文件

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/` | `index.html` | HTML | 项目主入口HTML文件，包含页面结构、导航栏、侧边栏、主内容区域等UI布局，引用所有CSS和JS资源文件 |
| `/` | `requirements.txt` | TXT | Python依赖包清单，列出项目所需的Flask、Flask-CORS、Pillow等Python包及其版本 |
| `/` | `.gitignore` | GIT | Git版本控制忽略文件配置，指定哪些文件和目录不应被Git追踪（如缓存、临时文件等） |
| `/` | `README.md` | Markdown | 项目说明文档，介绍项目功能、安装步骤、使用方法等基本信息 |
| `/` | `PROJECT_STRUCTURE.md` | Markdown | 项目结构说明文档，详细说明重构后的目录组织方式和文件命名规范 |

### 1.2 启动脚本

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/` | `run.bat` | BAT | Windows系统启动脚本，检查Python环境并启动后端服务（`python backend\app.py`） |
| `/` | `run.sh` | SH | Linux/Mac系统启动脚本，检查Python环境并启动后端服务（`python3 backend/app.py`） |

### 1.3 旧版文件（备份）

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/` | `server.py` | Python | 旧版后端服务文件（重构前的版本），保留作为备份参考，包含所有API路由和业务逻辑 |

---

## 二、后端代码目录 (`backend/`)

### 2.1 后端根目录

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/backend/` | `app.py` | Python | Flask应用主入口文件，初始化Flask应用、配置CORS、注册API路由、配置请求日志、启动服务 |
| `/backend/` | `config.py` | Python | 项目配置文件，定义所有路径配置（OUTPUTS_DIR、TRASH_DIR等）、服务配置（HOST、PORT）、日志配置等常量，以及获取局域网IP的函数 |
| `/backend/` | `console.py` | Python | 控制台输出样式模块，提供ANSI颜色代码和格式化打印功能，用于显示带颜色的启动横幅 |
| `/backend/` | `__init__.py` | Python | 后端包初始化文件，标识backend目录为Python包 |

### 2.2 API路由目录 (`backend/routes/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/backend/routes/` | `__init__.py` | Python | 路由包初始化文件，导出所有路由注册函数（`register_image_routes`, `register_trash_routes`, `register_nsfw_routes`） |
| `/backend/routes/` | `images.py` | Python | 图片相关API路由模块，包含图片列表获取（支持多维度筛选）、图片文件服务、缩略图生成、图片下载、图片重命名、图片删除、统计数据、模型列表、LoRA列表等API端点，处理图片相关的所有HTTP请求 |
| `/backend/routes/` | `trash.py` | Python | 回收站相关API路由模块，包含回收站列表获取、文件恢复、永久删除、清空回收站、回收站计数等API端点，处理回收站相关的所有HTTP请求 |
| `/backend/routes/` | `nsfw.py` | Python | NSFW关键词相关API路由模块，包含关键词获取、关键词设置、关键词添加、关键词删除等API端点，处理NSFW关键词管理的所有HTTP请求 |

### 2.3 业务服务目录 (`backend/services/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/backend/services/` | `__init__.py` | Python | 服务包初始化文件，导出所有服务类（`ImageService`, `TrashService`, `NSFWService`） |
| `/backend/services/` | `image_service.py` | Python | 图片处理服务类，负责扫描图片目录、提取元数据、生成缩略图、构建图片信息、管理图片缓存、处理图片文件操作等核心业务逻辑 |
| `/backend/services/` | `trash_service.py` | Python | 回收站管理服务类，负责移动文件到回收站、恢复文件、永久删除文件、清空回收站、管理回收站清单（manifest.json）等回收站相关业务逻辑 |
| `/backend/services/` | `nsfw_service.py` | Python | NSFW关键词管理服务类，负责加载关键词、保存关键词、添加关键词、删除关键词、检查Prompt是否包含NSFW关键词等NSFW相关业务逻辑 |

### 2.4 工具函数目录 (`backend/utils/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/backend/utils/` | `__init__.py` | Python | 工具包初始化文件，导出所有工具函数和类 |
| `/backend/utils/` | `metadata.py` | Python | 元数据提取工具模块，提供从图片文件提取生成参数（Prompt、Negative Prompt、Steps、Sampler、CFG Scale、Seed、Size、Model、LoRA等）的功能，支持PIL读取和二进制搜索两种方法，含模型名称智能归一化和LoRA标签提取 |
| `/backend/utils/` | `cache.py` | Python | 缓存管理工具模块，提供基于时间的缓存过期机制，支持缓存数据存储、获取、刷新标记等缓存管理功能 |
| `/backend/utils/` | `path.py` | Python | 路径处理工具模块，提供安全路径解析（防止路径遍历攻击）、图片类型映射等功能，确保文件访问的安全性 |
| `/backend/utils/` | `logger.py` | Python | 日志管理工具模块，提供日志轮转、自动清理（定时/大小/数量触发）、审计日志记录等功能，支持7天自动清理过期日志 |

---

## 三、前端代码目录 (`src/`)

### 3.1 UI组件目录 (`src/components/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/components/` | `lightbox.js` | JavaScript | 图片预览灯箱组件，提供全屏图片查看、图片信息显示、下载、复制参数、删除、跨页导航等功能，支持键盘快捷键操作（ESC关闭、左右箭头切换、空格/回车显示信息） |
| `/src/components/` | `modal.js` | JavaScript | 模态框组件，提供通用模态框显示、确认对话框、重命名对话框、删除确认对话框、Toast消息提示等功能，支持自定义标题、内容、按钮文本和样式 |
| `/src/components/` | `pager.js` | JavaScript | 分页器组件，提供分页导航、页码显示、首页/末页/上一页/下一页按钮、页码状态保存等功能，支持响应式设计和页码省略显示 |

### 3.2 业务功能目录 (`src/features/`)

#### 3.2.1 图片画廊功能 (`src/features/gallery/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/gallery/` | `gallery-manager.js` | JavaScript | 画廊管理器，负责图片列表加载、渲染（网格/列表视图）、分页控制、筛选响应、图片点击处理、懒加载、动画效果、视图模式切换、重命名和删除操作（乐观UI更新）等画廊核心功能 |
| `/src/features/gallery/` | `use-filter.js` | JavaScript | 筛选逻辑Hook，负责筛选状态管理、筛选事件绑定、筛选条件保存和恢复、筛选条件重置、URL参数解析等功能，管理图片类型、时间范围、模型分类、LoRA分类、搜索关键词等筛选条件，筛选状态持久化到 LocalStorage |

#### 3.2.2 模型筛选功能 (`src/features/model/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/model/` | `model-filter.js` | JavaScript | 模型筛选管理器，负责模型分类的状态管理、UI渲染（动态列表+展开/收起）、事件绑定，从 `/api/models` 获取模型数据，通过 `modelFilterChanged` 事件与主筛选系统通信 |

#### 3.2.3 LoRA 筛选功能 (`src/features/lora/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/lora/` | `lora-filter.js` | JavaScript | LoRA 筛选管理器，负责 LoRA 分类的状态管理、UI渲染（动态列表+展开/收起）、事件绑定，从 `/api/loras` 获取 LoRA 数据，通过 `loraFilterChanged` 事件与主筛选系统通信。支持从 LocalStorage 加载名称映射表，使用映射后的显示名称渲染筛选选项 |

#### 3.2.4 NSFW检测功能 (`src/features/nsfw/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/nsfw/` | `nsfw-detector.js` | JavaScript | NSFW检测器，负责NSFW关键词加载、Prompt检查、图片NSFW标记、显示偏好设置、关键词添加和删除等功能，管理NSFW内容的显示和隐藏逻辑 |

#### 3.2.5 设置功能 (`src/features/settings/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/settings/` | `settings-manager.js` | JavaScript | 设置管理器，负责设置面板显示、软删除模式设置、NSFW显示设置、关键词管理界面、LoRA名称映射管理、设置保存和加载等功能，管理用户偏好设置 |

#### 3.2.6 回收站功能 (`src/features/trash/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/features/trash/` | `trash-manager.js` | JavaScript | 回收站管理器，负责回收站视图切换、回收站列表加载、文件恢复、永久删除、清空回收站、回收站计数更新等功能，管理回收站相关操作 |

### 3.3 通用业务逻辑目录 (`src/hooks/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/hooks/` | `use-responsive.js` | JavaScript | 响应式布局Hook，负责屏幕尺寸检测、断点识别、最优每页图片数计算、视口变化事件监听、屏幕信息获取等功能，实现响应式设计和自适应布局 |
| `/src/hooks/` | `use-theme.js` | JavaScript | 主题切换Hook，负责主题状态管理、系统主题检测、主题应用、主题切换、主题偏好保存等功能，支持亮色/暗色主题切换 |

### 3.4 页面入口目录 (`src/pages/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/pages/` | `gallery-page.js` | JavaScript | 画廊页面入口文件，负责页面初始化、NSFW检测器初始化、分页器初始化、画廊初始化、视图模式恢复、菜单按钮绑定、设置按钮绑定、回收站计数更新等页面级初始化逻辑 |

### 3.5 API客户端目录 (`src/services/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/services/` | `api-client.js` | JavaScript | API请求客户端，负责API请求封装、缓存管理、图片列表获取、图片元数据获取、统计数据获取、模型列表获取、LoRA列表获取、图片下载、图片删除、回收站列表获取、文件恢复、永久删除、清空回收站等所有API调用功能 |

### 3.6 全局样式目录 (`src/styles/`)

| 文件路径 | 文件名 | 文件类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/styles/` | `global.css` | CSS | 全局样式文件，定义CSS变量（颜色、字体、间距、圆角、阴影、过渡等）、全局样式（字体、滚动条、选择文本等）、响应式设计基础样式 |
| `/src/styles/` | `layout.css` | CSS | 布局样式文件，定义导航栏、侧边栏、主内容区域、画廊网格/列表布局、加载动画、空状态等布局相关样式 |
| `/src/styles/` | `components.css` | CSS | 组件样式文件，定义按钮、输入框、卡片、列表项、筛选选项、徽章、骨架屏、加载动画、Toast、模态框、设置面板、回收站项、NSFW遮罩等组件样式 |
| `/src/styles/` | `pager.css` | CSS | 分页器样式文件，定义分页器容器、页码按钮、导航按钮、页码信息、加载状态等分页器相关样式 |
| `/src/styles/` | `themes.css` | CSS | 主题样式文件，定义亮色主题和暗色主题的颜色变量、主题切换按钮动画、灯箱样式、图片信息面板样式等主题相关样式 |

### 3.7 空目录（预留扩展）

| 目录路径 | 目录名 | 目录类型 | 功能说明 |
|---------|--------|---------|---------|
| `/src/constants/` | `constants` | 目录 | （预留）业务常量、配置文件目录，用于存储非环境变量的业务常量和配置数据 |
| `/src/types/` | `types` | 目录 | （预留）类型定义、接口声明目录，用于存储TypeScript类型定义或JavaScript接口声明文件 |
| `/src/assets/` | `assets` | 目录 | （预留）静态资源目录，用于存储图片、字体、图标等静态资源文件 |
| `/src/layouts/` | `layouts` | 目录 | （预留）布局组件目录，用于存储页面壳组件（如侧边栏+顶栏的布局组件） |
| `/src/utils/` | `utils` | 目录 | （预留）纯工具函数目录，用于存储无副作用、可跨项目的纯工具函数 |

---

## 四、文件职责范围总结

### 4.1 前端职责划分

| 目录/文件类别 | 职责范围 | 关键作用 |
|-------------|---------|---------|
| **UI组件** (`components/`) | 提供可复用的UI组件，负责视图渲染和用户交互 | 确保UI一致性和可复用性，降低代码重复 |
| **业务功能** (`features/`) | 实现具体业务功能，负责业务逻辑和状态管理 | 按功能模块分离，提高代码可维护性和可扩展性 |
| **通用逻辑** (`hooks/`) | 提供跨模块的可复用状态和副作用逻辑 | 实现逻辑复用，避免重复代码 |
| **页面入口** (`pages/`) | 页面级初始化和协调，负责页面生命周期管理 | 作为页面入口，协调各模块工作 |
| **API客户端** (`services/`) | 尟装API请求，负责网络通信和缓存管理 | 统一API调用方式，简化网络请求 |
| **全局样式** (`styles/`) | 定义全局样式和主题，负责视觉一致性 | 确保UI风格统一，支持主题切换 |

### 4.2 后端职责划分

| 目录/文件类别 | 职责范围 | 关键作用 |
|-------------|---------|---------|
| **API路由** (`routes/`) | 定义API端点，处理HTTP请求和响应 | 分离路由定义，提高API可维护性 |
| **业务服务** (`services/`) | 实现核心业务逻辑，负责数据处理和操作 | 封装业务逻辑，提高代码复用性 |
| **工具函数** (`utils/`) | 提通用功能，负责元数据提取、缓存管理、路径处理等 | 提供基础功能支持，简化代码实现 |
| **应用入口** (`app.py`) | 初始化应用，注册路由，启动服务 | 作为后端入口，协调各模块工作 |

---

## 五、文件重要性等级

### 5.1 核心文件（必须）

| 文件路径 | 重要性 | 说明 |
|---------|--------|------|
| `backend/app.py` | ★★★★★ | 后端主入口，缺失将导致服务无法启动 |
| `backend/routes/images.py` | ★★★★★ | 图片API核心路由，缺失将导致图片功能完全失效 |
| `src/pages/gallery-page.js` | ★★★★★ | 前端主入口，缺失将导致页面无法初始化 |
| `src/services/api-client.js` | ★★★★★ | API客户端，缺失将导致无法与后端通信 |
| `index.html` | ★★★★★ | HTML入口，缺失将导致页面无法加载 |

### 5.2 重要文件（推荐）

| 文件路径 | 重要性 | 说明 |
|---------|--------|------|
| `backend/services/image_service.py` | ★★★★☆ | 图片处理核心逻辑，缺失将影响图片功能 |
| `src/features/gallery/gallery-manager.js` | ★★★★☆ | 画廊核心功能，缺失将导致画廊无法工作 |
| `src/styles/global.css` | ★★★★☆ | 全局样式基础，缺失将导致样式混乱 |
| `backend/utils/metadata.py` | ★★★★☆ | 元数据提取核心，缺失将影响参数显示 |

### 5.3 辅助文件（可选）

| 文件路径 | 重要性 | 说明 |
|---------|--------|------|
| `src/features/trash/trash-manager.js` | ★★★☆☆ | 回收站功能，缺失仅影响回收站功能 |
| `src/features/nsfw/nsfw-detector.js` | ★★★☆☆ | NSFW检测功能，缺失仅影响NSFW功能 |
| `src/features/model/model-filter.js` | ★★★☆☆ | 模型筛选功能，缺失仅影响模型筛选 |
| `src/features/settings/settings-manager.js` | ★★★☆☆ | 设置功能，缺失仅影响设置功能 |
| `src/features/lora/lora-filter.js` | ★★★☆☆ | LoRA筛选功能，缺失仅影响LoRA筛选 |
| `PROJECT_STRUCTURE.md` | ★★☆☆☆ | 文档文件，缺失不影响功能 |

---

## 六、文件依赖关系

### 6.1 前端依赖链

```
index.html
  ↓ 引用
src/styles/*.css (样式文件)
  ↓ 引用
src/services/api-client.js (API客户端)
  ↓ 引用
src/hooks/*.js (通用逻辑)
  ↓ 引用
src/features/gallery/use-filter.js (筛选状态管理)
  ↓ 引用
src/features/model/model-filter.js + src/features/lora/lora-filter.js (动态筛选)
  ↓ 引用
src/components/*.js (UI组件)
  ↓ 引用
src/pages/gallery-page.js (页面入口)
```

### 6.2 后端依赖链

```
backend/app.py (应用入口)
  ↓ 导入
backend/config.py (配置文件)
  ↓ 被引用
backend/console.py (控制台样式)
  ↓ 被引用
backend/routes/*.py (API路由)
  ↓ 导入
backend/services/*.py (业务服务)
  ↓ 导入
backend/utils/*.py (工具函数)
```

---

## 七、文件修改建议

### 7.1 常见修改场景

| 修改场景 | 需修改的文件 | 修改说明 |
|---------|------------|---------|
| **添加新API** | `backend/routes/` + `backend/services/` | 在routes中定义新路由，在services中实现业务逻辑 |
| **修改UI样式** | `src/styles/*.css` | 根据修改类型选择对应样式文件 |
| **添加新功能** | `src/features/` | 在对应功能目录添加新文件 |
| **修改页面逻辑** | `src/pages/gallery-page.js` | 修改页面初始化逻辑 |
| **添加新组件** | `src/components/` | 在components目录添加新组件文件 |

### 7.2 文件修改注意事项

1. **保持目录结构**: 新文件应放入对应目录，遵循现有结构
2. **遵循命名规范**: 使用规定的命名方式（名词短语、动词开头等）
3. **更新引用路径**: 修改文件位置后需更新HTML中的引用路径
4. **测试功能**: 修改后需测试相关功能是否正常工作
5. **更新文档**: 重要修改后需更新相关文档

---

## 八、文档维护说明

### 8.1 文档更新时机

- 新增文件或目录时
- 文件功能发生重大变化时
- 目录结构调整时
- 项目重构完成后

### 8.2 文档维护责任人

- 项目负责人：负责文档整体维护
- 模块负责人：负责对应模块文档更新
- 新成员：负责理解文档并提出改进建议

---

**文档版本**: v1.0  
**创建日期**: 2026-06-20  
**最后更新**: 2026-06-20  
**维护状态**: 活跃维护