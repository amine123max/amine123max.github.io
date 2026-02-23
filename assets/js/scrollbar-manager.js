// Centralized scrollbar manager: attach one shared scrollbar class to all key scroll containers.
document.addEventListener('DOMContentLoaded', function () {
  const MANAGED_CLASS = 'sb-managed';
  const TARGET_SELECTORS = [
    'body:not(.home) > .main',
    'body.home > .main',
    'body.home .content-section',
    'body:not(.home) .mobile-global-sidebar',
    '[data-scrollbar-target]',
  ];

  let rafId = null;

  function applyManagedClass() {
    // Clear stale managed state first (important after breakpoint/page mode switches).
    document.querySelectorAll(`.${MANAGED_CLASS}`).forEach((el) => {
      el.classList.remove(MANAGED_CLASS);
    });

    const seen = new Set();
    TARGET_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add(MANAGED_CLASS);
      });
    });
  }

  function scheduleApply() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      applyManagedClass();
    });
  }

  applyManagedClass();
  window.addEventListener('resize', scheduleApply);
  window.addEventListener('orientationchange', scheduleApply);
  window.addEventListener('languageChanged', scheduleApply);

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
});
