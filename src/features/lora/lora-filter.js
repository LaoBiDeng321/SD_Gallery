/**
 * LoRA 筛选管理器
 * 负责 LoRA 分类的状态管理、UI渲染和事件绑定
 * 支持名称映射：用户可自定义 LoRA 在筛选列表中的显示名称
 */

class LoraFilterManager {
  constructor() {
    this.container = null;
    this.loras = [];
    this.selectedLora = '';
    this.isExpanded = false;
    this.maxVisibleItems = 8; // 默认显示的 LoRA 数量
    this.mappings = {}; // 名称映射表: { rawName: displayName }
    this.init();
  }

  async init() {
    this.container = document.getElementById('loraFilterContainer');
    if (!this.container) {
      console.warn('[LoraFilter] Container not found');
      return;
    }

    this.loadMappings();
    await this.loadMappingsFromServer();
    await this.loadLoras();
    this.render();
    this.bindEvents();
    this.syncWithFilterManager();
  }

  syncWithFilterManager() {
    // 渲染完成后，从 FilterManager 同步已保存的筛选状态
    // 解决刷新页面后 filterManager 恢复状态时 DOM 尚未渲染的问题
    if (typeof filterManager !== 'undefined' && filterManager && filterManager.filters.lora) {
      const savedLora = filterManager.filters.lora;
      console.log(`[LoraFilter] Syncing UI with saved lora: '${savedLora}'`);
      this.selectedLora = savedLora;
      document.querySelectorAll('[data-filter-lora]').forEach(option => {
        option.classList.toggle('is-active', option.dataset.filterLora === savedLora);
      });
    }
  }

  loadMappings() {
    // 从 localStorage 加载作为快速回退，后续由 API 数据覆盖
    try {
      const saved = localStorage.getItem('sd-gallery-lora-mappings');
      if (saved) {
        this.mappings = JSON.parse(saved);
      }
    } catch (error) {
      console.error('[LoraFilter] Failed to load mappings from localStorage:', error);
      this.mappings = {};
    }
  }

  async loadMappingsFromServer() {
    try {
      const response = await api.fetchLoraMappings();
      if (response.success && response.data) {
        this.mappings = response.data.mappings || {};
        // 同步到 localStorage 作为离线回退
        localStorage.setItem('sd-gallery-lora-mappings', JSON.stringify(this.mappings));
        console.log(`[LoraFilter] Loaded ${Object.keys(this.mappings).length} name mappings from server`);
      }
    } catch (error) {
      console.error('[LoraFilter] Failed to load mappings from server, using localStorage fallback:', error);
    }
  }

  getDisplayName(rawName) {
    // 优先返回映射后的显示名称，无映射则返回原名
    return this.mappings[rawName] || rawName;
  }

  async loadLoras() {
    try {
      const response = await api.fetchLoras();
      if (response.success && response.data) {
        this.loras = response.data.loras || [];
        console.log(`[LoraFilter] Loaded ${this.loras.length} loras`);
      }
    } catch (error) {
      console.error('[LoraFilter] Failed to load loras:', error);
    }
  }

  render() {
    if (!this.container) return;

    const hasLoras = this.loras.length > 0;

    this.container.innerHTML = `
      <div class="sidebar__section ${!hasLoras ? 'is-hidden' : ''}">
        <h3 class="sidebar__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          LoRA 分类
        </h3>
        <div class="filter-group filter-group--scrollable" id="loraFilterList">
          <div class="filter-option is-active" data-filter-lora="">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>全部 LoRA</span>
          </div>
          ${this.loras.slice(0, this.maxVisibleItems).map(lora => {
            const displayName = this.getDisplayName(lora.name);
            const hasMapping = this.mappings.hasOwnProperty(lora.name);
            const mappingTooltip = hasMapping ? ` (原始名称: ${this.escapeHtml(lora.name)})` : '';

            return `
              <div class="filter-option" data-filter-lora="${this.escapeHtml(lora.name)}">
                <span class="filter-option__label" title="${this.escapeHtml(displayName + mappingTooltip)}">${this.escapeHtml(displayName)}</span>
              </div>
            `;
          }).join('')}
          ${this.loras.length > this.maxVisibleItems ? `
            <button class="btn btn--ghost btn--sm model-filter__toggle" id="loraToggleBtn">
              <span>展开更多</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    // LoRA 选项点击事件（使用事件委托）
    const loraList = document.getElementById('loraFilterList');
    if (loraList) {
      loraList.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-lora]');
        if (option && !option.classList.contains('model-filter__toggle')) {
          const lora = option.dataset.filterLora;
          this.setLora(lora);
        }
      });
    }

    // 展开/收起按钮
    const toggleBtn = document.getElementById('loraToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleExpand();
      });
    }
  }

  setLora(lora) {
    if (this.selectedLora === lora) {
      return; // 避免重复选择
    }

    console.log(`[LoraFilter] Changing lora from '${this.selectedLora}' to '${lora}'`);
    this.selectedLora = lora;

    // 更新UI状态
    document.querySelectorAll('[data-filter-lora]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterLora === lora);
    });

    // 通知筛选管理器
    this.emitChange();
  }

  getLora() {
    return this.selectedLora;
  }

  reset() {
    this.selectedLora = '';
    document.querySelectorAll('[data-filter-lora]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterLora === '');
    });
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    const toggleBtn = document.getElementById('loraToggleBtn');
    const loraList = document.getElementById('loraFilterList');

    if (!loraList || !toggleBtn) return;

    if (this.isExpanded) {
      // 展开所有 LoRA
      const allItems = this.loras.map(lora => {
        const displayName = this.getDisplayName(lora.name);
        const hasMapping = this.mappings.hasOwnProperty(lora.name);
        const mappingTooltip = hasMapping ? ` (原始名称: ${this.escapeHtml(lora.name)})` : '';

        return `
          <div class="filter-option ${lora.name === this.selectedLora ? 'is-active' : ''}" data-filter-lora="${this.escapeHtml(lora.name)}">
            <span class="filter-option__label" title="${this.escapeHtml(displayName + mappingTooltip)}">${this.escapeHtml(displayName)}</span>
          </div>
        `;
      }).join('');

      // 保留"全部 LoRA"按钮和展开按钮
      const toggleBtnElement = toggleBtn.outerHTML;

      loraList.innerHTML = `
        <div class="filter-option ${!this.selectedLora ? 'is-active' : ''}" data-filter-lora="">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span>全部 LoRA</span>
        </div>
        ${allItems}
        ${toggleBtnElement.replace('展开更多', '收起').replace('<polyline points="6 9 12 15 18 9">', '<polyline points="18 15 12 9 6 15">')}
      `;

      // 重新绑定事件
      this.bindEvents();
    } else {
      // 收起，重新渲染
      this.render();
      this.bindEvents();
    }
  }

  async refresh() {
    // 重新加载映射并重新渲染（由 SettingsManager 在映射变更后调用）
    this.loadMappings();
    await this.loadMappingsFromServer();
    this.render();
    this.bindEvents();
  }

  emitChange() {
    window.dispatchEvent(new CustomEvent('loraFilterChanged', {
      detail: { lora: this.selectedLora }
    }));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.loras = [];
    this.selectedLora = '';
  }
}

// 全局实例
const loraFilterManager = new LoraFilterManager();
