// 搜索弹窗功能
document.addEventListener('DOMContentLoaded', function() {
  // 获取当前语言
  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
  }
  
  // 获取翻译文本
  function getText(en, zh) {
    return getCurrentLang() === 'zh' ? zh : en;
  }
  
  // 创建搜索弹窗（先用英文创建）
  const searchOverlay = document.createElement('div');
  searchOverlay.className = 'search-overlay';
  searchOverlay.innerHTML = `
    <div class="search-modal">
      <div class="search-modal-header">
        <h2 class="search-modal-title" id="searchModalTitle">Search</h2>
        <button class="search-close" aria-label="Close search">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="search-input-wrapper">
        <input type="text" class="search-input" id="searchModalInput" placeholder="Type to search..." autofocus>
        <div class="search-input-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-no-results" id="searchNoResults">Type to start searching</div>
      </div>
    </div>
  `;
  document.body.appendChild(searchOverlay);
  
  // 更新搜索弹窗文本
  function updateSearchModalText() {
    const title = document.getElementById('searchModalTitle');
    const input = document.getElementById('searchModalInput');
    const noResults = document.getElementById('searchNoResults');
    
    if (title) {
      title.textContent = getText('Search', '搜索');
    }
    if (input) {
      input.placeholder = getText('Type to search...', '输入关键词搜索...');
    }
    if (noResults) {
      noResults.textContent = getText('Type to start searching', '输入关键词开始搜索');
    }
  }
  
  // 立即更新文本以匹配当前语言
  updateSearchModalText();
  
  // 监听语言切换
  window.addEventListener('languageChanged', updateSearchModalText);

  const searchBtn = document.getElementById('searchBtn');
  const searchClose = searchOverlay.querySelector('.search-close');
  const searchInput = searchOverlay.querySelector('.search-input');

  // 打开搜索弹窗
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      searchOverlay.classList.add('active');
      setTimeout(() => searchInput.focus(), 100);
    });
  }

  // 关闭搜索弹窗
  function closeSearch() {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    document.getElementById('searchResults').innerHTML = `<div class="search-no-results" id="searchNoResults">${getText('Type to start searching', '输入关键词开始搜索')}</div>`;
  }

  searchClose.addEventListener('click', closeSearch);

  // 点击背景关闭
  searchOverlay.addEventListener('click', function(e) {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  // ESC键关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // 搜索功能（简单的客户端搜索）
  let searchTimeout;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (!query) {
      document.getElementById('searchResults').innerHTML = `<div class="search-no-results" id="searchNoResults">${getText('Type to start searching', '输入关键词开始搜索')}</div>`;
      return;
    }

    searchTimeout = setTimeout(() => {
      // 这里可以集成实际的搜索功能
      // 目前显示占位内容
      document.getElementById('searchResults').innerHTML = `
        <div class="search-no-results">${getText('Search feature is under development...', '搜索功能正在开发中...')}</div>
      `;
    }, 300);
  });
});
