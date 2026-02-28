document.addEventListener('DOMContentLoaded', function() {
  const wrapper = document.querySelector('.search-input-wrapper.search-input-wrapper-minimal');
  const searchInput = document.getElementById('searchModalInput');
  const searchOverlay = document.querySelector('.search-overlay');
  if (!wrapper || !searchInput || !searchOverlay) return;

  if (wrapper.querySelector('.search-voice-btn')) return;

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceBtn = document.createElement('button');
  voiceBtn.type = 'button';
  voiceBtn.className = 'search-voice-btn';
  voiceBtn.id = 'searchVoiceBtn';
  voiceBtn.setAttribute('aria-pressed', 'false');
  voiceBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3"></rect>
      <path d="M5 10a7 7 0 0 0 14 0"></path>
      <path d="M12 19v3"></path>
      <path d="M8 22h8"></path>
    </svg>
  `;
  wrapper.appendChild(voiceBtn);

  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
  }

  function getText(en, zh) {
    return getCurrentLang() === 'zh' ? zh : en;
  }

  function updateVoiceButtonText() {
    if (voiceBtn.disabled) {
      voiceBtn.title = getText('Voice input is not supported by this browser', '当前浏览器不支持语音输入');
      voiceBtn.setAttribute('aria-label', getText('Voice input unavailable', '语音输入不可用'));
      return;
    }
    voiceBtn.title = getText('Voice input', '语音输入');
    voiceBtn.setAttribute('aria-label', getText('Voice input', '语音输入'));
  }

  if (!Recognition) {
    voiceBtn.disabled = true;
    updateVoiceButtonText();
    window.addEventListener('languageChanged', updateVoiceButtonText);
    return;
  }

  const recognition = new Recognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let isListening = false;
  let hasVoiceResult = false;
  let latestVoiceQuery = '';
  let voiceStartSource = 'button';

  function setListeningState(listening) {
    isListening = listening;
    voiceBtn.classList.toggle('is-listening', listening);
    voiceBtn.setAttribute('aria-pressed', listening ? 'true' : 'false');
    updateVoiceButtonText();
    document.dispatchEvent(new CustomEvent(
      listening ? 'search:voice-input-started' : 'search:voice-input-stopped',
      { detail: { source: voiceStartSource } }
    ));
  }

  function getRecognitionLang() {
    return getCurrentLang() === 'zh' ? 'zh-CN' : 'en-US';
  }

  function updateInputValue(value) {
    if (!searchOverlay.classList.contains('active')) return;
    searchInput.value = value;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new CustomEvent('search:voice-input', { bubbles: true }));
  }

  function sanitizeVoiceQuery(value) {
    const raw = String(value || '');
    if (!raw) return '';
    return raw
      .replace(/小迪小迪|小弟小弟|晓迪晓迪/g, ' ')
      .replace(/xiao\s*di\s*xiao\s*di/gi, ' ')
      .replace(/[，,。.!！？?、]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stopListening() {
    hasVoiceResult = false;
    latestVoiceQuery = '';
    if (!isListening) return;
    try {
      recognition.stop();
    } catch (_) {
      setListeningState(false);
    }
  }

  function startListening(source) {
    if (voiceBtn.disabled) return false;
    if (!searchOverlay.classList.contains('active')) return false;
    if (isListening) return true;
    hasVoiceResult = false;
    latestVoiceQuery = '';
    voiceStartSource = source || 'button';
    recognition.lang = getRecognitionLang();
    try {
      recognition.start();
      return true;
    } catch (_) {
      setListeningState(false);
      return false;
    }
  }

  voiceBtn.addEventListener('click', function() {
    if (!searchOverlay.classList.contains('active')) return;
    if (isListening) {
      recognition.stop();
      return;
    }
    startListening('button');
  });

  recognition.addEventListener('start', function() {
    setListeningState(true);
  });

  recognition.addEventListener('result', function(event) {
    if (!searchOverlay.classList.contains('active')) return;
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    const nextQuery = sanitizeVoiceQuery(transcript);
    updateInputValue(nextQuery);
    if (nextQuery) {
      hasVoiceResult = true;
      latestVoiceQuery = nextQuery;
    }
  });

  recognition.addEventListener('error', function() {
    setListeningState(false);
  });

  recognition.addEventListener('end', function() {
    setListeningState(false);
    if (!searchOverlay.classList.contains('active')) return;
    const query = sanitizeVoiceQuery(latestVoiceQuery || searchInput.value || '');
    if (!hasVoiceResult || !query) return;
    searchInput.dispatchEvent(new CustomEvent('search:voice-submit', {
      bubbles: true,
      detail: { query }
    }));
  });

  updateVoiceButtonText();
  window.addEventListener('languageChanged', updateVoiceButtonText);
  document.addEventListener('search:closed', stopListening);
  document.addEventListener('search:start-voice-input-request', function(e) {
    if (!searchOverlay.classList.contains('active')) return;
    const source = e && e.detail && e.detail.source ? e.detail.source : 'wake-word';
    if (source !== 'wake-word') return;
    startListening('wake-word');
  });
});
