// Shared viewport sizing only.
// Keep desktop nav active/underline logic server-rendered (same approach as reference project).
document.addEventListener('DOMContentLoaded', function () {
  const root = document.documentElement;

  function updateAppVh() {
    root.style.setProperty('--app-vh', `${window.innerHeight * 0.01}px`);
  }

  updateAppVh();
  window.addEventListener('resize', updateAppVh);
  window.addEventListener('orientationchange', updateAppVh);
});
