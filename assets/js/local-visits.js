// Local visits simulation: start at 10, then increase by +2..+6 per day without any API.
document.addEventListener('DOMContentLoaded', function () {
  const visitNodes = Array.from(document.querySelectorAll('[data-visits-counter]'));
  if (!visitNodes.length) return;

  const STORAGE_KEY = 'visits_state';

  function toYmdLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseYmd(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function dayDiff(startYmd, endYmd) {
    const s = parseYmd(startYmd);
    const e = parseYmd(endYmd);
    if (!s || !e) return 0;
    const ms = e.setHours(0, 0, 0, 0) - s.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor(ms / 86400000));
  }

  function randomDailyIncrement() {
    return Math.floor(Math.random() * 5) + 2; // 2..6
  }

  function formatVisits(n) {
    if (!Number.isFinite(n)) return '10';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(Math.floor(n));
  }

  const base = 10;

  const today = toYmdLocal(new Date());
  let state = { count: base, lastDate: today };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Number.isFinite(saved.count) && typeof saved.lastDate === 'string') {
      state = {
        count: Math.max(base, Math.floor(saved.count)),
        lastDate: saved.lastDate,
      };
    }
  } catch (_) {
    // Ignore invalid local storage content and use defaults.
  }

  const diff = dayDiff(state.lastDate, today);
  if (diff > 0) {
    for (let i = 0; i < diff; i += 1) {
      state.count += randomDailyIncrement();
    }
    state.lastDate = today;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // Storage may be unavailable in some private modes; still update UI.
  }

  const display = formatVisits(state.count);
  visitNodes.forEach((node) => {
    node.textContent = display;
  });
});
