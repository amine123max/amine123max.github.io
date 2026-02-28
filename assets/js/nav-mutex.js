// 导航功能互斥管理器
(function() {
  'use strict';

  // 全局状态
  window.navMutex = {
    currentFeature: null,
    isLocked: false,
    
    // 尝试打开某个功能
    tryOpen: function(featureName) {
      if (this.isLocked && this.currentFeature !== featureName) {
        return false; // 已有其他功能打开，拒绝
      }
      this.currentFeature = featureName;
      this.isLocked = true;
      this.disableOtherButtons(featureName);
      return true;
    },
    
    // 关闭当前功能
    close: function(featureName) {
      if (this.currentFeature === featureName || !this.currentFeature) {
        this.currentFeature = null;
        this.isLocked = false;
        this.enableAllButtons();
      }
    },
    
    // 强制关闭所有
    closeAll: function() {
      this.currentFeature = null;
      this.isLocked = false;
      this.enableAllButtons();
    },
    
    // 禁用其他按钮
    disableOtherButtons: function(currentFeature) {
      const buttons = {
        'settings': ['#settingsBtn', '#mobile-settings-toggle'],
        'search': ['.search-toggle', '.mobile-search-toggle'],
        'mobile-nav': ['#mobile-nav-toggle'],
        'mobile-menu': ['#mobile-menu-toggle']
      };
      
      for (const [feature, selectors] of Object.entries(buttons)) {
        if (feature !== currentFeature) {
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el) {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.5';
              }
            });
          });
        }
      }
    },
    
    // 启用所有按钮
    enableAllButtons: function() {
      const allSelectors = [
        '#settingsBtn',
        '#mobile-settings-toggle',
        '.search-toggle',
        '.mobile-search-toggle',
        '#mobile-nav-toggle',
        '#mobile-menu-toggle'
      ];
      
      allSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el) {
            el.style.pointerEvents = '';
            el.style.opacity = '';
          }
        });
      });
    }
  };
})();
