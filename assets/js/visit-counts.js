// Real visit counter: fetches a Cloudflare Worker counter after render.
document.addEventListener('DOMContentLoaded', function () {
  const visitNodes = Array.from(document.querySelectorAll('[data-visits-counter]'));
  if (!visitNodes.length) return;

  const API_URL = 'https://visit-counts.13409951849.workers.dev/api/visit';
  const CACHE_KEY = 'personalinfo:visits:last';
  const REQUEST_TIMEOUT_MS = 4500;
  const START_DELAY_MS = 120;
  const LOADING_ROLL_TARGET = 6;

  const baseVisits = readInitialVisits();
  let currentVisits = baseVisits;
  let hasReliableValue = false;

  function formatVisits(n) {
    if (!Number.isFinite(n)) return '';
    return String(Math.floor(n));
  }

  function readNumber(value) {
    const numeric = Number(String(value || '').replace(/[^0-9]/g, ''));
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.floor(numeric));
  }

  function readInitialVisits() {
    return visitNodes.reduce((max, node) => {
      const visibleText = node.classList.contains('metric-roll') ? 0 : readNumber(node.textContent);
      return Math.max(
        max,
        readNumber(node.dataset.currentVisits),
        readNumber(node.dataset.rollValue),
        readNumber(node.dataset.baseVisits),
        visibleText
      );
    }, 0);
  }

  function readCachedVisits() {
    try {
      return readNumber(window.localStorage && window.localStorage.getItem(CACHE_KEY));
    } catch (_) {
      return 0;
    }
  }

  function writeCachedVisits(visits) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(CACHE_KEY, String(Math.max(0, Math.floor(visits))));
      }
    } catch (_) {
      // Storage may be unavailable in private or restricted browser contexts.
    }
  }

  function updateVisits(value) {
    const visits = Math.max(0, Math.floor(value));
    currentVisits = visits;
    const display = formatVisits(visits);
    if (!display) return;

    visitNodes.forEach((node) => {
      node.dataset.currentVisits = String(visits);
      if (node.dataset.rollValue === display) return;
      node.textContent = display;
    });
  }

  function warmUpCounter() {
    const cachedVisits = readCachedVisits();
    if (cachedVisits > currentVisits) {
      updateVisits(cachedVisits);
      return;
    }

    if (currentVisits < LOADING_ROLL_TARGET) {
      updateVisits(LOADING_ROLL_TARGET);
    }
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

      hasReliableValue = true;
      writeCachedVisits(visits);
      updateVisits(visits);
    } catch (_) {
      if (!hasReliableValue) {
        const cachedVisits = readCachedVisits();
        updateVisits(cachedVisits || baseVisits);
      }
    } finally {
      window.clearTimeout(timer);
    }
  }

  updateVisits(currentVisits);
  window.setTimeout(warmUpCounter, START_DELAY_MS);
  window.setTimeout(fetchVisits, START_DELAY_MS);
});
