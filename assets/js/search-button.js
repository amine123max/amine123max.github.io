// 搜索弹窗功能
document.addEventListener('DOMContentLoaded', function() {
  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
  }

  function getText(en, zh) {
    return getCurrentLang() === 'zh' ? zh : en;
  }

  // 简约搜索弹窗：仅保留输入框
  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = `
    <div class="search-modal search-modal-minimal">
      <div class="search-input-wrapper search-input-wrapper-minimal">
        <div class="search-input-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <input type="text" class="search-input" id="searchModalInput" placeholder="Type to search..." autofocus>
      </div>
      <div class="search-suggest-list" id="searchSuggestList"></div>
    </div>
  `;
  document.body.appendChild(searchOverlay);

  function updateSearchModalText() {
    const input = document.getElementById('searchModalInput');
    if (input) {
      input.placeholder = getText('Type to search...', '输入关键词搜索...');
    }
  }

  updateSearchModalText();
  window.addEventListener('languageChanged', updateSearchModalText);

  const searchBtn = document.getElementById('searchBtn');
  const searchInput = searchOverlay.querySelector('.search-input');
  const suggestList = searchOverlay.querySelector('#searchSuggestList');
  const searchIndexCache = new Map();
  let searchDebounce = null;

  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      searchOverlay.classList.add('active');
      setTimeout(() => searchInput.focus(), 100);
    });
  }

  function closeSearch() {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    suggestList.innerHTML = '';
  }

  async function loadSearchIndex() {
    const lang = getCurrentLang();
    if (searchIndexCache.has(lang)) return searchIndexCache.get(lang);

    const candidates = lang === 'zh'
      ? ['/zh/index.json', '/index.json']
      : ['/index.json', '/zh/index.json'];

    for (const url of candidates) {
      try {
        const resp = await fetch(url, { credentials: 'same-origin' });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          searchIndexCache.set(lang, data);
          return data;
        }
      } catch (_) {
        // try next candidate
      }
    }

    searchIndexCache.set(lang, []);
    return [];
  }

  function normalizeText(text) {
    return (text || '').toString().toLowerCase();
  }

  function scoreItem(item, q) {
    const title = normalizeText(item.title);
    const summary = normalizeText(item.summary);
    const content = normalizeText(item.content);
    let score = 0;
    if (title.startsWith(q)) score += 6;
    if (title.includes(q)) score += 4;
    if (summary.includes(q)) score += 2;
    if (content.includes(q)) score += 1;
    return score;
  }

  function renderSuggestions(items) {
    suggestList.innerHTML = '';
    if (!items.length) return;

    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const a = document.createElement('a');
      a.className = 'search-suggest-item';
      a.href = item.permalink || '#';
      a.textContent = item.title || getText('Untitled', '未命名');
      frag.appendChild(a);
    });
    suggestList.appendChild(frag);
  }

  async function runPopupSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      suggestList.innerHTML = '';
      return;
    }

    const q = normalizeText(query);
    const index = await loadSearchIndex();
    const matched = index
      .map((item) => ({ item, score: scoreItem(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.item);

    renderSuggestions(matched);
  }

  searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
      return;
    }
  });

  searchInput.addEventListener('input', function() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      runPopupSearch();
    }, 120);
  });

  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = suggestList.querySelector('.search-suggest-item');
      if (first) {
        window.location.assign(first.href);
      }
    }
  });
});
