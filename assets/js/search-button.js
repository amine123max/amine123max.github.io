// 搜索弹窗功能
document.addEventListener('DOMContentLoaded', function() {
  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
  }

  function getText(en, zh) {
    return getCurrentLang() === 'zh' ? zh : en;
  }

  const SEARCH_ENGINE_KEY = 'search_engine_pref';
  const SEARCH_ENGINES = [
    { id: 'google', en: 'Google', zh: '谷歌' },
    { id: 'bing', en: 'Bing', zh: '必应' },
    { id: 'baidu', en: 'Baidu', zh: '百度' },
    { id: 'duckduckgo', en: 'DuckDuckGo', zh: 'DuckDuckGo' }
  ];

  // 简约搜索弹窗：仅保留输入框
  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = `
    <div class="search-modal search-modal-minimal">
      <div class="search-input-wrapper search-input-wrapper-minimal">
        <div class="search-input-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <div class="search-engine-selector" id="searchEngineSelector">
          <button type="button" class="search-engine-caret-trigger" id="searchEngineTrigger" aria-haspopup="listbox" aria-expanded="false">
            <svg class="search-engine-caret" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
          <div class="search-engine-menu" id="searchEngineMenu" role="listbox"></div>
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

  const searchButtons = Array.from(document.querySelectorAll('#searchBtn, [data-search-trigger]'));
  const searchInput = searchOverlay.querySelector('.search-input');
  const suggestList = searchOverlay.querySelector('#searchSuggestList');
  const engineSelector = searchOverlay.querySelector('#searchEngineSelector');
  const engineTrigger = searchOverlay.querySelector('#searchEngineTrigger');
  const engineMenu = searchOverlay.querySelector('#searchEngineMenu');
  const searchIndexCache = new Map();
  let searchDebounce = null;
  let selectedEngineId = loadEnginePreference();

  function getEngineById(id) {
    for (let i = 0; i < SEARCH_ENGINES.length; i += 1) {
      if (SEARCH_ENGINES[i].id === id) return SEARCH_ENGINES[i];
    }
    return SEARCH_ENGINES[0];
  }

  function getEngineLabel(engine) {
    return getCurrentLang() === 'zh' ? engine.zh : engine.en;
  }

  function loadEnginePreference() {
    try {
      const id = localStorage.getItem(SEARCH_ENGINE_KEY) || '';
      return getEngineById(id).id;
    } catch (_) {
      return SEARCH_ENGINES[0].id;
    }
  }

  function saveEnginePreference(id) {
    try {
      localStorage.setItem(SEARCH_ENGINE_KEY, id);
    } catch (_) {
      // no-op if storage unavailable
    }
  }

  function closeEngineMenu() {
    engineSelector.classList.remove('open');
    engineTrigger.setAttribute('aria-expanded', 'false');
  }

  function openEngineMenu() {
    engineSelector.classList.add('open');
    engineTrigger.setAttribute('aria-expanded', 'true');
  }

  function updateEngineTriggerText() {
    const engine = getEngineById(selectedEngineId);
    engineTrigger.title = getText('Search engine', '搜索引擎') + ': ' + getEngineLabel(engine);
    engineTrigger.setAttribute('aria-label', getText('Select search engine', '选择搜索引擎'));
  }

  function renderEngineMenu() {
    engineMenu.innerHTML = '';
    const frag = document.createDocumentFragment();
    SEARCH_ENGINES.forEach((engine) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-engine-option';
      if (engine.id === selectedEngineId) btn.classList.add('is-active');
      btn.dataset.engineId = engine.id;
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', engine.id === selectedEngineId ? 'true' : 'false');
      btn.textContent = getEngineLabel(engine);
      frag.appendChild(btn);
    });
    engineMenu.appendChild(frag);
  }

  function setSelectedEngine(id) {
    selectedEngineId = getEngineById(id).id;
    saveEnginePreference(selectedEngineId);
    updateEngineTriggerText();
    renderEngineMenu();
    closeEngineMenu();

    if (searchInput.value.trim()) {
      runPopupSearch();
    }
  }

  function openSearch() {
    searchOverlay.style.alignItems = 'center';
    searchOverlay.style.justifyContent = 'center';
    searchOverlay.style.padding = '0';
    searchOverlay.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
  }

  searchButtons.forEach((btn) => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openSearch();
    });
  });

  function closeSearch() {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    suggestList.innerHTML = '';
    closeEngineMenu();
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

  function buildExternalSearchUrl(query) {
    const engine = getEngineById(selectedEngineId);
    const host = window.location.hostname || '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const terms = isLocalHost ? query : `site:${host} ${query}`;

    if (engine.id === 'bing') {
      return `https://www.bing.com/search?q=${encodeURIComponent(terms)}`;
    }
    if (engine.id === 'baidu') {
      return `https://www.baidu.com/s?wd=${encodeURIComponent(terms)}`;
    }
    if (engine.id === 'duckduckgo') {
      return `https://duckduckgo.com/?q=${encodeURIComponent(terms)}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
  }

  function renderExternalSearchSuggestion(query) {
    suggestList.innerHTML = '';
    const a = document.createElement('a');
    a.className = 'search-suggest-item search-suggest-item-external';
    a.href = buildExternalSearchUrl(query);
    const engineName = getEngineLabel(getEngineById(selectedEngineId));
    a.textContent = getText(
      `No internal results. Search "${query}" on ${engineName}`,
      `站内无结果，去${engineName}搜索「${query}」`
    );
    suggestList.appendChild(a);
  }

  async function runPopupSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      suggestList.innerHTML = '';
      return [];
    }

    const q = normalizeText(query);
    const index = await loadSearchIndex();
    const matched = index
      .map((item) => ({ item, score: scoreItem(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.item);

    if (matched.length) {
      renderSuggestions(matched);
    } else {
      renderExternalSearchSuggestion(query);
    }

    return matched;
  }

  searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      if (engineSelector.classList.contains('open')) {
        closeEngineMenu();
        return;
      }
      closeSearch();
      return;
    }
  });

  document.addEventListener('click', function(e) {
    if (!engineSelector.contains(e.target)) {
      closeEngineMenu();
    }
  });

  engineTrigger.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (engineSelector.classList.contains('open')) {
      closeEngineMenu();
    } else {
      openEngineMenu();
    }
  });

  engineMenu.addEventListener('click', function(e) {
    const option = e.target.closest('.search-engine-option');
    if (!option) return;
    setSelectedEngine(option.dataset.engineId || '');
  });

  searchInput.addEventListener('input', function() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      runPopupSearch();
    }, 120);
  });

  searchInput.addEventListener('keydown', async function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      await runPopupSearch();
      const first = suggestList.querySelector('.search-suggest-item');
      if (first) {
        window.location.assign(first.href);
      }
    }
  });

  updateEngineTriggerText();
  renderEngineMenu();

  window.addEventListener('languageChanged', function() {
    updateEngineTriggerText();
    renderEngineMenu();
    if (searchInput.value.trim()) {
      runPopupSearch();
    }
  });
});
