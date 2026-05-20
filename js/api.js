const API_BASE_URL = 'http://localhost:5000/api';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = url;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
  }

  async fetchImages(filters = {}) {
    const params = new URLSearchParams();

    if (filters.type && filters.type !== 'all') {
      params.append('type', filters.type);
    }
    if (filters.dateFrom) {
      params.append('date_from', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('date_to', filters.dateTo);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const queryString = params.toString();
    const cacheKey = `/images?${queryString}`;

    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const endpoint = `/images${queryString ? `?${queryString}` : ''}`;
    return await this.request(endpoint);
  }

  async fetchImageMeta(path) {
    const encodedPath = encodeURIComponent(path);
    return await this.request(`/image/${encodedPath}/meta`);
  }

  async fetchStats() {
    const cacheKey = '/stats';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }
    return await this.request('/stats');
  }

  async downloadImage(path) {
    const encodedPath = encodeURIComponent(path);
    window.open(`${this.baseURL}/download/${encodedPath}`, '_blank');
  }
}

const api = new APIClient();
