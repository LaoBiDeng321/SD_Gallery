class ThemeManager {
  constructor() {
    this.storageKey = 'sd-gallery-theme';
    this.currentTheme = 'light';
    this.init();
  }

  init() {
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = this.detectSystemTheme();
    }
    this.applyTheme(this.currentTheme);
    this.bindEvents();
  }

  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
  }

  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    localStorage.setItem(this.storageKey, newTheme);
  }

  savePreference() {
    localStorage.setItem(this.storageKey, this.currentTheme);
  }

  bindEvents() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

const themeManager = new ThemeManager();
