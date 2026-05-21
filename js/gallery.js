class Gallery {
  constructor() {
    this.images = [];
    this.currentPage = 1;
    this.limit = this.getOptimalLimit();
    this.isLoading = false;
    this.totalPages = 1;
    this.totalItems = 0;
    this.viewMode = localStorage.getItem('gallery-view-mode') || 'grid';
    this.isFirstLoad = true;
    this.init();
  }

  getOptimalLimit() {
    const calculated = responsiveManager.calculateOptimalItemsPerPage();
    return calculated[this.viewMode] || 20;
  }

  async init() {
    nsfwDetector.init();
    this.bindEvents();
    this.setupResponsiveListener();
    await this.loadImages();
  }

  setupResponsiveListener() {
    window.addEventListener('viewportChanged', () => {
      console.log('[Gallery] Viewport changed, recalculating optimal limit');
      const newLimit = this.getOptimalLimit();
      
      if (newLimit !== this.limit) {
        console.log(`[Gallery] Limit changed: ${this.limit} -> ${newLimit}`);
        this.limit = newLimit;
        
        if (pager) {
          pager.update({ perPage: this.limit });
        }
        
        this.currentPage = 1;
        this.images = [];
        this.loadImages();
      }
    });

    window.addEventListener('breakpointChanged', (e) => {
      console.log(`[Gallery] Breakpoint changed: ${e.detail.oldBreakpoint} -> ${e.detail.newBreakpoint}`);
      const screenInfo = responsiveManager.getScreenInfo();
      console.log('[Gallery] Screen info:', screenInfo);
    });
  }

  bindEvents() {
    window.addEventListener('filtersChanged', async (e) => {
      console.log('[Gallery] Filters changed, resetting pagination');

      if (trashManager.isTrashView) {
        console.log('[Gallery] In trash view, switching back to gallery view');
        trashManager.leaveTrashView();
      }

      this.currentPage = 1;
      this.images = [];

      if (pager) {
        pager.reset();
      }

      await this.loadImages(e.detail);
    });
  }

  async loadImages(filters = {}) {
    if (this.isLoading) {
      console.log('[Gallery] Load images blocked: already loading');
      return;
    }

    console.log(`[Gallery] Loading images: page=${this.currentPage}, limit=${this.limit}, filters=`, filters);

    this.isLoading = true;
    this.showLoading(true);

    try {
      const response = await api.fetchImages({
        ...filters,
        page: this.currentPage,
        limit: this.limit
      });

      if (response.success) {
        const newImages = response.data.images || [];
        this.images = newImages;

        const pagination = response.data.pagination || {};
        this.totalPages = pagination.total_pages || 1;
        this.totalItems = pagination.total || 0;
        this.currentPage = pagination.page || 1;

        console.log(`[Gallery] Loaded ${newImages.length} images`);
        console.log(`[Gallery] Pagination: page=${this.currentPage}/${this.totalPages}, total=${this.totalItems}`);

        if (pager) {
          pager.update({
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            totalItems: this.totalItems,
            perPage: this.limit
          });
        }

        this.updateStats(this.totalItems);
        this.render();
      }
    } catch (error) {
      console.error('[Gallery] Failed to load images:', error);
      this.showError('加载图片失败，请检查后端服务是否启动');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      console.log(`[Gallery] Page change blocked: page=${page}, current=${this.currentPage}`);
      return;
    }

    console.log(`[Gallery] Navigating to page ${page}`);
    this.currentPage = page;
    this.loadImages(filterManager.getFilters());
  }

  render() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;

    if (this.images.length === 0) {
      container.innerHTML = this.renderEmpty();
      return;
    }

    if (this.viewMode === 'grid') {
      container.innerHTML = this.renderGrid();
    } else {
      container.innerHTML = this.renderList();
    }

    this.setupImageClickHandlers();
    this.setupLazyLoading();
    this.animateImages();
  }

  renderGrid() {
    return `
      <div class="gallery__grid">
        ${this.images.map((image, index) => this.renderGridItem(image, index)).join('')}
      </div>
    `;
  }

  _isNSFWImage(image) {
    return nsfwDetector.checkImage(image);
  }

  _renderNSFWOverlay(image) {
    const isNsfw = this._isNSFWImage(image);
    if (!isNsfw) return '';
    return `
      <div class="nsfw-overlay">
        <div class="nsfw-overlay__badge">NSFW</div>
      </div>
    `;
  }

  _getImageSrc(image, isNsfwHidden) {
    return image.thumbnail || image.path;
  }

  renderGridItem(image, index) {
    const isNsfw = this._isNSFWImage(image);
    const nsfwHidden = isNsfw && !nsfwDetector.shouldDisplay();
    const imgSrc = image.thumbnail || image.path;
    return `
      <div class="card gallery-item" data-index="${index}" data-id="${image.id}">
        <div class="card__image${nsfwHidden ? ' nsfw-thumb--hidden' : ''}">
          <img
            class="lazy-image${nsfwHidden ? ' nsfw-blurred-img' : ''}"
            data-src="${imgSrc}"
            src="${imgSrc}"
            alt="${image.filename}"
            loading="lazy"
          />
          ${this._renderNSFWOverlay(image)}
          <div class="card__overlay">
            <button class="btn btn--ghost btn--icon" onclick="lightbox.open(gallery.images, ${index}, { totalItems: gallery.totalItems, currentPage: gallery.currentPage, limit: gallery.limit, filters: filterManager.getFilters() })" title="查看">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
        <div class="card__content">
          <div class="card__title">${image.filename}</div>
          <div class="card__meta">
            <span class="badge">${image.type}</span>
            ${isNsfw ? '<span class="badge badge--nsfw">NSFW</span>' : ''}
            <span>${this.formatDate(image.created_at)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderList() {
    return `
      <div class="gallery__list">
        ${this.images.map((image, index) => this.renderListItem(image, index)).join('')}
      </div>
    `;
  }

  renderListItem(image, index) {
    const isNsfw = this._isNSFWImage(image);
    const nsfwHidden = isNsfw && !nsfwDetector.shouldDisplay();
    const imgSrc = image.thumbnail || image.path;
    const meta = image.metadata || {};
    const sizeDisplay = meta.size || (image.dimensions?.width && image.dimensions?.height ? `${image.dimensions.width}×${image.dimensions.height}` : '-');
    return `
      <div class="list-item gallery-item" data-index="${index}" data-id="${image.id}">
        <div class="list-item__thumbnail${nsfwHidden ? ' nsfw-thumb--hidden' : ''}">
          <img
            class="lazy-image${nsfwHidden ? ' nsfw-blurred-img' : ''}"
            data-src="${imgSrc}"
            src="${imgSrc}"
            alt="${image.filename}"
            loading="lazy"
          />
          ${this._renderNSFWOverlay(image)}
        </div>
        <div class="list-item__content">
          <div class="list-item__title">${image.filename}</div>
          <div class="list-item__meta">
            <span class="badge">${image.type}</span>
            ${isNsfw ? '<span class="badge badge--nsfw">NSFW</span>' : ''}
            <span>${sizeDisplay}</span>
            <span>Seed: ${meta.seed || '-'}</span>
            <span>${meta.sampler || '-'}</span>
            <span>${this.formatDate(image.created_at)}</span>
          </div>
        </div>
        <div class="list-item__actions-full">
          <button class="btn btn--ghost btn--icon" data-id="${image.id}" data-filename="${image.filename}" data-path="${image.path}" data-index="${index}" onclick="gallery.handleRename(this)" title="修改名称">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn btn--ghost btn--icon" data-id="${image.id}" data-filename="${image.filename}" data-path="${image.path}" data-index="${index}" onclick="gallery.handleDelete(this)" title="删除">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <button class="btn btn--ghost btn--icon" onclick="lightbox.open(gallery.images, ${index}, { totalItems: gallery.totalItems, currentPage: gallery.currentPage, limit: gallery.limit, filters: filterManager.getFilters() })" title="查看">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderEmpty() {
    return `
      <div class="gallery__empty">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto var(--spacing-lg); opacity: 0.3;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <p style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">暂无图片</p>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">请先生成一些AI图片</p>
      </div>
    `;
  }

  setupImageClickHandlers() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('[onclick="gallery.handleRename(this)"]') &&
            !e.target.closest('[onclick="gallery.handleDelete(this)"]') &&
            !e.target.closest('[onclick="lightbox.open(gallery.images, ')) {
          const index = parseInt(item.dataset.index);
          lightbox.open(this.images, index, { 
            totalItems: this.totalItems, 
            currentPage: this.currentPage, 
            limit: this.limit, 
            filters: filterManager.getFilters() 
          });
        }
      });
    });
  }

  _findImageIndexByPath(imagePath) {
    const encodedPart = imagePath.replace('/api/image/', '');
    return this.images.findIndex(img => img.path.endsWith(encodedPart));
  }

  _snapshotImageEntry(image) {
    return JSON.parse(JSON.stringify(image));
  }

  _snapshotPagination() {
    return {
      totalItems: this.totalItems,
      totalPages: this.totalPages,
      currentPage: this.currentPage,
      images: [...this.images]
    };
  }

  _recalculatePagination() {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.limit));
  }

  _updateUIAfterLocalChange() {
    this.updateStats(this.totalItems);
    if (pager) {
      pager.update({
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        totalItems: this.totalItems,
        perPage: this.limit
      });
    }
    this.render();
  }

  async handleRename(btn) {
    if (this._pendingRename) {
      modal.showToast('请等待当前操作完成', 'error');
      return;
    }

    const id = btn.dataset.id;
    const filename = btn.dataset.filename;
    const imagePath = btn.dataset.path;
    const imageIndex = this._findImageIndexByPath(imagePath);

    if (imageIndex === -1 || !this.images[imageIndex]) {
      modal.showToast('图片信息不存在', 'error');
      return;
    }

    const image = this.images[imageIndex];

    modal.showRenameModal(
      filename,
      async (newName) => {
        if (newName === filename) {
          return;
        }

        console.log(`[Gallery] Renaming "${filename}" to "${newName}"`);

        this._pendingRename = true;

        const oldEntry = this._snapshotImageEntry(image);

        image.filename = newName;
        this._updateUIAfterLocalChange();

        try {
          const response = await this.renameImage(imagePath, newName);

          if (response && response.success && response.data) {
            const newData = response.data;
            this.images[imageIndex] = newData;
            this._updateUIAfterLocalChange();
            modal.showToast('修改成功');
          }
        } catch (error) {
          console.error('[Gallery] Rename failed, rolling back:', error);
          this.images[imageIndex] = oldEntry;
          this._updateUIAfterLocalChange();
          modal.showToast('修改失败：' + error.message, 'error');
        } finally {
          this._pendingRename = false;
        }
      },
      () => {
        console.log('[Gallery] Rename cancelled');
      }
    );
  }

  async handleDelete(btn) {
    if (this._pendingDelete) {
      modal.showToast('请等待当前操作完成', 'error');
      return;
    }

    const id = btn.dataset.id;
    const filename = btn.dataset.filename;
    const imagePath = btn.dataset.path;
    const isSoftDelete = settingsManager.isSoftDeleteEnabled();

    modal.showDeleteConfirm(
      filename,
      async () => {
        console.log(`[Gallery] Deleting "${filename}" (mode: ${isSoftDelete ? 'soft' : 'hard'})`);

        this._pendingDelete = true;

        const imageIndex = this._findImageIndexByPath(imagePath);
        if (imageIndex === -1 || !this.images[imageIndex]) {
          modal.showToast('图片信息不存在', 'error');
          this._pendingDelete = false;
          return;
        }

        const deletedEntry = this._snapshotImageEntry(this.images[imageIndex]);
        const paginationSnapshot = this._snapshotPagination();

        this.images.splice(imageIndex, 1);
        this.totalItems -= 1;
        this._recalculatePagination();

        const pageEmptied = this.images.length === 0 && this.currentPage > 1;

        if (pageEmptied) {
          this.currentPage -= 1;
          if (pager) {
            pager.update({
              currentPage: this.currentPage,
              totalPages: this.totalPages,
              totalItems: this.totalItems,
              perPage: this.limit
            });
          }
          this.updateStats(this.totalItems);
          await this.loadImages(filterManager.getFilters());
        } else {
          this._updateUIAfterLocalChange();
        }

        try {
          const response = await this.deleteImage(imagePath, isSoftDelete ? 'soft' : 'hard');
          if (response && response.success) {
            modal.showToast(response.mode === 'soft' ? '已移入回收站' : '删除成功');
            if (window.trashManager && typeof window.trashManager.updateTrashCount === 'function') {
              window.trashManager.updateTrashCount();
            }
          }
        } catch (error) {
          console.error('[Gallery] Delete failed, rolling back:', error);

          if (pageEmptied) {
            this.currentPage = paginationSnapshot.currentPage;
          }

          this.images.splice(imageIndex, 0, deletedEntry);
          this.totalItems = paginationSnapshot.totalItems;
          this.totalPages = paginationSnapshot.totalPages;

          this._updateUIAfterLocalChange();

          modal.showToast('删除失败：' + error.message, 'error');
        } finally {
          this._pendingDelete = false;
        }
      },
      () => {
        console.log('[Gallery] Delete cancelled');
      },
      isSoftDelete
    );
  }

  async renameImage(path, newName) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/rename', true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || '重命名失败'));
            }
          } catch (e) {
            reject(new Error('服务器响应格式错误'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('网络请求失败'));
      };

      xhr.send(JSON.stringify({ path, newName }));
    });
  }

  async deleteImage(path, mode = 'hard') {
    console.log(`[Gallery] deleteImage called with path: ${path}, mode: ${mode}`);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/delete', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      const requestData = JSON.stringify({ path, mode });
      console.log(`[Gallery] Sending request with data: ${requestData}`);

      xhr.onload = () => {
        console.log(`[Gallery] XHR onload: status=${xhr.status}, response=${xhr.responseText}`);
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
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        console.error('[Gallery] XHR onerror called');
        reject(new Error('网络请求失败'));
      };

      xhr.send(requestData);
    });
  }

  setupLazyLoading() {
    const images = document.querySelectorAll('.lazy-image');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;

          if (src && !img.src.includes(src)) {
            img.src = src;
            img.removeAttribute('data-src');

            img.onload = () => {
              img.classList.add('loaded');
            };

            img.onerror = () => {
              console.error(`[Gallery] Failed to load image: ${src}`);
              img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3C/svg%3E';
            };
          }

          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.01
    });

    images.forEach(img => imageObserver.observe(img));
  }

  animateImages() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach((item, index) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      setTimeout(() => {
        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  setViewMode(mode) {
    const oldMode = this.viewMode;
    this.viewMode = mode;
    localStorage.setItem('gallery-view-mode', mode);

    const gridBtn = document.getElementById('gridView');
    const listBtn = document.getElementById('listView');

    if (gridBtn) gridBtn.classList.toggle('is-active', mode === 'grid');
    if (listBtn) listBtn.classList.toggle('is-active', mode === 'list');

    const oldLimit = this.limit;
    this.limit = this.getOptimalLimit();
    
    if (oldLimit !== this.limit) {
      console.log(`[Gallery] View mode changed: ${oldMode} -> ${mode}, limit adjusted: ${oldLimit} -> ${this.limit}`);
      
      if (pager) {
        pager.update({ perPage: this.limit });
      }
    }

    this.render();
  }

  updateStats(total) {
    const statsEl = document.getElementById('galleryStats');
    if (statsEl) {
      statsEl.textContent = `共 ${total} 张图片`;
    }
  }

  showLoading(show) {
    let overlay = document.getElementById('galleryLoadingOverlay');

    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'galleryLoadingOverlay';
        overlay.className = 'gallery__loading-overlay';
        const loadingText = this.isFirstLoad 
          ? '<span class="loading-text">正在初始化图片库，请耐心等待...<span class="loading-dots"></span></span>'
          : '<span class="loading-text">加载中<span class="loading-dots"></span></span>';
        overlay.innerHTML = `
          <div class="gallery__loading">
            <div class="spinner"></div>
            ${loadingText}
          </div>
        `;
        document.body.appendChild(overlay);
      } else {
        const loadingTextEl = overlay.querySelector('.loading-text');
        if (loadingTextEl) {
          loadingTextEl.innerHTML = this.isFirstLoad 
            ? '正在初始化图片库，请耐心等待...<span class="loading-dots"></span>'
            : '加载中<span class="loading-dots"></span>';
        }
      }
      overlay.style.display = 'flex';
    } else {
      if (overlay) {
        overlay.style.display = 'none';
        if (this.isFirstLoad) {
          this.isFirstLoad = false;
        }
      }
    }
  }

  showError(message) {
    const container = document.getElementById('galleryContainer');
    if (container) {
      container.innerHTML = `
        <div class="gallery__empty">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto var(--spacing-lg); opacity: 0.3;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">出错了</p>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">${message}</p>
          <button class="btn btn--primary" style="margin-top: var(--spacing-lg);" onclick="location.reload()">重试</button>
        </div>
      `;
    }
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

let gallery;