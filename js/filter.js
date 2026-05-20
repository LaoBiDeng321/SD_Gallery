class FilterManager {
  constructor() {
    this.storageKey = 'sd-gallery-filters';
    this.filters = {
      type: 'all',
      dateRange: 'all',
      search: '',
      favorites: false
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

    const favoritesToggle = document.getElementById('favoritesFilter');
    if (favoritesToggle) {
      favoritesToggle.addEventListener('click', () => {
        this.toggleFavorites();
      });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.setSearch(e.target.value);
        }, 300);
      });
    }

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }
  }

  saveFilters() {
    const filtersToSave = {
      type: this.filters.type,
      dateRange: this.filters.dateRange,
      search: this.filters.search,
      favorites: this.filters.favorites,
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
        if (savedFilters.favorites) {
          this.filters.favorites = true;
          const btn = document.getElementById('favoritesFilter');
          if (btn) {
            btn.classList.add('is-active');
          }
        }

        this.emitChange();
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

  toggleFavorites() {
    console.log(`[Filter] Toggling favorites from '${this.filters.favorites}' to '${!this.filters.favorites}'`);
    this.filters.favorites = !this.filters.favorites;
    const btn = document.getElementById('favoritesFilter');
    if (btn) {
      btn.classList.toggle('is-active', this.filters.favorites);
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
      favorites: false
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

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }

    this.saveFilters();
    this.emitChange();
  }

  getFilters() {
    const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
    return {
      ...this.filters,
      favoriteIds
    };
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
    if (params.has('favorites')) {
      this.filters.favorites = true;
      const btn = document.getElementById('favoritesFilter');
      if (btn) {
        btn.classList.add('is-active');
      }
    }
  }

  emitChange() {
    window.dispatchEvent(new CustomEvent('filtersChanged', {
      detail: this.getFilters()
    }));
  }
}

const filterManager = new FilterManager();
