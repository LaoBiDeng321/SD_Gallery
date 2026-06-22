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
          <div class="nsfw-keywords" id="basicSettingsSection">
            <div class="nsfw-keywords__header collapse-header" id="basicCollapseHeader">
              <div class="collapse-header__left">
                <svg class="collapse-header__arrow" id="basicCollapseArrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <h4 class="nsfw-keywords__title">基本设置</h4>
              </div>
            </div>
            <div class="collapse-body" id="basicCollapseBody">
              <div class="settings-section">
                <div class="settings-section__info">
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
            </div>
          </div>

          <div class="nsfw-keywords" id="nsfwKeywordsSection">
            <div class="nsfw-keywords__header collapse-header" id="nsfwCollapseHeader">
              <div class="collapse-header__left">
                <svg class="collapse-header__arrow" id="nsfwCollapseArrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <h4 class="nsfw-keywords__title">NSFW 关键词管理</h4>
              </div>
              <span class="collapse-header__badge" id="nsfwKeywordCount">0</span>
            </div>
            <div class="collapse-body" id="nsfwCollapseBody">
              <p class="nsfw-keywords__desc">添加关键词后，包含这些词的图片将被标记为NSFW。多个关键词用逗号分隔。</p>
              <div class="nsfw-keywords__input-row">
                <input type="text" class="input" id="nsfwKeywordInput" placeholder="输入关键词，逗号分隔" autocomplete="off" />
                <button class="btn btn--primary btn--sm" id="nsfwKeywordAddBtn">添加</button>
              </div>
              <div class="nsfw-keywords__list" id="nsfwKeywordList"></div>
            </div>
          </div>

          <div class="nsfw-keywords" id="loraMappingSection">
            <div class="nsfw-keywords__header collapse-header" id="loraCollapseHeader">
              <div class="collapse-header__left">
                <svg class="collapse-header__arrow" id="loraCollapseArrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <h4 class="nsfw-keywords__title">LoRA 名称映射</h4>
              </div>
              <span class="collapse-header__badge" id="loraMappingCount">0</span>
            </div>
            <div class="collapse-body" id="loraCollapseBody">
              <p class="nsfw-keywords__desc">自定义 LoRA 在筛选列表中的显示名称。注意：原始名称仅输入 LoRA 名称部分，例如提示词中 <code style="background:var(--color-bg-tertiary);padding:1px 4px;border-radius:3px;">&lt;lora:my_lora:0.8&gt;</code> 只需输入 <code style="background:var(--color-bg-tertiary);padding:1px 4px;border-radius:3px;">my_lora</code>。</p>
              <div class="nsfw-keywords__input-row">
                <input type="text" class="input" id="loraMappingRawInput" placeholder="原始名称 (如: 20250313-1741871459493)" autocomplete="off" style="flex:1" />
                <input type="text" class="input" id="loraMappingDisplayInput" placeholder="显示名称 (如: 我的LoRA)" autocomplete="off" style="flex:1" />
                <button class="btn btn--primary btn--sm" id="loraMappingAddBtn">添加</button>
              </div>
              <div class="nsfw-keywords__list" id="loraAvailableList" style="margin-bottom: var(--spacing-md);"></div>
              <div class="nsfw-keywords__list" id="loraMappingList"></div>
            </div>
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

    // 阻止滚轮事件穿透到背景页面
    this.overlay.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // 阻止触摸滑动事件穿透到背景页面
    this.overlay.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    }, { passive: false });

    this.bindCollapseToggles();
    this.bindNSFWToggle();
    this.bindKeywordInput();
    this.bindLoraMappingInput();
  }

  bindCollapseToggles() {
    // 基本设置（默认展开）
    const basicHeader = document.getElementById('basicCollapseHeader');
    const basicBody = document.getElementById('basicCollapseBody');
    const basicArrow = document.getElementById('basicCollapseArrow');
    // NSFW 关键词（默认收起）
    const nsfwHeader = document.getElementById('nsfwCollapseHeader');
    const nsfwBody = document.getElementById('nsfwCollapseBody');
    const nsfwArrow = document.getElementById('nsfwCollapseArrow');
    // LoRA 映射（默认收起）
    const loraHeader = document.getElementById('loraCollapseHeader');
    const loraBody = document.getElementById('loraCollapseBody');
    const loraArrow = document.getElementById('loraCollapseArrow');

    // 所有设置默认收起
    if (basicBody) basicBody.classList.remove('is-expanded');
    if (basicArrow) basicArrow.style.transform = 'rotate(0deg)';
    if (nsfwBody) nsfwBody.classList.remove('is-expanded');
    if (loraBody) loraBody.classList.remove('is-expanded');

    const toggleSection = (header, body, arrow) => {
      if (!header || !body || !arrow) return;
      header.addEventListener('click', () => {
        const expanded = body.classList.toggle('is-expanded');
        arrow.style.transform = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
      });
    };

    toggleSection(basicHeader, basicBody, basicArrow);
    toggleSection(nsfwHeader, nsfwBody, nsfwArrow);
    toggleSection(loraHeader, loraBody, loraArrow);
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

    const addKeywords = async () => {
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
      await nsfwDetector.addKeywords(newWords);
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

  bindLoraMappingInput() {
    const rawInput = document.getElementById('loraMappingRawInput');
    const displayInput = document.getElementById('loraMappingDisplayInput');
    const addBtn = document.getElementById('loraMappingAddBtn');
    if (!rawInput || !displayInput || !addBtn) return;

    const addMapping = () => {
      const rawName = rawInput.value.trim();
      const displayName = displayInput.value.trim();
      if (!rawName || !displayName) {
        modal.showToast('请输入原始名称和显示名称', 'error');
        return;
      }
      this.addLoraMapping(rawName, displayName);
      rawInput.value = '';
      displayInput.value = '';
    };

    addBtn.addEventListener('click', addMapping);
    displayInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addMapping();
    });
    rawInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        displayInput.focus();
      }
    });
  }

  getLoraMappings() {
    // 优先从 loraFilterManager 获取（已从服务器同步）
    if (typeof loraFilterManager !== 'undefined' && loraFilterManager && loraFilterManager.mappings) {
      return { ...loraFilterManager.mappings };
    }
    // 回退到 localStorage
    try {
      const saved = localStorage.getItem('sd-gallery-lora-mappings');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('[Settings] Failed to load LoRA mappings:', error);
      return {};
    }
  }

  async addLoraMapping(rawName, displayName) {
    const mappings = this.getLoraMappings();

    // 检查是否已存在同名映射
    if (mappings[rawName] && mappings[rawName] === displayName) {
      modal.showToast('该映射已存在', 'error');
      return;
    }

    try {
      const response = await api.addLoraMapping(rawName, displayName);
      if (response && response.success) {
        this.renderLoraMappingList();

        // 刷新 LoRA 筛选列表的显示名称
        if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
          await loraFilterManager.refresh();
        }

        modal.showToast('LoRA 名称映射已添加');
      } else {
        modal.showToast('添加失败：' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('[Settings] Failed to add LoRA mapping via API:', error);
      // 回退到 localStorage
      mappings[rawName] = displayName;
      localStorage.setItem('sd-gallery-lora-mappings', JSON.stringify(mappings));
      this.renderLoraMappingList();
      if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
        loraFilterManager.loadMappings();
        loraFilterManager.render();
        loraFilterManager.bindEvents();
      }
      modal.showToast('已保存到本地（服务器不可用）');
    }
  }

  async removeLoraMapping(rawName) {
    try {
      const response = await api.removeLoraMapping(rawName);
      if (response && response.success) {
        this.renderLoraMappingList();

        // 刷新 LoRA 筛选列表的显示名称
        if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
          await loraFilterManager.refresh();
        }

        modal.showToast('LoRA 名称映射已删除');
      } else {
        modal.showToast('删除失败：' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('[Settings] Failed to remove LoRA mapping via API:', error);
      // 回退到 localStorage
      const mappings = this.getLoraMappings();
      if (mappings.hasOwnProperty(rawName)) {
        delete mappings[rawName];
        localStorage.setItem('sd-gallery-lora-mappings', JSON.stringify(mappings));
        this.renderLoraMappingList();
        if (typeof loraFilterManager !== 'undefined' && loraFilterManager) {
          loraFilterManager.loadMappings();
          loraFilterManager.render();
          loraFilterManager.bindEvents();
        }
        modal.showToast('已从本地删除（服务器不可用）');
      }
    }
  }

  renderLoraAvailableList() {
    const list = document.getElementById('loraAvailableList');
    if (!list) return;

    const loras = (typeof loraFilterManager !== 'undefined' && loraFilterManager)
      ? loraFilterManager.loras : [];

    if (loras.length === 0) {
      list.innerHTML = '<p class="nsfw-keywords__empty">暂未检测到 LoRA</p>';
      return;
    }

    list.innerHTML = `
      <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
        系统中检测到的 LoRA（点击可自动填入原始名称）：
      </div>
      ${loras.map(lora => `
        <span class="nsfw-keyword-tag lora-available-tag"
              data-raw="${this.escapeHtml(lora.name)}"
              style="border-color: rgba(16, 185, 129, 0.25); color: #10b981; background: rgba(16, 185, 129, 0.08); cursor: pointer;"
              title="点击填入原始名称">
          ${this.escapeHtml(lora.name)}
          <span style="font-size:10px;opacity:0.6;">(${lora.count})</span>
        </span>
      `).join('')}
    `;

    // 点击自动填入原始名称输入框
    list.querySelectorAll('.lora-available-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const rawInput = document.getElementById('loraMappingRawInput');
        const displayInput = document.getElementById('loraMappingDisplayInput');
        if (rawInput) {
          rawInput.value = tag.dataset.raw;
        }
        if (displayInput) {
          displayInput.focus();
        }
      });
    });
  }

  renderLoraMappingList() {
    const list = document.getElementById('loraMappingList');
    const countBadge = document.getElementById('loraMappingCount');
    if (!list) return;

    const mappings = this.getLoraMappings();
    const entries = Object.entries(mappings);
    if (countBadge) countBadge.textContent = entries.length;

    if (entries.length === 0) {
      list.innerHTML = '<p class="nsfw-keywords__empty">暂未添加映射</p>';
      return;
    }

    list.innerHTML = entries.map(([rawName, displayName]) => `
      <span class="nsfw-keyword-tag" style="border-color: rgba(74, 144, 217, 0.2); color: var(--color-accent); background: rgba(74, 144, 217, 0.1);">
        ${this.escapeHtml(rawName)} → ${this.escapeHtml(displayName)}
        <button class="nsfw-keyword-tag__remove" data-raw="${this.escapeHtml(rawName)}" style="color: var(--color-accent);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </span>
    `).join('');

    list.querySelectorAll('.nsfw-keyword-tag__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawName = btn.dataset.raw;
        if (rawName) {
          this.removeLoraMapping(rawName);
        }
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderKeywordList() {
    const list = document.getElementById('nsfwKeywordList');
    const countBadge = document.getElementById('nsfwKeywordCount');
    if (!list) return;
    const words = nsfwDetector.keywords;
    if (countBadge) countBadge.textContent = words.length;
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
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.index);
        const wordToRemove = nsfwDetector.keywords[idx];
        if (wordToRemove) {
          await nsfwDetector.removeKeywords([wordToRemove]);
        }
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
    this.renderLoraAvailableList();
    this.renderLoraMappingList();
  }

  show() {
    this.loadSettings();
    this.overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
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