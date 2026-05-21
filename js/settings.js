class SettingsManager {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    this.createOverlay();
    this.loadSettings();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'settings-overlay';
    this.overlay.id = 'settingsOverlay';
    this.overlay.innerHTML = `
      <div class="settings-modal">
        <div class="settings-modal__header">
          <h3 class="settings-modal__title">设置</h3>
          <button class="btn btn--ghost btn--icon" id="settingsClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="settings-modal__body">
          <div class="settings-section">
            <div class="settings-section__info">
              <div class="settings-section__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>
              <div class="settings-section__text">
                <div class="settings-section__label">软删除模式</div>
                <div class="settings-section__desc">开启后删除操作将文件移至回收站而非直接删除，可在回收站中恢复或彻底删除</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="softDeleteToggle" />
              <span class="toggle__slider"></span>
            </label>
          </div>

          <div class="settings-section">
            <div class="settings-section__info">
              <div class="settings-section__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div class="settings-section__text">
                <div class="settings-section__label">显示NSFW内容</div>
                <div class="settings-section__desc">开启后直接显示被标记为NSFW的图片，关闭时将模糊遮挡处理</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="nsfwToggle" />
              <span class="toggle__slider"></span>
            </label>
          </div>

          <div class="nsfw-keywords" id="nsfwKeywordsSection">
            <div class="nsfw-keywords__header">
              <h4 class="nsfw-keywords__title">NSFW 关键词管理</h4>
              <p class="nsfw-keywords__desc">添加关键词后，包含这些词的图片将被标记为NSFW。多个关键词用逗号分隔。</p>
            </div>
            <div class="nsfw-keywords__input-row">
              <input type="text" class="input" id="nsfwKeywordInput" placeholder="输入关键词，逗号分隔" autocomplete="off" />
              <button class="btn btn--primary btn--sm" id="nsfwKeywordAddBtn">添加</button>
            </div>
            <div class="nsfw-keywords__list" id="nsfwKeywordList"></div>
          </div>
        </div>
        <div class="settings-modal__footer">
          <button class="btn btn--secondary" id="settingsCancel">取消</button>
          <button class="btn btn--primary" id="settingsSave">保存设置</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('settingsClose').addEventListener('click', () => this.hide());
    document.getElementById('settingsCancel').addEventListener('click', () => this.hide());
    document.getElementById('settingsSave').addEventListener('click', () => this.save());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    this.bindNSFWToggle();
    this.bindKeywordInput();
  }

  bindNSFWToggle() {
    const toggle = document.getElementById('nsfwToggle');
    if (!toggle) return;
    toggle.addEventListener('change', () => {
      const show = toggle.checked;
      nsfwDetector.setDisplay(show);
      gallery.render();
      if (show) {
        modal.showConfirm(
          '是否记住NSFW显示偏好？',
          '选择"是"将在下次访问时保持当前设置，选择"否"则每次刷新页面后恢复为隐藏状态。',
          () => {
            nsfwDetector.setKeepPreference('yes');
            modal.showToast('NSFW偏好已保存');
          },
          () => {
            nsfwDetector.setKeepPreference('no');
          },
          '是',
          '否'
        );
      }
    });
  }

  bindKeywordInput() {
    const input = document.getElementById('nsfwKeywordInput');
    const addBtn = document.getElementById('nsfwKeywordAddBtn');
    if (!input || !addBtn) return;

    const addKeywords = () => {
      const raw = input.value.trim();
      if (!raw) return;
      const words = raw.split(/[,，]/).map(w => w.trim().toLowerCase()).filter(Boolean);
      if (words.length === 0) return;
      const existing = new Set(nsfwDetector.keywords);
      const newWords = words.filter(w => !existing.has(w));
      if (newWords.length === 0) {
        modal.showToast('关键词已存在', 'error');
        return;
      }
      nsfwDetector.keywords.push(...newWords);
      nsfwDetector.saveKeywords();
      input.value = '';
      this.renderKeywordList();
      gallery.render();
      modal.showToast(`已添加 ${newWords.length} 个关键词`);
    };

    addBtn.addEventListener('click', addKeywords);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addKeywords();
    });
  }

  renderKeywordList() {
    const list = document.getElementById('nsfwKeywordList');
    if (!list) return;
    const words = nsfwDetector.keywords;
    if (words.length === 0) {
      list.innerHTML = '<p class="nsfw-keywords__empty">暂未添加关键词</p>';
      return;
    }
    list.innerHTML = words.map((w, i) => `
      <span class="nsfw-keyword-tag">
        ${w}
        <button class="nsfw-keyword-tag__remove" data-index="${i}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </span>
    `).join('');

    list.querySelectorAll('.nsfw-keyword-tag__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        nsfwDetector.keywords.splice(idx, 1);
        nsfwDetector.saveKeywords();
        this.renderKeywordList();
        gallery.render();
      });
    });
  }

  loadSettings() {
    const softDelete = localStorage.getItem('sd-gallery-soft-delete');
    const toggle = document.getElementById('softDeleteToggle');
    if (toggle) {
      toggle.checked = softDelete === 'true';
    }

    const nsfwToggle = document.getElementById('nsfwToggle');
    if (nsfwToggle) {
      nsfwToggle.checked = nsfwDetector.shouldDisplay();
    }

    this.renderKeywordList();
  }

  show() {
    this.loadSettings();
    this.overlay.classList.add('is-visible');
  }

  hide() {
    this.overlay.classList.remove('is-visible');
  }

  save() {
    const softToggle = document.getElementById('softDeleteToggle');
    const enabled = softToggle.checked;
    localStorage.setItem('sd-gallery-soft-delete', enabled ? 'true' : 'false');
    this.hide();
    modal.showToast('设置已保存');
  }

  isSoftDeleteEnabled() {
    return localStorage.getItem('sd-gallery-soft-delete') === 'true';
  }

  getMode() {
    return this.isSoftDeleteEnabled() ? 'soft' : 'hard';
  }
}

const settingsManager = new SettingsManager();