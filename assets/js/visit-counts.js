// Real visit counter: fetches a Cloudflare Worker counter after render.
document.addEventListener('DOMContentLoaded', function () {
  const visitNodes = Array.from(document.querySelectorAll('[data-visits-counter]'));
  if (!visitNodes.length) return;

  const API_URL = 'https://visit-counts.13409951849.workers.dev/api/visit';
  const K_THRESHOLD = 1000;
  const REQUEST_TIMEOUT_MS = 1800;
  const START_DELAY_MS = 600;

  function formatVisits(n) {
    if (!Number.isFinite(n)) return '';
    if (n >= K_THRESHOLD) return `${(n / 1000).toFixed(1)}K`;
    return String(Math.floor(n));
  }

  function schedule(task) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: START_DELAY_MS + REQUEST_TIMEOUT_MS });
      return;
    }
    window.setTimeout(task, START_DELAY_MS);
  }

  async function fetchVisits() {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}?source=sidebar`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) return;

      const data = await response.json();
      const visits = Number(data && data.visits);
      const display = formatVisits(visits);
      if (!display) return;

      visitNodes.forEach((node) => {
        node.textContent = display;
      });
    } catch (_) {
      // Keep the static fallback value if the analytics endpoint is slow or unavailable.
    } finally {
      window.clearTimeout(timer);
    }
  }

  schedule(fetchVisits);
});
