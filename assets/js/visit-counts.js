// Real visit counter: fetches a Cloudflare Worker counter after render.
document.addEventListener('DOMContentLoaded', function () {
  const visitNodes = Array.from(document.querySelectorAll('[data-visits-counter]'));
  if (!visitNodes.length) return;

  const API_URL = 'https://visit-counts.13409951849.workers.dev/api/visit';
  const CACHE_KEY = 'personalinfo:visits:last';
  const REQUEST_TIMEOUT_MS = 4500;
  const START_DELAY_MS = 120;
  const LOADING_ROLL_TARGET = 6;
  const LOADING_ROLL_DURATION_MS = 1200;
  const FINAL_ROLL_DURATION_MS = 1100;
  const MAX_FINAL_ROLL_DURATION_MS = 1800;

  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseVisits = readInitialVisits();
  let currentVisits = baseVisits;
  let activeAnimation = 0;
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
      return Math.max(max, readNumber(node.dataset.baseVisits), readNumber(node.textContent));
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

  function setVisits(value) {
    const visits = Math.max(0, Math.floor(value));
    currentVisits = visits;
    const display = formatVisits(visits);
    if (!display) return;

    visitNodes.forEach((node) => {
      node.textContent = display;
      node.dataset.currentVisits = String(visits);
    });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateVisits(targetValue, duration) {
    const target = Math.max(0, Math.floor(targetValue));
    activeAnimation += 1;
    const animationId = activeAnimation;

    if (reducedMotion || target === currentVisits || duration <= 0) {
      setVisits(target);
      return;
    }

    const start = currentVisits;
    const delta = target - start;
    const startedAt = window.performance.now();

    function tick(now) {
      if (animationId !== activeAnimation) return;

      const progress = Math.min(1, (now - startedAt) / duration);
      const next = start + delta * easeOutCubic(progress);
      setVisits(Math.round(next));

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      setVisits(target);
    }

    window.requestAnimationFrame(tick);
  }

  function warmUpCounter() {
    const cachedVisits = readCachedVisits();
    if (cachedVisits > currentVisits) {
      animateVisits(cachedVisits, Math.min(MAX_FINAL_ROLL_DURATION_MS, FINAL_ROLL_DURATION_MS + cachedVisits * 25));
      return;
    }

    if (currentVisits < LOADING_ROLL_TARGET) {
      animateVisits(LOADING_ROLL_TARGET, LOADING_ROLL_DURATION_MS);
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
      animateVisits(visits, Math.min(MAX_FINAL_ROLL_DURATION_MS, FINAL_ROLL_DURATION_MS + Math.abs(visits - currentVisits) * 35));
    } catch (_) {
      if (!hasReliableValue) {
        const cachedVisits = readCachedVisits();
        animateVisits(cachedVisits || baseVisits, FINAL_ROLL_DURATION_MS);
      }
    } finally {
      window.clearTimeout(timer);
    }
  }

  setVisits(currentVisits);
  window.setTimeout(warmUpCounter, START_DELAY_MS);
  window.setTimeout(fetchVisits, START_DELAY_MS);
});
