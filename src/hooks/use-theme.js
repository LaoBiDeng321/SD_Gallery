/**
 * SD Gallery Theme Manager
 * Default: dark. Manual toggle via button.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sd-gallery-theme';
  var themeManager = {
    currentTheme: 'dark',

    init: function () {
      var saved = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
      this.currentTheme = saved || 'dark';
      this.applyTheme(this.currentTheme);
      this.bindEvents();
    },

    applyTheme: function (theme) {
      this.currentTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      var darkIcon = document.getElementById('themeIconDark');
      var lightIcon = document.getElementById('themeIconLight');
      // dark=show sun(to light), light=show moon(to dark)
      if (darkIcon) darkIcon.style.display = theme === 'dark' ? '' : 'none';
      if (lightIcon) lightIcon.style.display = theme === 'dark' ? 'none' : '';
    },

    toggle: function () {
      var next = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    },

    bindEvents: function () {
      var self = this;
      var btn = document.getElementById('themeToggle');
      if (btn) {
        btn.addEventListener('click', function () { self.toggle(); });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { themeManager.init(); });
  } else {
    themeManager.init();
  }
})();
