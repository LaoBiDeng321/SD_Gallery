class Modal {
  constructor() {
    this.activeModal = null;
  }

  show(options = {}) {
    const {
      title = '',
      content = '',
      onConfirm = null,
      onCancel = null,
      confirmText = '确认',
      cancelText = '取消',
      confirmClass = 'btn--primary',
      showCancel = true,
      modalClass = ''
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalOverlay';

    overlay.innerHTML = `
      <div class="modal ${modalClass}">
        <div class="modal__header">
          <h3 class="modal__title">${title}</h3>
        </div>
        <div class="modal__body">
          ${content}
        </div>
        <div class="modal__footer">
          ${showCancel ? `<button class="btn btn--secondary" id="modalCancel">${cancelText}</button>` : ''}
          <button class="btn ${confirmClass}" id="modalConfirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (onConfirm) {
          const result = onConfirm();
          if (result !== false) {
            this.hide();
          }
        } else {
          this.hide();
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (onCancel) {
          onCancel();
        }
        this.hide();
      });
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onCancel) {
          onCancel();
        }
        this.hide();
      }
    });

    document.addEventListener('keydown', this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) {
          onCancel();
        }
        this.hide();
      }
    });

    setTimeout(() => {
      const firstInput = overlay.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  hide() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }

    document.removeEventListener('keydown', this.handleEscape);
  }

  showConfirm(title, message, onYes, onNo, yesText = '是', noText = '否') {
    this.show({
      title: title,
      content: `<p class="modal__confirm-text">${message}</p>`,
      confirmText: yesText,
      confirmClass: 'btn--primary',
      showCancel: true,
      cancelText: noText,
      onConfirm: () => {
        if (onYes) onYes();
      },
      onCancel: () => {
        if (onNo) onNo();
      }
    });
  }

  showRenameModal(currentName, onConfirm, onCancel) {
    this.show({
      title: '修改名称',
      content: `
        <div class="modal__input-group">
          <label class="modal__label">图片名称</label>
          <input
            type="text"
            class="modal__input"
            id="renameInput"
            value="${currentName}"
            placeholder="请输入新名称"
            maxlength="50"
          />
          <p class="modal__hint">长度限制：1-50个字符，支持中英文、数字及常见符号</p>
        </div>
      `,
      confirmText: '确认修改',
      confirmClass: 'btn--primary',
      showCancel: true,
      onConfirm: () => {
        const input = document.getElementById('renameInput');
        if (input) {
          const newName = input.value.trim();
          if (newName.length === 0) {
            this.showToast('名称不能为空', 'error');
            return false;
          }
          if (newName.length > 50) {
            this.showToast('名称长度不能超过50个字符', 'error');
            return false;
          }
          if (onConfirm) {
            onConfirm(newName);
          }
        }
      },
      onCancel: () => {
        if (onCancel) {
          onCancel();
        }
      }
    });

    setTimeout(() => {
      const input = document.getElementById('renameInput');
      if (input) {
        const dotIndex = input.value.lastIndexOf('.');
        if (dotIndex > 0) {
          input.setSelectionRange(0, dotIndex);
        }
      }
    }, 150);
  }

  showDeleteConfirm(filename, onConfirm, onCancel, isSoftDelete = false) {
    const modeClass = isSoftDelete ? 'modal--soft-delete' : 'modal--hard-delete';
    const icon = isSoftDelete
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    const modeLabel = isSoftDelete ? '软删除' : '永久删除';
    const modeDesc = isSoftDelete
      ? '该文件将移至回收站，可在回收站中恢复或彻底删除。'
      : '此操作不可恢复，文件将从系统中永久移除！';

    this.show({
      title: `${icon} ${modeLabel}确认`,
      content: `
        <p class="modal__confirm-text">
          确定要${isSoftDelete ? '删除' : '永久删除'} <strong>"${filename}"</strong> 吗？
        </p>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--color-bg-secondary); border-radius: var(--radius-md); border-left: 3px solid ${isSoftDelete ? '#f59e0b' : '#ef4444'};">
          ${modeDesc}
        </p>
      `,
      confirmText: isSoftDelete ? '移入回收站' : '确认永久删除',
      confirmClass: isSoftDelete ? 'btn--warning' : 'btn--danger',
      showCancel: true,
      modalClass: modeClass,
      onConfirm: () => {
        if (onConfirm) {
          onConfirm();
        }
      },
      onCancel: () => {
        if (onCancel) {
          onCancel();
        }
      }
    });
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'success'
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
          : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        }
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
}

const modal = new Modal();
