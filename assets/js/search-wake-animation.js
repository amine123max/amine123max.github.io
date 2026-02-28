document.addEventListener('DOMContentLoaded', function() {
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
  let popupTimer = null;
  let voiceWakeTimer = null;

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

  function stopWakePopup() {
    clearPopupTimer();
    wakeLayer.classList.remove('is-active');
  }

  function runWakePopup() {
    stopWakePopup();
    wakeLayer.classList.add('is-active');
    runVoiceButtonPop();
    popupTimer = setTimeout(function() {
      stopWakePopup();
    }, WAKE_POPUP_MS);
  }

  document.addEventListener('search:wake-word-detected', runWakePopup);

  document.addEventListener('search:closed', function() {
    stopWakePopup();
  });
});
