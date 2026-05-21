class NSFWDetector {
  constructor() {
    this.keywords = [];
    this._displayEnabled = false;
    this._keepPreference = null;
    this._initialized = false;
  }

  addKeywords(words) {
    const normalized = words.map(w => w.toLowerCase().trim()).filter(Boolean);
    this.keywords.push(...normalized);
    this.saveKeywords();
  }

  setKeywords(words) {
    this.keywords = words.map(w => w.toLowerCase().trim()).filter(Boolean);
    this.saveKeywords();
  }

  loadKeywords() {
    const stored = localStorage.getItem('sd-gallery-nsfw-keywords');
    if (stored) {
      this.keywords = stored.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
    } else {
      this.keywords = [];
    }
    return this.keywords;
  }

  saveKeywords() {
    localStorage.setItem('sd-gallery-nsfw-keywords', this.keywords.join(','));
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

  init() {
    if (this._initialized) return;

    this.loadKeywords();

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