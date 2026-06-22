class TrashManager {
  constructor() {
    this.items = [];
    this.currentPage = 1;
    this.limit = 20;
    this.totalPages = 1;
    this.totalItems = 0;
    this.isLoading = false;
    this._pendingAction = false;
    this.isTrashView = false;
  }

  async enterTrashView(filters = {}) {
    if (this.isTrashView) return;
    this.isTrashView = true;
    this.currentPage = 1;
    this.items = [];

    const galleryTitle = document.querySelector('.gallery__title');
    if (galleryTitle) {
      galleryTitle._originalText = galleryTitle.textContent;
      galleryTitle.textContent = '回收站';
    }

    const galleryStats = document.getElementById('galleryStats');
    if (galleryStats) {
      galleryStats._originalText = galleryStats.textContent;
    }

    await this._renderTrash(filters);
  }

  leaveTrashView() {
    if (!this.isTrashView) return;
    this.isTrashView = false;
    this.currentPage = 1;
    this.items = [];

    const galleryTitle = document.querySelector('.gallery__title');
    if (galleryTitle && galleryTitle._originalText) {
      galleryTitle.textContent = galleryTitle._originalText;
      delete galleryTitle._originalText;
    }

    const galleryStats = document.getElementById('galleryStats');
    if (galleryStats && galleryStats._originalText) {
      galleryStats.textContent = galleryStats._originalText;
      delete galleryStats._originalText;
    }

    const container = document.getElementById('galleryContainer');
    if (container) {
      container.innerHTML = '';
    }
  }

  async _renderTrash(filters = {}) {
    const container = document.getElementById('galleryContainer');
    if (!container) return;

    const result = await this.loadTrash(filters);
    if (!result) {
      container.innerHTML = this.renderEmpty();
      return;
    }

    if (result.items.length === 0) {
      container.innerHTML = this.renderEmpty();
    } else {
      container.innerHTML = `
        <div class="trash__list">
          ${result.items.map(item => this.renderTrashItem(item)).join('')}
        </div>
      `;
    }

    const galleryStats = document.getElementById('galleryStats');
    if (galleryStats) {
      galleryStats.textContent = `共 ${result.totalItems} 个文件`;
    }

    if (pager) {
      pager.update({
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        totalItems: this.totalItems,
        perPage: this.limit
      });
    }
  }

  async loadTrash(filters = {}) {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const response = await api.fetchTrashList({
        page: this.currentPage,
        limit: this.limit,
        search: filters.search || '',
        type: filters.type,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });

      if (response.success) {
        this.items = response.data.items || [];
        const pagination = response.data.pagination || {};
        this.totalPages = pagination.total_pages || 1;
        this.totalItems = pagination.total || 0;
        return {
          items: this.items,
          totalPages: this.totalPages,
          totalItems: this.totalItems
        };
      }
      return null;
    } catch (error) {
      console.error('[Trash] Failed to load:', error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  renderTrashItem(item) {
    const info = item.info || {};
    const deletedDate = item.deleted_at ? new Date(item.deleted_at) : null;
    const dateStr = deletedDate ? deletedDate.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
    const thumbnailSrc = window.resolveApiPath(info.thumbnail || '');

    return `
      <div class="trash-item" data-trash-name="${item.trash_name}">
        <div class="trash-item__thumbnail">
          <img src="${thumbnailSrc}" alt="${info.filename || '未知文件'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 80 80\\'%3E%3Crect fill=\\'%23f0f0f0\\' width=\\'80\\' height=\\'80\\'/%3E%3C/svg%3E'" />
        </div>
        <div class="trash-item__content">
          <div class="trash-item__title">${info.filename || item.original_path.split('/').pop()}</div>
          <div class="trash-item__meta">
            <span>原始路径: ${item.original_path}</span>
            <span>删除于: ${dateStr}</span>
            ${info.type ? `<span class="badge">${info.type}</span>` : ''}
          </div>
        </div>
        <div class="trash-item__actions">
          <button class="btn btn--primary btn--sm" onclick="trashManager.restoreItem('${item.trash_name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            恢复
          </button>
          <button class="btn btn--danger btn--sm" onclick="trashManager.confirmDeleteItem('${item.trash_name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            彻底删除
          </button>
        </div>
      </div>
    `;
  }

  renderEmpty() {
    return `
      <div class="trash__empty">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto var(--spacing-lg); opacity: 0.3;">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <p style="font-size: var(--font-size-lg); margin-bottom: var(--spacing-sm);">回收站为空</p>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);">已软删除的文件将出现在这里</p>
      </div>
    `;
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    if (this.isTrashView) {
      this._renderTrash(filterManager.getFilters());
    } else if (gallery) {
      gallery.loadImages(filterManager.getFilters());
    }
  }

  async restoreItem(trashName) {
    if (this._pendingAction) return;
    this._pendingAction = true;

    try {
      const response = await api.restoreTrashItem(trashName);
      if (response.success) {
        modal.showToast('文件已恢复');
        if (this.isTrashView) {
          this._renderTrash(filterManager.getFilters());
        } else if (gallery) {
          gallery.loadImages(filterManager.getFilters());
        }
      }
    } catch (error) {
      modal.showToast('恢复失败：' + error.message, 'error');
    } finally {
      this._pendingAction = false;
    }
  }

  confirmDeleteItem(trashName) {
    modal.showDeleteConfirm(
      trashName,
      async () => {
        if (this._pendingAction) return;
        this._pendingAction = true;

        try {
          const response = await api.deleteTrashItem(trashName);
          if (response.success) {
            modal.showToast('已彻底删除');
            if (this.isTrashView) {
              this._renderTrash(filterManager.getFilters());
            } else if (gallery) {
              gallery.loadImages(filterManager.getFilters());
            }
          }
        } catch (error) {
          modal.showToast('删除失败：' + error.message, 'error');
        } finally {
          this._pendingAction = false;
        }
      }
    );
  }

  confirmEmptyTrash() {
    modal.showDeleteConfirm(
      '回收站所有文件',
      async () => {
        if (this._pendingAction) return;
        this._pendingAction = true;

        try {
          const response = await api.emptyTrash();
          if (response.success) {
            modal.showToast('回收站已清空');
            if (this.isTrashView) {
              this._renderTrash(filterManager.getFilters());
            } else if (gallery) {
              gallery.loadImages(filterManager.getFilters());
            }
          }
        } catch (error) {
          modal.showToast('清空失败：' + error.message, 'error');
        } finally {
          this._pendingAction = false;
        }
      }
    );
  }

}

const trashManager = new TrashManager();