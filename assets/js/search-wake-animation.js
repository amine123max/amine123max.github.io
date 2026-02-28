document.addEventListener('DOMContentLoaded', function() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  const WAKE_POPUP_MS = 920;
  const WAKE_VOICE_POP_MS = 680;

  const wakeLayer = document.createElement('div');
  wakeLayer.className = 'search-wake-global';
  wakeLayer.setAttribute('aria-hidden', 'true');
  wakeLayer.innerHTML = `
    <div class="search-wake-global-overlay"></div>
    <div class="search-wake-global-content">
      <div class="search-wake-global-mic" aria-hidden="true">
        <div class="wake-ripple-3"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid meet">
          <rect x="9" y="2" width="6" height="12" rx="3"></rect>
          <path d="M5 10a7 7 0 0 0 14 0"></path>
          <path d="M12 19v3"></path>
          <path d="M8 22h8"></path>
        </svg>
      </div>
    </div>
  `;
  document.body.appendChild(wakeLayer);

  const micIcon = wakeLayer.querySelector('.search-wake-global-mic');
  let popupTimer = null;
  let voiceWakeTimer = null;
  let recognition = null;
  let isListening = false;

  function clearPopupTimer() {
    if (!popupTimer) return;
    clearTimeout(popupTimer);
    popupTimer = null;
  }

  function clearVoiceWakeTimer() {
    if (!voiceWakeTimer) return;
    clearTimeout(voiceWakeTimer);
    voiceWakeTimer = null;
  }

  function runVoiceButtonPop() {
    const voiceBtn = document.getElementById('searchVoiceBtn');
    if (!voiceBtn) return;
    clearVoiceWakeTimer();
    voiceBtn.classList.remove('is-wake-pop');
    void voiceBtn.offsetWidth;
    voiceBtn.classList.add('is-wake-pop');
    voiceWakeTimer = setTimeout(function() {
      voiceBtn.classList.remove('is-wake-pop');
      voiceWakeTimer = null;
    }, WAKE_VOICE_POP_MS);
  }

  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
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

  function getVoiceSettings() {
    if (typeof window.getVoiceSettings === 'function') {
      return window.getVoiceSettings();
    }
    return {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      responseText: {
        zh: '我在，请说',
        en: 'I\'m here, please speak'
      }
    };
  }

  function speakResponse(text) {
    if (!window.speechSynthesis) return;
    
    const settings = getVoiceSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = getCurrentLang();
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    
    if (settings.voice) {
      utterance.voice = settings.voice;
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function setListeningState(listening) {
    isListening = listening;
    if (listening) {
      micIcon.classList.add('is-listening');
    } else {
      micIcon.classList.remove('is-listening');
    }
  }

  let currentTranscript = '';

  function stopWakePopup() {
    clearPopupTimer();
    wakeLayer.classList.remove('is-active');
    if (isListening && recognition) {
      try {
        recognition.stop();
      } catch (_) {}
    }
    setListeningState(false);
    currentTranscript = '';
  }

  function startVoiceRecognition() {
    if (isListening) return;
    
    if (!recognition) {
      recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.addEventListener('start', function() {
        setListeningState(true);
      });

      recognition.addEventListener('result', function(event) {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        currentTranscript = transcript;
      });

      recognition.addEventListener('end', function() {
        setListeningState(false);
        if (currentTranscript) {
          const query = sanitizeVoiceQuery(currentTranscript);
          if (query) {
            stopWakePopup();
            document.dispatchEvent(new CustomEvent('search:open-request', {
              detail: { source: 'wake-word' }
            }));
            document.dispatchEvent(new CustomEvent('search:wake-voice-complete'));
            setTimeout(function() {
              const searchInput = document.getElementById('searchModalInput');
              if (searchInput) {
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }, 200);
          }
        }
      });

      recognition.addEventListener('error', function() {
        setListeningState(false);
      });
    }

    recognition.lang = getCurrentLang() === 'zh' ? 'zh-CN' : 'en-US';
    try {
      recognition.start();
    } catch (_) {
      setListeningState(false);
    }
  }

  function runWakePopup() {
    stopWakePopup();
    wakeLayer.classList.add('is-active');
    runVoiceButtonPop();
    currentTranscript = '';
    
    const lang = getCurrentLang();
    const settings = getVoiceSettings();
    const responseText = settings.responseText[lang] || (lang === 'zh' ? '我在，请说' : 'I\'m here, please speak');
    speakResponse(responseText);
    
    setTimeout(function() {
      startVoiceRecognition();
    }, 1200);
  }

  micIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!wakeLayer.classList.contains('is-active')) return;
    if (isListening) {
      if (recognition) {
        try {
          recognition.stop();
        } catch (_) {}
      }
    } else {
      startVoiceRecognition();
    }
  });

  wakeLayer.addEventListener('click', function(e) {
    if (e.target === wakeLayer || e.target.classList.contains('search-wake-global-overlay')) {
      stopWakePopup();
    }
  });

  document.addEventListener('search:wake-word-detected', runWakePopup);

  document.addEventListener('search:closed', function() {
    stopWakePopup();
  });
});
