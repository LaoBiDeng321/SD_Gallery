class Lightbox {
  constructor() {
    this.currentIndex = 0;
    this.images = [];
    this.isOpen = false;
    this.isLoading = false;
    this.totalItems = 0;
    this.currentPage = 1;
    this.limit = 20;
    this.filters = {};
    this.showInfo = false;
    this.init();
  }

  init() {
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.id = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox__header">
        <div class="lightbox__title"></div>
        <div class="lightbox__actions">
          <button class="btn btn--ghost btn--icon" id="lightboxDownload" title="下载">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button class="btn btn--ghost btn--icon" id="lightboxCopyParams" title="复制参数">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn btn--ghost btn--icon lightbox__delete-btn" id="lightboxDelete" title="删除">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          <button class="btn btn--ghost btn--icon" id="lightboxClose" title="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <button class="lightbox__nav lightbox__nav--prev" id="lightboxPrev">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button class="lightbox__nav lightbox__nav--next" id="lightboxNext">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div class="lightbox__content">
        <div class="lightbox__image-container">
          <img class="lightbox__image" id="lightboxImage" src="" alt="">
          <div class="lightbox__nsfw-overlay" id="lightboxNsfwOverlay">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M10.41 10.41a2 2 0 1 1 2.83 2.83"></path>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
            </svg>
            <span>NSFW 内容</span>
          </div>
        </div>
      </div>

      <div class="lightbox__info" id="lightboxInfo"></div>
    `;

    document.body.appendChild(lightbox);
    this.element = lightbox;
    this.imageEl = document.getElementById('lightboxImage');
    this.infoEl = document.getElementById('lightboxInfo');
    this.nsfwOverlay = document.getElementById('lightboxNsfwOverlay');
    if (this.infoEl) {
      this.infoEl.classList.remove('is-visible');
    }
    this.downloadBtn = document.getElementById('lightboxDownload');
    this.copyBtn = document.getElementById('lightboxCopyParams');
    this.deleteBtn = document.getElementById('lightboxDelete');
    this.closeBtn = document.getElementById('lightboxClose');
    this.prevBtn = document.getElementById('lightboxPrev');
    this.nextBtn = document.getElementById('lightboxNext');
  }

  bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });
    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });
    this.downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.download();
    });
    this.copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyParams();
    });
    this.deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDelete();
    });

    this.element.addEventListener('click', (e) => {
      const content = this.element.querySelector('.lightbox__content');
      if (content && content.contains(e.target)) {
        this.toggleInfo();
      } else if (e.target === this.element) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
        case 'ArrowRight':
          this.next();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          this.toggleInfo();
          break;
      }
    });
  }

  open(images, index, options = {}) {
    this.images = images;
    this.currentIndex = index;
    this.isOpen = true;
    this.showInfo = false;
    this.totalItems = options.totalItems || images.length;
    this.currentPage = options.currentPage || 1;
    this.limit = options.limit || 20;
    this.filters = options.filters || {};
    this.element.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    this.updateImage();
  }

  toggleInfo() {
    this.showInfo = !this.showInfo;
    if (this.infoEl) {
      if (this.showInfo) {
        this.infoEl.classList.add('is-visible');
      } else {
        this.infoEl.classList.remove('is-visible');
      }
    }
  }

  close() {
    this.isOpen = false;
    this.showInfo = false;
    if (this.infoEl) {
      this.infoEl.classList.remove('is-visible');
    }
    this.element.classList.remove('is-active');
    document.body.style.overflow = '';
    
    if (window.gallery) {
      const imageIndex = (this.currentPage - 1) * this.limit + this.currentIndex;
      const targetPage = Math.ceil((imageIndex + 1) / this.limit);
      
      if (targetPage !== gallery.currentPage) {
        console.log(`[Lightbox] Closing, navigating to page ${targetPage}`);
        gallery.goToPage(targetPage);
      }
    }
  }

  async prev() {
    if (this.isLoading) return;

    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateImage();
    } else {
      // 当前页第一张：尝试上一页
      const prevPage = this.currentPage - 1;
      if (prevPage >= 1) {
        await this.loadPage(prevPage);
        this.currentIndex = this.images.length - 1;
        this.updateImage();
      } else {
        // 已是第一页第一张：循环到最后一页最后一张
        const totalPages = Math.ceil(this.totalItems / this.limit);
        if (totalPages > 1) {
          await this.loadPage(totalPages);
          this.currentIndex = this.images.length - 1;
          this.updateImage();
        }
        // 只有一页一张：不移动
      }
    }
  }

  async next() {
    if (this.isLoading) return;

    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
      this.updateImage();
    } else {
      // 当前页最后一张：尝试下一页
      const nextPage = this.currentPage + 1;
      const totalPages = Math.ceil(this.totalItems / this.limit);
      if (nextPage <= totalPages) {
        await this.loadPage(nextPage);
        this.currentIndex = 0;
        this.updateImage();
      } else {
        // 已是最后一页最后一张：循环到第一页第一张
        if (totalPages > 1) {
          await this.loadPage(1);
          this.currentIndex = 0;
          this.updateImage();
        }
        // 只有一页一张：不移动
      }
    }
  }

  async loadPage(page) {
    this.isLoading = true;
    this.showLoading(true);

    try {
      const response = await api.fetchImages({
        ...this.filters,
        page: page,
        limit: this.limit
      });

      if (response.success) {
        this.images = response.data.images || [];
        this.currentPage = page;
      }
    } catch (error) {
      console.error('[Lightbox] Failed to load page:', error);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (!this.loadingEl) {
      this.loadingEl = document.createElement('div');
      this.loadingEl.className = 'lightbox__loading';
      this.loadingEl.innerHTML = '<div class="spinner"></div>';
      this.imageEl.parentElement.appendChild(this.loadingEl);
    }
    this.loadingEl.style.display = show ? 'flex' : 'none';
    this.imageEl.style.opacity = show ? '0.3' : '1';
  }

  updateImage() {
    const image = this.images[this.currentIndex];
    if (!image) return;

    const isNsfw = this._isNSFWImage(image);
    const shouldHide = isNsfw && !nsfwDetector.shouldDisplay();

    if (shouldHide) {
      this.nsfwOverlay.classList.add('is-visible');
      this.imageEl.style.filter = 'blur(40px)';
      this.imageEl.style.transform = 'scale(1.1)';
    }

    this.imageEl.src = window.resolveApiPath(image.path);
    this.imageEl.alt = image.filename;

    if (!shouldHide) {
      const removeProtection = () => {
        this.imageEl.removeEventListener('load', removeProtection);
        this.imageEl.removeEventListener('error', removeProtection);
        this.nsfwOverlay.classList.remove('is-visible');
        this.imageEl.style.filter = '';
        this.imageEl.style.transform = '';
      };
      if (this.imageEl.complete && this.imageEl.naturalWidth > 0) {
        removeProtection();
      } else {
        this.imageEl.addEventListener('load', removeProtection);
        this.imageEl.addEventListener('error', removeProtection);
      }
    }

    this.renderInfo(image);
  }

  _isNSFWImage(image) {
    return nsfwDetector.checkImage(image);
  }

  renderInfo(image) {
    const meta = image.metadata || {};
    const sizeDisplay = meta.size || (image.dimensions?.width && image.dimensions?.height ? `${image.dimensions.width}×${image.dimensions.height}` : '-');

    // 获取 LoRA 映射后的显示名称
    const loraDisplayNames = (meta.loras || []).map(lora => {
      if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
        return loraFilterManager.getDisplayName(lora);
      }
      return lora;
    });

    // 图生图模式：在提示词末尾显示参数信息
    const isImg2img = image.type === 'img2img';
    const img2imgParams = isImg2img ? this._buildImg2imgParamsString(meta) : '';

    const infoHTML = `
      <div class="lightbox__info-title">${image.filename}</div>
      <div class="lightbox__info-grid">
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">类型</span>
          <span class="lightbox__info-value">${image.type}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">尺寸</span>
          <span class="lightbox__info-value">${sizeDisplay}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">模型</span>
          <span class="lightbox__info-value">${this.escapeHTML(meta.model_name || '-')}</span>
        </div>
        ${loraDisplayNames.length > 0 ? `
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">LoRA</span>
          <span class="lightbox__info-value">${loraDisplayNames.map(n => this.escapeHTML(n)).join(', ')}</span>
        </div>
        ` : ''}
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">种子</span>
          <span class="lightbox__info-value">${meta.seed || '-'}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">采样器</span>
          <span class="lightbox__info-value">${meta.sampler || '-'}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">步数</span>
          <span class="lightbox__info-value">${meta.steps || '-'}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">CFG</span>
          <span class="lightbox__info-value">${meta.cfg_scale || '-'}</span>
        </div>
        ${meta.denoising_strength !== null && meta.denoising_strength !== undefined ? `
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">重绘强度</span>
          <span class="lightbox__info-value">${meta.denoising_strength}</span>
        </div>
        ` : ''}
        ${meta.clip_skip !== null && meta.clip_skip !== undefined ? `
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">Clip Skip</span>
          <span class="lightbox__info-value">${meta.clip_skip}</span>
        </div>
        ` : ''}
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">创建时间</span>
          <span class="lightbox__info-value">${this.formatDate(image.created_at)}</span>
        </div>
        <div class="lightbox__info-item">
          <span class="lightbox__info-label">文件大小</span>
          <span class="lightbox__info-value">${this.formatSize(image.size)}</span>
        </div>
      </div>
      ${meta.prompt ? `
        <div style="margin-top: var(--spacing-lg);">
          <div class="lightbox__info-item">
            <span class="lightbox__info-label">Prompt</span>
            <span class="lightbox__info-value" style="white-space: pre-wrap; font-size: var(--font-size-sm);">${this.escapeHTML(meta.prompt)}${img2imgParams ? '\n\n' + this.escapeHTML(img2imgParams) : ''}</span>
          </div>
        </div>
      ` : (img2imgParams ? `
        <div style="margin-top: var(--spacing-lg);">
          <div class="lightbox__info-item">
            <span class="lightbox__info-label">参数</span>
            <span class="lightbox__info-value" style="white-space: pre-wrap; font-size: var(--font-size-sm);">${this.escapeHTML(img2imgParams)}</span>
          </div>
        </div>
      ` : '')}
      ${meta.negative_prompt ? `
        <div style="margin-top: var(--spacing-md);">
          <div class="lightbox__info-item">
            <span class="lightbox__info-label">Negative Prompt</span>
            <span class="lightbox__info-value" style="white-space: pre-wrap; font-size: var(--font-size-sm); color: var(--color-text-tertiary);">${this.escapeHTML(meta.negative_prompt)}</span>
          </div>
        </div>
      ` : ''}
    `;

    this.infoEl.innerHTML = infoHTML;
  }

  _buildImg2imgParamsString(meta) {
    const parts = [];
    if (meta.steps) parts.push(`Steps: ${meta.steps}`);
    if (meta.sampler) parts.push(`Sampler: ${meta.sampler}`);
    if (meta.schedule_type) parts.push(`Schedule type: ${meta.schedule_type}`);
    if (meta.cfg_scale) parts.push(`CFG scale: ${meta.cfg_scale}`);
    if (meta.seed) parts.push(`Seed: ${meta.seed}`);
    if (meta.size) parts.push(`Size: ${meta.size}`);
    if (meta.model_hash) parts.push(`Model hash: ${meta.model_hash}`);
    if (meta.model_name) parts.push(`Model: ${meta.model_name}`);
    if (meta.denoising_strength !== null && meta.denoising_strength !== undefined) parts.push(`Denoising strength: ${meta.denoising_strength}`);
    if (meta.clip_skip !== null && meta.clip_skip !== undefined) parts.push(`Clip skip: ${meta.clip_skip}`);
    if (meta.version) parts.push(`Version: ${meta.version}`);
    if (parts.length === 0) return '';
    return `(${parts.join(', ')})`;
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatSize(bytes) {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  download() {
    const image = this.images[this.currentIndex];
    if (!image) return;

    // 使用 <a> 标签触发下载，避免被浏览器弹窗拦截
    const link = document.createElement('a');
    link.href = window.resolveApiPath(image.path);
    link.download = image.filename || '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  copyParams() {
    const image = this.images[this.currentIndex];
    if (!image || !image.metadata) return;

    const meta = image.metadata;
    const params = [];

    // 图生图模式：以参数格式复制
    if (image.type === 'img2img') {
      const parts = [];
      if (meta.prompt) parts.push(meta.prompt);
      if (meta.negative_prompt) parts.push(`Negative prompt: ${meta.negative_prompt}`);
      const paramParts = [];
      if (meta.steps) paramParts.push(`Steps: ${meta.steps}`);
      if (meta.sampler) paramParts.push(`Sampler: ${meta.sampler}`);
      if (meta.schedule_type) paramParts.push(`Schedule type: ${meta.schedule_type}`);
      if (meta.cfg_scale) paramParts.push(`CFG scale: ${meta.cfg_scale}`);
      if (meta.seed) paramParts.push(`Seed: ${meta.seed}`);
      if (meta.size) paramParts.push(`Size: ${meta.size}`);
      if (meta.model_hash) paramParts.push(`Model hash: ${meta.model_hash}`);
      if (meta.model_name) paramParts.push(`Model: ${meta.model_name}`);
      if (meta.denoising_strength) paramParts.push(`Denoising strength: ${meta.denoising_strength}`);
      if (meta.clip_skip) paramParts.push(`Clip skip: ${meta.clip_skip}`);
      if (meta.version) paramParts.push(`Version: ${meta.version}`);
      if (paramParts.length > 0) {
        parts.push(`(${paramParts.join(', ')})`);
      }
      params.push(parts.join('\n'));
    } else {
      if (meta.prompt) params.push(`Prompt: ${meta.prompt}`);
      if (meta.negative_prompt) params.push(`Negative Prompt: ${meta.negative_prompt}`);
      if (meta.model_name) params.push(`Model: ${meta.model_name}`);
      if (meta.loras && meta.loras.length > 0) {
        const loraDisplayNames = meta.loras.map(lora => {
          if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
            return loraFilterManager.getDisplayName(lora);
          }
          return lora;
        });
        params.push(`LoRA: ${loraDisplayNames.join(', ')}`);
      }
      if (meta.steps) params.push(`Steps: ${meta.steps}`);
      if (meta.sampler) params.push(`Sampler: ${meta.sampler}`);
      if (meta.cfg_scale) params.push(`CFG scale: ${meta.cfg_scale}`);
      if (meta.seed) params.push(`Seed: ${meta.seed}`);
      if (meta.size) params.push(`Size: ${meta.size}`);
    }

    const text = params.join('\n');
    this._copyToClipboard(text);
  }

  _copyToClipboard(text) {
    // 优先使用 Clipboard API，失败时回退到传统方法
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('参数已复制到剪贴板');
      }).catch(() => {
        this._fallbackCopy(text);
      });
    } else {
      this._fallbackCopy(text);
    }
  }

  _fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast('参数已复制到剪贴板');
    } catch (e) {
      this.showToast('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
  }

  handleDelete() {
    const image = this.images[this.currentIndex];
    if (!image) return;

    const isSoftDelete = settingsManager ? settingsManager.isSoftDeleteEnabled() : false;

    modal.showDeleteConfirm(
      image.filename,
      async () => {
        try {
          const response = await this._deleteImageRequest(image.path, isSoftDelete ? 'soft' : 'hard');
          if (response && response.success) {
            api.clearCache();

            // 从当前数组中移除已删除的图片
            const deletedIndex = this.currentIndex;
            this.images.splice(deletedIndex, 1);
            this.totalItems = Math.max(0, this.totalItems - 1);

            if (this.images.length > 0) {
              // 如果删除的是最后一张，移到新的最后一张
              if (this.currentIndex >= this.images.length) {
                this.currentIndex = this.images.length - 1;
              }
              // 否则 currentIndex 自动指向下一张（数组前移）
              this.showToast(response.mode === 'soft' ? '已移入回收站' : '删除成功');
              this.updateImage();
            } else {
              // 没有图片了，关闭灯箱
              this.showToast(response.mode === 'soft' ? '已移入回收站' : '删除成功');
              this.close();
            }

            // 刷新画廊
            if (window.gallery && typeof window.gallery.loadImages === 'function') {
              const filters = typeof filterManager !== 'undefined' && filterManager.getFilters
                ? filterManager.getFilters()
                : {};
              window.gallery.loadImages(filters);
            }
          } else {
            modal.showToast('删除失败：' + (response?.error || '未知错误'), 'error');
          }
        } catch (error) {
          modal.showToast('删除失败：' + error.message, 'error');
        }
      },
      null,
      isSoftDelete
    );
  }

  _deleteImageRequest(path, mode) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', (window.API_BASE_URL || '/api') + '/delete', true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || '删除失败'));
            }
          } catch (e) {
            reject(new Error('服务器响应格式错误'));
          }
        } else if (xhr.status === 404) {
          reject(new Error('文件不存在或路径错误'));
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('网络请求失败，请检查服务器连接'));

      xhr.send(JSON.stringify({ path, mode }));
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast--success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

const lightbox = new Lightbox();