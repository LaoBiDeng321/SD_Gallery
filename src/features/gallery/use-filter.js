class FilterManager {
  constructor() {
    this.storageKey = 'sd-gallery-filters';
    this.filters = {
      type: 'all',
      dateRange: 'all',
      search: '',
      model: '',
      lora: ''
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.restoreFilters();
  }

  bindEvents() {
    const typeOptions = document.querySelectorAll('[data-filter-type]');
    typeOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.filterType;
        this.setType(type);
      });
    });

    const dateOptions = document.querySelectorAll('[data-filter-date]');
    dateOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const dateRange = e.currentTarget.dataset.filterDate;
        this.setDateRange(dateRange);
      });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.setSearch(e.target.value);
        }, 600); // 增加到600ms，减少频繁请求
      });
    }

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }

    const viewOptions = document.querySelectorAll('[data-filter-view]');
    viewOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.filterView;

        viewOptions.forEach(opt => opt.classList.remove('is-active'));
        e.currentTarget.classList.add('is-active');

        if (view === 'trash') {
          if (trashManager && !trashManager.isTrashView) {
            trashManager.enterTrashView(this.getFilters());
          }
        } else if (view === 'gallery') {
          if (trashManager && trashManager.isTrashView) {
            trashManager.leaveTrashView();
          }
          this.emitChange();
        }
      });
    });
  }

  saveFilters() {
    const filtersToSave = {
      type: this.filters.type,
      dateRange: this.filters.dateRange,
      search: this.filters.search,
      model: this.filters.model,
      lora: this.filters.lora,
      savedAt: Date.now()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(filtersToSave));
  }

  restoreFilters() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const savedFilters = JSON.parse(saved);

        if (savedFilters.type) {
          this.setType(savedFilters.type);
        }
        if (savedFilters.dateRange) {
          this.setDateRange(savedFilters.dateRange);
        }
        if (savedFilters.search) {
          this.setSearch(savedFilters.search);
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.value = savedFilters.search;
          }
        }
        if (savedFilters.model !== undefined) {
          this.setModel(savedFilters.model);
        }
        if (savedFilters.lora !== undefined) {
          this.setLora(savedFilters.lora);
        }
        // setType/setDateRange/setSearch 内部已处理 emitChange，无需重复触发
        return;
      } catch (e) {
        console.error('Failed to restore filters:', e);
      }
    }

    this.restoreFromURL();
  }

  setType(type) {
    if (this.filters.type === type) {
      console.log(`[Filter] Type already set to '${type}', skipping update`);
      return;
    }

    console.log(`[Filter] Changing type from '${this.filters.type}' to '${type}'`);
    this.filters.type = type;
    document.querySelectorAll('[data-filter-type]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterType === type);
    });
    this.saveFilters();
    this.emitChange();
  }

  setDateRange(range) {
    if (this.filters.dateRange === range) {
      console.log(`[Filter] Date range already set to '${range}', skipping update`);
      return;
    }

    console.log(`[Filter] Changing date range from '${this.filters.dateRange}' to '${range}'`);
    this.filters.dateRange = range;

    const now = new Date();
    let dateFrom = null;

    switch (range) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'all':
      default:
        dateFrom = null;
        break;
    }

    this.filters.dateFrom = dateFrom ? dateFrom.toISOString().split('T')[0] : null;
    this.filters.dateTo = null;

    document.querySelectorAll('[data-filter-date]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterDate === range);
    });

    this.saveFilters();
    this.emitChange();
  }

  setSearch(search) {
    if (this.filters.search === search) {
      return;
    }

    console.log(`[Filter] Changing search from '${this.filters.search}' to '${search}'`);
    this.filters.search = search;
    this.saveFilters();
    this.emitChange();
  }

  setModel(model) {
    if (this.filters.model === model) {
      return;
    }

    console.log(`[Filter] Changing model from '${this.filters.model}' to '${model}'`);
    this.filters.model = model;

    // 同步更新ModelFilterManager的UI状态
    if (typeof modelFilterManager !== 'undefined' && modelFilterManager) {
      modelFilterManager.selectedModel = model;
      document.querySelectorAll('[data-filter-model]').forEach(option => {
        option.classList.toggle('is-active', option.dataset.filterModel === model);
      });
    }

    this.saveFilters();
    this.emitChange();
  }

  setLora(lora) {
    if (this.filters.lora === lora) {
      return;
    }

    console.log(`[Filter] Changing lora from '${this.filters.lora}' to '${lora}'`);
    this.filters.lora = lora;

    // 同步更新LoraFilterManager的UI状态
    if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
      loraFilterManager.selectedLora = lora;
      document.querySelectorAll('[data-filter-lora]').forEach(option => {
        option.classList.toggle('is-active', option.dataset.filterLora === lora);
      });
    }

    this.saveFilters();
    this.emitChange();
  }

  reset() {
    this.filters = {
      type: 'all',
      dateRange: 'all',
      dateFrom: null,
      dateTo: null,
      search: '',
      model: '',
      lora: ''
    };

    document.querySelectorAll('.filter-option').forEach(option => {
      option.classList.remove('is-active');
    });

    const allOption = document.querySelector('[data-filter-type="all"]');
    if (allOption) {
      allOption.classList.add('is-active');
    }

    const allDateOption = document.querySelector('[data-filter-date="all"]');
    if (allDateOption) {
      allDateOption.classList.add('is-active');
    }

    const galleryViewOption = document.querySelector('[data-filter-view="gallery"]');
    if (galleryViewOption) {
      document.querySelectorAll('[data-filter-view]').forEach(opt => opt.classList.remove('is-active'));
      galleryViewOption.classList.add('is-active');
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }

    // 重置模型筛选
    if (typeof modelFilterManager !== 'undefined' && modelFilterManager) {
      modelFilterManager.reset();
    }

    // 重置 LoRA 筛选
    if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
      loraFilterManager.reset();
    }

    this.saveFilters();
    this.emitChange();
  }

  getFilters() {
    return { ...this.filters };
  }

  restoreFromURL() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('type')) {
      this.setType(params.get('type'));
    }
    if (params.has('date_from')) {
      this.filters.dateFrom = params.get('date_from');
    }
    if (params.has('date_to')) {
      this.filters.dateTo = params.get('date_to');
    }
    if (params.has('search')) {
      this.setSearch(params.get('search'));
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = params.get('search');
      }
    }
    if (params.has('model')) {
      this.setModel(params.get('model'));
    }
    if (params.has('lora')) {
      this.setLora(params.get('lora'));
    }
  }

  emitChange() {
    window.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: this.getFilters()
    }));
  }
}

const filterManager = new FilterManager();