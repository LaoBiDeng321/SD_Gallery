class NSFWDetector {
  constructor() {
    this.keywords = [];
    this._displayEnabled = false;
    this._keepPreference = null;
    this._initialized = false;
  }

  async addKeywords(words) {
    const normalized = words.map(w => w.toLowerCase().trim()).filter(Boolean);
    if (normalized.length === 0) return;

    try {
      const response = await fetch((window.API_BASE_URL || '/api') + '/nsfw/keywords/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: normalized })
      });
      const result = await response.json();
      if (result.success) {
        this.keywords = result.data.keywords;
      }
    } catch (e) {
      console.error('[NSFW] Failed to add keywords:', e);
    }
  }

  async setKeywords(words) {
    const normalized = words.map(w => w.toLowerCase().trim()).filter(Boolean);

    try {
      const response = await fetch((window.API_BASE_URL || '/api') + '/nsfw/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: normalized })
      });
      const result = await response.json();
      if (result.success) {
        this.keywords = result.data.keywords;
      }
    } catch (e) {
      console.error('[NSFW] Failed to set keywords:', e);
    }
  }

  async removeKeywords(words) {
    const normalized = words.map(w => w.toLowerCase().trim()).filter(Boolean);
    if (normalized.length === 0) return;

    try {
      const response = await fetch((window.API_BASE_URL || '/api') + '/nsfw/keywords/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: normalized })
      });
      const result = await response.json();
      if (result.success) {
        this.keywords = result.data.keywords;
      }
    } catch (e) {
      console.error('[NSFW] Failed to remove keywords:', e);
    }
  }

  async loadKeywords() {
    try {
      const response = await fetch((window.API_BASE_URL || '/api') + '/nsfw/keywords');
      const result = await response.json();
      if (result.success) {
        this.keywords = result.data.keywords || [];
      }
    } catch (e) {
      console.error('[NSFW] Failed to load keywords:', e);
      this.keywords = [];
    }
    return this.keywords;
  }

  checkPrompt(prompt) {
    if (!prompt || this.keywords.length === 0) return false;
    const lower = prompt.toLowerCase();
    return this.keywords.some(kw => lower.includes(kw));
  }

  checkImage(image) {
    if (image.nsfw === true) return true;
    const metadata = image.metadata || {};
    const prompt = metadata.prompt || '';
    return this.checkPrompt(prompt);
  }

  async init() {
    if (this._initialized) return;

    await this.loadKeywords();

    const keep = localStorage.getItem('sd-gallery-nsfw-keep');
    this._keepPreference = keep;

    if (keep === 'yes') {
      const stored = localStorage.getItem('sd-gallery-nsfw-show');
      this._displayEnabled = stored === 'true';
    } else {
      this._displayEnabled = false;
    }

    this._initialized = true;
  }

  shouldDisplay() {
    return this._displayEnabled;
  }

  setDisplay(show) {
    this._displayEnabled = show;
    if (this._keepPreference === 'yes') {
      localStorage.setItem('sd-gallery-nsfw-show', show ? 'true' : 'false');
    }
  }

  setKeepPreference(keep) {
    this._keepPreference = keep;
    localStorage.setItem('sd-gallery-nsfw-keep', keep);
    if (keep === 'yes') {
      localStorage.setItem('sd-gallery-nsfw-show', this._displayEnabled ? 'true' : 'false');
    } else {
      localStorage.removeItem('sd-gallery-nsfw-show');
    }
  }

  hasKeepPreference() {
    return this._keepPreference !== null;
  }

  getKeepPreference() {
    return this._keepPreference;
  }
}

const nsfwDetector = new NSFWDetector();
