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
      showCancel = true
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalOverlay';

    overlay.innerHTML = `
      <div class="modal">
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

  showDeleteConfirm(filename, onConfirm, onCancel) {
    this.show({
      title: '确认删除',
      content: `
        <p class="modal__confirm-text">
          确定要删除图片 <strong>"${filename}"</strong> 吗？<br>
          此操作不可恢复，请谨慎操作。
        </p>
      `,
      confirmText: '确认删除',
      confirmClass: 'btn--danger',
      showCancel: true,
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
