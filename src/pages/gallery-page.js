document.addEventListener('DOMContentLoaded', async () => {
  // 先初始化 NSFW 检测器
  await nsfwDetector.init();

  window.pager = pager = new Pager({
    containerId: 'pagerContainer',
    onPageChange: (page) => {
      if (gallery) {
        gallery.goToPage(page);
      }
    }
  });

  window.gallery = gallery = new Gallery();

  const savedViewMode = localStorage.getItem('gallery-view-mode') || 'grid';
  const gridBtn = document.getElementById('gridView');
  const listBtn = document.getElementById('listView');

  if (savedViewMode === 'grid' && gridBtn) {
    gridBtn.classList.add('is-active');
    if (listBtn) listBtn.classList.remove('is-active');
  } else if (savedViewMode === 'list' && listBtn) {
    listBtn.classList.add('is-active');
    if (gridBtn) gridBtn.classList.remove('is-active');
  } else if (gridBtn) {
    gridBtn.classList.add('is-active');
  }

  const gridViewBtn = document.getElementById('gridView');
  const listViewBtn = document.getElementById('listView');

  if (gridViewBtn) {
    gridViewBtn.addEventListener('click', () => {
      if (gallery) {
        gallery.setViewMode('grid');
      }
    });
  }

  if (listViewBtn) {
    listViewBtn.addEventListener('click', () => {
      if (gallery) {
        gallery.setViewMode('list');
      }
    });
  }

  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.layout__sidebar');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });

    sidebar.addEventListener('click', (e) => {
      if (e.target === sidebar) {
        sidebar.classList.remove('is-open');
      }
    });

    const mainContent = document.querySelector('.layout__main');
    if (mainContent) {
      mainContent.addEventListener('click', () => {
        sidebar.classList.remove('is-open');
      });
    }
  }

  const deleteSettingsBtn = document.getElementById('deleteSettingsBtn');
  if (deleteSettingsBtn) {
    deleteSettingsBtn.addEventListener('click', () => {
      settingsManager.show();
    });
  }

});