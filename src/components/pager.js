class Pager {
  constructor(options = {}) {
    this.currentPage = options.currentPage || 1;
    this.totalPages = options.totalPages || 1;
    this.totalItems = options.totalItems || 0;
    this.perPage = options.perPage || 20;
    this.maxVisiblePages = this.detectMaxVisiblePages();
    this.containerId = options.containerId || 'pagerContainer';
    this.onPageChange = options.onPageChange || (() => {});

    this.init();
  }

  detectMaxVisiblePages() {
    return window.innerWidth <= 768 ? 5 : 7;
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error('[Pager] Container not found:', this.containerId);
      return;
    }

    this.restorePage();
    this.render();
  }

  restorePage() {
    const saved = localStorage.getItem('sd-gallery-page');
    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        if (savedData.page && savedData.page <= this.totalPages) {
          this.currentPage = savedData.page;
          console.log('[Pager] Restored page:', this.currentPage);
        }
      } catch (e) {
        console.error('[Pager] Failed to restore page:', e);
      }
    }
  }

  savePage() {
    const saveData = {
      page: this.currentPage,
      timestamp: Date.now()
    };
    localStorage.setItem('sd-gallery-page', JSON.stringify(saveData));
    console.log('[Pager] Saved page:', this.currentPage);
  }

  update(options = {}) {
    if (options.totalPages !== undefined) {
      this.totalPages = options.totalPages;
    }
    if (options.totalItems !== undefined) {
      this.totalItems = options.totalItems;
    }
    if (options.perPage !== undefined) {
      this.perPage = options.perPage;
    }
    if (options.currentPage !== undefined) {
      this.currentPage = Math.max(1, Math.min(options.currentPage, this.totalPages));
    }

    this.render();
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.savePage();
    this.render();
    this.onPageChange(page);

    console.log(`[Pager] Navigating to page ${page}/${this.totalPages}`);
  }

  goToFirst() {
    this.goToPage(1);
  }

  goToLast() {
    this.goToPage(this.totalPages);
  }

  goToPrev() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNext() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getVisiblePages() {
    const pages = [];
    const halfVisible = Math.floor(this.maxVisiblePages / 2);
    let startPage = Math.max(1, this.currentPage - halfVisible);
    let endPage = Math.min(this.totalPages, startPage + this.maxVisiblePages - 1);

    if (endPage - startPage < this.maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - this.maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== this.totalPages) {
        pages.push(i);
      }
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }

    return pages;
  }

  render() {
    if (!this.container) return;

    if (this.totalPages <= 1) {
      this.container.innerHTML = '';
      return;
    }

    const pages = this.getVisiblePages();
    const startItem = (this.currentPage - 1) * this.perPage + 1;
    const endItem = Math.min(this.currentPage * this.perPage, this.totalItems);

    const html = `
      <div class="pager">
        <div class="pager__info">
          第 ${startItem}-${endItem} 项，共 ${this.totalItems} 项
        </div>

        <div class="pager__nav">
          <button
            class="pager__btn pager__btn--nav"
            onclick="pager.goToFirst()"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="首页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>

          <button
            class="pager__btn pager__btn--nav"
            onclick="pager.goToPrev()"
            ${this.currentPage === 1 ? 'disabled' : ''}
            title="上一页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <div class="pager__pages">
            ${pages.map(page => {
              if (page === '...') {
                return `<span class="pager__btn pager__btn--ellipsis">...</span>`;
              }

              const isCurrent = page === this.currentPage;
              return `
                <button
                  class="pager__btn ${isCurrent ? 'is-current' : ''}"
                  onclick="pager.goToPage(${page})"
                  ${isCurrent ? 'disabled' : ''}
                >
                  ${page}
                </button>
              `;
            }).join('')}
          </div>

          <button
            class="pager__btn pager__btn--nav"
            onclick="pager.goToNext()"
            ${this.currentPage === this.totalPages ? 'disabled' : ''}
            title="下一页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <button
            class="pager__btn pager__btn--nav"
            onclick="pager.goToLast()"
            ${this.currentPage === this.totalPages ? 'disabled' : ''}
            title="末页"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <div class="pager__loading" id="pagerLoading" style="display: none;">
        <div class="spinner"></div>
        <span class="pager__loading-text">加载中...</span>
      </div>
    `;

    this.container.innerHTML = html;
  }

  showLoading() {
    const loadingEl = document.getElementById('pagerLoading');
    if (loadingEl) {
      loadingEl.style.display = 'flex';
    }
  }

  hideLoading() {
    const loadingEl = document.getElementById('pagerLoading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  reset() {
    this.currentPage = 1;
    this.savePage();
    this.render();
  }
}

let pager;
