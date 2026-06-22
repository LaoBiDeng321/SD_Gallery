const pathPrefix = window.location.pathname.replace(/\/+$/, '');
const API_BASE_URL = `${window.location.origin}${pathPrefix}/api`;
window.API_BASE_URL = API_BASE_URL;

window.resolveApiPath = function(path) {
  if (!path || typeof path !== 'string') return path;
  if (path.startsWith('/api/')) {
    const prefix = window.location.pathname.replace(/\/+$/, '');
    return prefix + path;
  }
  return path;
};

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
    if (filters.model) {
      params.append('model', filters.model);
    }
    if (filters.lora) {
      params.append('lora', filters.lora);
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
    // 使用完整的 URL 作为 cacheKey（与 request 方法一致）
    const cacheKey = `${this.baseURL}/images${queryString ? `?${queryString}` : ''}`;

    console.log(`[API] fetchImages called with:`, filters);
    console.log(`[API] Request URL: /images${queryString ? `?${queryString}` : ''}`);

    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`[API] Cache HIT for:`, cacheKey);
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

  async fetchModels() {
    const cacheKey = '/models';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }
    return await this.request('/models');
  }

  async fetchLoras() {
    const cacheKey = '/loras';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }
    return await this.request('/loras');
  }

  async fetchLoraMappings() {
    const cacheKey = '/lora/mappings';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }
    return await this.request('/lora/mappings');
  }

  async addLoraMapping(rawName, displayName) {
    const result = await this.request('/lora/mappings/add', {
      method: 'POST',
      body: JSON.stringify({ rawName, displayName })
    });
    this.cache.delete(`${this.baseURL}/lora/mappings`);
    return result;
  }

  async removeLoraMapping(rawName) {
    const result = await this.request('/lora/mappings/remove', {
      method: 'POST',
      body: JSON.stringify({ rawName })
    });
    this.cache.delete(`${this.baseURL}/lora/mappings`);
    return result;
  }

  async downloadImage(path) {
    const encodedPath = encodeURIComponent(path);
    window.open(`${this.baseURL}/download/${encodedPath}`, '_blank');
  }

  async deleteImage(path, mode = 'hard') {
    const result = await this.request('/delete', {
      method: 'POST',
      body: JSON.stringify({ path, mode })
    });
    this.clearCache();
    return result;
  }

  async fetchTrashList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return await this.request(`/trash/list${qs ? `?${qs}` : ''}`);
  }

  async restoreTrashItem(trashName) {
    const result = await this.request('/trash/restore', {
      method: 'POST',
      body: JSON.stringify({ trash_name: trashName })
    });
    this.clearCache();
    return result;
  }

  async deleteTrashItem(trashName) {
    const result = await this.request('/trash/delete', {
      method: 'POST',
      body: JSON.stringify({ trash_name: trashName })
    });
    this.clearCache();
    return result;
  }

  async emptyTrash() {
    const result = await this.request('/trash/empty', {
      method: 'POST',
      body: JSON.stringify({})
    });
    this.clearCache();
    return result;
  }

}

const api = new APIClient();
