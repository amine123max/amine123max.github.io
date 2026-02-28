// 移动端汉堡菜单控制
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const navToggle = document.getElementById('mobile-nav-toggle');
  const menu = document.getElementById('menu');
  const logoSwitches = document.querySelector('.logo-switches');
  const originalLogoParent = logoSwitches ? logoSwitches.parentElement : null;
  const originalLogoNext = logoSwitches ? logoSwitches.nextSibling : null;

  if (!menu) return;

  function isNarrowScreen() {
    return window.innerWidth <= 650;
  }

  function isHomePage() {
    return document.body.classList.contains('home');
  }

  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  document.body.appendChild(overlay);

  let mobileNavPanel = document.querySelector('.mobile-nav-panel');
  let mobileNavIndicator = null;
  let pendingNavTimer = null;
  const NAV_SWITCH_DELAY_MS = 220;
  const KEEP_MOBILE_NAV_OPEN_KEY = 'keep-mobile-nav-open';
  const PAGE_FADE_KEY = 'page-fade-next';

  function normalizedPath(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const path = parsed.pathname.replace(/\/+$/, '');
      return path || '/';
    } catch (_) {
      return '/';
    }
  }

  function getVisiblePanelLabel(link) {
    if (!link) return null;
    const lang = localStorage.getItem('site-lang') || document.documentElement.getAttribute('lang') || 'en';
    const preferred = link.querySelector(`[data-lang="${lang}"]`);
    if (preferred && preferred.offsetParent !== null) return preferred;
    const visible = Array.from(link.querySelectorAll('[data-lang]')).find((el) => el.offsetParent !== null);
    return visible || link;
  }

  function clearPendingNav() {
    if (pendingNavTimer) {
      window.clearTimeout(pendingNavTimer);
      pendingNavTimer = null;
    }
    if (mobileNavPanel) {
      mobileNavPanel
        .querySelectorAll('.mobile-nav-panel-link.is-switching')
        .forEach((el) => el.classList.remove('is-switching'));
    }
  }

  function moveMobileNavIndicator(target, animate = true) {
    if (!mobileNavPanel || !mobileNavIndicator || !target) return;
    const panelRect = mobileNavPanel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const label = getVisiblePanelLabel(target);
    const labelRect = label.getBoundingClientRect();
    const left = Math.max(12, Math.round(labelRect.left - panelRect.left));
    const top = Math.round(targetRect.bottom - panelRect.top - 4);
    const width = Math.max(18, Math.round(labelRect.width));

    if (!animate) {
      mobileNavIndicator.classList.add('no-anim');
    }

    mobileNavPanel.style.setProperty('--mobile-nav-indicator-left', `${left}px`);
    mobileNavPanel.style.setProperty('--mobile-nav-indicator-top', `${top}px`);
    mobileNavPanel.style.setProperty('--mobile-nav-indicator-width', `${width}px`);
    mobileNavPanel.classList.add('has-indicator');

    if (!animate) {
      requestAnimationFrame(() => {
        mobileNavIndicator.classList.remove('no-anim');
      });
    }
  }

  function setActiveMobileNavLink(target, animate = true) {
    if (!mobileNavPanel) return;
    const panelLinks = mobileNavPanel.querySelectorAll('.mobile-nav-panel-link');
    panelLinks.forEach((link) => link.classList.remove('is-active'));
    if (target) {
      target.classList.add('is-active');
      moveMobileNavIndicator(target, animate);
    }
  }

  function syncMobileNavActiveFromLocation(animate = false) {
    if (!mobileNavPanel) return;
    const currentPath = normalizedPath(window.location.href);
    const panelLinks = Array.from(mobileNavPanel.querySelectorAll('.mobile-nav-panel-link'));
    const matched = panelLinks.find((link) => normalizedPath(link.href) === currentPath);
    const fallback = panelLinks.find((link) => link.classList.contains('is-active'));
    setActiveMobileNavLink(matched || fallback || panelLinks[0], animate);
  }
  if (!mobileNavPanel && navToggle) {
    mobileNavPanel = document.createElement('div');
    mobileNavPanel.className = 'mobile-nav-panel';
    mobileNavIndicator = document.createElement('span');
    mobileNavIndicator.className = 'mobile-nav-indicator';
    const panelLinks = menu.querySelectorAll('li > a');
    panelLinks.forEach((link) => {
      const item = link.cloneNode(true);
      item.classList.add('mobile-nav-panel-link');
      if (link.querySelector('.active')) item.classList.add('is-active');
      item.addEventListener('click', function(e) {
        if (!isNarrowScreen()) return;
        e.preventDefault();
        e.stopPropagation();

        const targetPath = normalizedPath(item.href);
        const currentPath = normalizedPath(window.location.href);
        clearPendingNav();
        setActiveMobileNavLink(item, true);

        if (targetPath === currentPath) return;

        item.classList.add('is-switching');
        const navigateWithTransition = window.__navigateWithTransition;
        if (typeof navigateWithTransition === 'function') {
          navigateWithTransition(item.href).catch(() => {
            sessionStorage.setItem(KEEP_MOBILE_NAV_OPEN_KEY, '1');
            pendingNavTimer = window.setTimeout(() => {
              window.location.assign(item.href);
            }, NAV_SWITCH_DELAY_MS);
          }).finally(() => {
            item.classList.remove('is-switching');
            syncMobileNavActiveFromLocation(false);
          });
          return;
        }

        sessionStorage.setItem(KEEP_MOBILE_NAV_OPEN_KEY, '1');
        sessionStorage.setItem(PAGE_FADE_KEY, '1');
        document.body.classList.add('nav-fade-out');
        pendingNavTimer = window.setTimeout(() => {
          window.location.assign(item.href);
        }, NAV_SWITCH_DELAY_MS);
      });
      mobileNavPanel.appendChild(item);
    });
    mobileNavPanel.appendChild(mobileNavIndicator);
    document.body.appendChild(mobileNavPanel);
    syncMobileNavActiveFromLocation(false);
  } else if (mobileNavPanel) {
    mobileNavIndicator = mobileNavPanel.querySelector('.mobile-nav-indicator');
    if (!mobileNavIndicator) {
      mobileNavIndicator = document.createElement('span');
      mobileNavIndicator.className = 'mobile-nav-indicator';
      mobileNavPanel.appendChild(mobileNavIndicator);
    }
    syncMobileNavActiveFromLocation(false);
  }

  function currentSidebarContainer() {
    if (!isNarrowScreen() || !document.body.classList.contains('mobile-sidebar-open')) return null;
    return isHomePage()
      ? document.querySelector('.profile-section')
      : document.querySelector('.mobile-global-sidebar');
  }

  function ensureSidebarControls(sidebar) {
    if (!sidebar) return null;
    let controls = sidebar.querySelector('.mobile-sidebar-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'mobile-sidebar-controls';
      sidebar.insertBefore(controls, sidebar.firstChild);
    }
    return controls;
  }

  function ensureSidebarBackButton(controls) {
    if (!controls) return null;
    let backBtn = controls.querySelector('.mobile-sidebar-back-btn');
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'mobile-sidebar-back-btn';
      backBtn.setAttribute('aria-label', 'Close sidebar');
      backBtn.innerHTML = '<svg class="mobile-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 4L7 12L15 20" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
        closeNavMenu();
        updateOverlayAndScrollLock();
        relocateTopSwitches();
      });
      controls.appendChild(backBtn);
    }
    return backBtn;
  }

  function relocateTopSwitches() {
    if (!logoSwitches || !originalLogoParent) return;
    const sidebar = currentSidebarContainer();
    if (sidebar) {
      const controls = ensureSidebarControls(sidebar);
      const backBtn = ensureSidebarBackButton(controls);
      if (controls && logoSwitches.parentElement !== controls) {
        controls.appendChild(logoSwitches);
      }
      if (controls && backBtn && backBtn.parentElement === controls) {
        controls.appendChild(backBtn);
      }
      return;
    }

    if (logoSwitches.parentElement !== originalLogoParent) {
      if (originalLogoNext && originalLogoNext.parentNode === originalLogoParent) {
        originalLogoParent.insertBefore(logoSwitches, originalLogoNext);
      } else {
        originalLogoParent.appendChild(logoSwitches);
      }
    }
  }

  function updateOverlayAndScrollLock() {
    const anyOpen =
      document.body.classList.contains('mobile-sidebar-open') ||
      document.body.classList.contains('mobile-nav-open');
    overlay.classList.toggle('active', anyOpen);
    if (isNarrowScreen() && isHomePage()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = anyOpen ? 'hidden' : '';
    }
  }

  function closeSidebar() {
    document.body.classList.remove('mobile-sidebar-open');
    if (menuToggle) menuToggle.classList.remove('active');
    if (navToggle) navToggle.classList.remove('active');
    
    // 释放互斥锁
    setTimeout(function() {
      if (window.navMutex) {
        window.navMutex.close('mobile-menu');
      }
    }, 50);
  }

  function closeNavMenu() {
    clearPendingNav();
    sessionStorage.removeItem(KEEP_MOBILE_NAV_OPEN_KEY);
    document.body.classList.remove('mobile-nav-open');
    if (navToggle) navToggle.classList.remove('active');
    
    // 释放互斥锁
    setTimeout(function() {
      if (window.navMutex) {
        window.navMutex.close('mobile-nav');
      }
    }, 50);
  }

  function toggleMenu() {
    if (!menuToggle) return;

    if (isNarrowScreen()) {
      const isCurrentlyOpen = document.body.classList.contains('mobile-sidebar-open');
      
      if (!isCurrentlyOpen) {
        if (window.navMutex && !window.navMutex.tryOpen('mobile-menu')) {
          return;
        }
      } else {
        if (window.navMutex) {
          window.navMutex.close('mobile-menu');
        }
      }
      
      closeNavMenu();
      const isOpen = document.body.classList.toggle('mobile-sidebar-open');
      menuToggle.classList.toggle('active', isOpen);
      closeNavMenu();
      if (navToggle) navToggle.classList.remove('active');
      updateOverlayAndScrollLock();
      relocateTopSwitches();
      if (isOpen) {
        window.dispatchEvent(new CustomEvent('mobile:sidebar-opened'));
      }
      return;
    }

    menuToggle.classList.toggle('active');
    updateOverlayAndScrollLock();
    relocateTopSwitches();
  }

  function toggleNavMenu() {
    if (!navToggle || !isNarrowScreen()) return;

    if (document.body.classList.contains('mobile-sidebar-open')) {
      closeSidebar();
      updateOverlayAndScrollLock();
      relocateTopSwitches();
      return;
    }

    const isCurrentlyOpen = document.body.classList.contains('mobile-nav-open');
    
    if (!isCurrentlyOpen) {
      if (window.navMutex && !window.navMutex.tryOpen('mobile-nav')) {
        return;
      }
    } else {
      if (window.navMutex) {
        window.navMutex.close('mobile-nav');
      }
    }

    const isOpen = document.body.classList.toggle('mobile-nav-open');
    navToggle.classList.toggle('active', isOpen);
    if (isOpen) {
      syncMobileNavActiveFromLocation(false);
    } else {
      clearPendingNav();
    }
    updateOverlayAndScrollLock();
  }

  function closeMenu() {
    clearPendingNav();
    sessionStorage.removeItem(KEEP_MOBILE_NAV_OPEN_KEY);
    closeSidebar();
    closeNavMenu();
    if (menuToggle) menuToggle.classList.remove('active');
    updateOverlayAndScrollLock();
    relocateTopSwitches();
    
    // 释放所有互斥锁
    setTimeout(function() {
      if (window.navMutex) {
        window.navMutex.closeAll();
      }
    }, 100);
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });
  }

  if (navToggle) {
    navToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleNavMenu();
    });
  }

  overlay.addEventListener('click', closeMenu);

  const menuLinks = menu.querySelectorAll('a');
  menuLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function(e) {
    if (
      e.key === 'Escape' &&
      (document.body.classList.contains('mobile-sidebar-open') ||
        document.body.classList.contains('mobile-nav-open'))
    ) {
      closeMenu();
    }
  });

  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (
        window.innerWidth > 650 &&
        (document.body.classList.contains('mobile-sidebar-open') ||
          document.body.classList.contains('mobile-nav-open'))
      ) {
        closeMenu();
      }
    }, 250);
    relocateTopSwitches();
    if (isNarrowScreen() && document.body.classList.contains('mobile-nav-open')) {
      syncMobileNavActiveFromLocation(false);
    }
  });

  window.addEventListener('languageChanged', function() {
    if (!mobileNavPanel) return;
    const animate = isNarrowScreen() && document.body.classList.contains('mobile-nav-open');
    syncMobileNavActiveFromLocation(animate);
  });

  window.addEventListener('page:changed', function() {
    if (!mobileNavPanel) return;
    syncMobileNavActiveFromLocation(false);
    updateOverlayAndScrollLock();
  });

  // 导航切页后恢复下拉菜单打开态，避免“闪关”
  if (isNarrowScreen() && sessionStorage.getItem(KEEP_MOBILE_NAV_OPEN_KEY) === '1') {
    document.body.classList.add('mobile-nav-open');
    if (navToggle) navToggle.classList.add('active');
  }

  updateOverlayAndScrollLock();
  relocateTopSwitches();
  syncMobileNavActiveFromLocation(false);
});





