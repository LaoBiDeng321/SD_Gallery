/**
 * 模型筛选管理器
 * 负责模型分类的状态管理、UI渲染和事件绑定
 */

class ModelFilterManager {
  constructor() {
    this.container = null;
    this.models = [];
    this.selectedModel = '';
    this.isExpanded = false;
    this.maxVisibleItems = 8; // 默认显示的模型数量
    this.init();
  }

  async init() {
    this.container = document.getElementById('modelFilterContainer');
    if (!this.container) {
      console.warn('[ModelFilter] Container not found');
      return;
    }

    await this.loadModels();
    this.render();
    this.bindEvents();
    this.syncWithFilterManager();
  }

  syncWithFilterManager() {
    // 渲染完成后，从 FilterManager 同步已保存的筛选状态
    // 解决刷新页面后 filterManager 恢复状态时 DOM 尚未渲染的问题
    if (typeof filterManager !== 'undefined' && filterManager && filterManager.filters.model) {
      const savedModel = filterManager.filters.model;
      console.log(`[ModelFilter] Syncing UI with saved model: '${savedModel}'`);
      this.selectedModel = savedModel;
      document.querySelectorAll('[data-filter-model]').forEach(option => {
        option.classList.toggle('is-active', option.dataset.filterModel === savedModel);
      });
    }
  }

  async loadModels() {
    try {
      const response = await api.fetchModels();
      if (response.success && response.data) {
        this.models = response.data.models || [];
        console.log(`[ModelFilter] Loaded ${this.models.length} models`);
      }
    } catch (error) {
      console.error('[ModelFilter] Failed to load models:', error);
    }
  }

  render() {
    if (!this.container) return;

    const hasModels = this.models.length > 0;

    this.container.innerHTML = `
      <div class="sidebar__section ${!hasModels ? 'is-hidden' : ''}">
        <h3 class="sidebar__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          模型分类
        </h3>
        <div class="filter-group filter-group--scrollable" id="modelFilterList">
          <div class="filter-option is-active" data-filter-model="">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
            <span>全部模型</span>
          </div>
          ${this.models.slice(0, this.maxVisibleItems).map(model => {
            // 使用规范化名称作为筛选值，显示名称用于展示
            const filterValue = model.normalized || model.name;
            const displayName = model.name;
            const hasAliases = model.aliases && model.aliases.length > 1;
            const aliasTooltip = hasAliases ? ` (包含 ${model.aliases.length} 个变体: ${model.aliases.join(', ')})` : '';

            return `
              <div class="filter-option" data-filter-model="${this.escapeHtml(filterValue)}">
                <span class="filter-option__label" title="${this.escapeHtml(displayName + aliasTooltip)}">${this.escapeHtml(displayName)}</span>
                ${hasAliases ? `<span class="filter-option__badge">+${model.aliases.length - 1}</span>` : ''}
              </div>
            `;
          }).join('')}
          ${this.models.length > this.maxVisibleItems ? `
            <button class="btn btn--ghost btn--sm model-filter__toggle" id="modelToggleBtn">
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

    // 模型选项点击事件（使用事件委托）
    const modelList = document.getElementById('modelFilterList');
    if (modelList) {
      modelList.addEventListener('click', (e) => {
        const option = e.target.closest('[data-filter-model]');
        if (option && !option.classList.contains('model-filter__toggle')) {
          const model = option.dataset.filterModel;
          this.setModel(model);
        }
      });
    }

    // 展开/收起按钮
    const toggleBtn = document.getElementById('modelToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleExpand();
      });
    }
  }

  setModel(model) {
    if (this.selectedModel === model) {
      return; // 避免重复选择
    }

    console.log(`[ModelFilter] Changing model from '${this.selectedModel}' to '${model}'`);
    this.selectedModel = model;

    // 更新UI状态
    document.querySelectorAll('[data-filter-model]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterModel === model);
    });

    // 通知筛选管理器
    this.emitChange();
  }

  getModel() {
    return this.selectedModel;
  }

  reset() {
    this.selectedModel = '';
    document.querySelectorAll('[data-filter-model]').forEach(option => {
      option.classList.toggle('is-active', option.dataset.filterModel === '');
    });
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    const toggleBtn = document.getElementById('modelToggleBtn');
    const modelList = document.getElementById('modelFilterList');

    if (!modelList || !toggleBtn) return;

    if (this.isExpanded) {
      // 展开所有模型
      const allItems = this.models.map(model => {
        const filterValue = model.normalized || model.name;
        const displayName = model.name;
        const hasAliases = model.aliases && model.aliases.length > 1;

        return `
          <div class="filter-option ${filterValue === this.selectedModel ? 'is-active' : ''}" data-filter-model="${this.escapeHtml(filterValue)}">
            <span class="filter-option__label" title="${this.escapeHtml(displayName)}">${this.escapeHtml(displayName)}</span>
            ${hasAliases ? `<span class="filter-option__badge">+${model.aliases.length - 1}</span>` : ''}
          </div>
        `;
      }).join('');

      // 保留"全部模型"按钮和展开按钮
      const allOption = modelList.querySelector('[data-model=""]');
      const toggleBtnElement = toggleBtn.outerHTML;

      modelList.innerHTML = `
        <div class="filter-option ${!this.selectedModel ? 'is-active' : ''}" data-filter-model="">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span>全部模型</span>
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

  emitChange() {
    window.dispatchEvent(new CustomEvent('modelFilterChanged', {
      detail: { model: this.selectedModel }
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
    this.models = [];
    this.selectedModel = '';
  }
}

// 全局实例
const modelFilterManager = new ModelFilterManager();
