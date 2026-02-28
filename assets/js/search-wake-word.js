document.addEventListener('DOMContentLoaded', function() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const searchOverlay = document.querySelector('.search-overlay');
  if (!Recognition || !searchOverlay) return;

  const WAKE_COOLDOWN_MS = 2200;
  const WAKE_RETRY_DELAY_MS = 900;

  const wakeRecognition = new Recognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.maxAlternatives = 1;
  wakeRecognition.lang = 'zh-CN';

  let wakeListening = false;
  let wakeEnabled = true;
  let wakeRestartTimer = null;
  let wakeCooldownUntil = 0;
  let pendingVoiceStart = false;

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\s,，。.!！？?、'"`~\-_/\\()（）[\]{}<>]/g, '');
  }

  function containsWakeWord(text) {
    const value = normalizeText(text);
    if (!value) return false;
    return (
      value.includes('小迪小迪') ||
      value.includes('小弟小弟') ||
      value.includes('晓迪晓迪') ||
      value.includes('xiaodixiaodi')
    );
  }

  function clearWakeRestartTimer() {
    if (!wakeRestartTimer) return;
    clearTimeout(wakeRestartTimer);
    wakeRestartTimer = null;
  }

  function canListenWakeWord() {
    return wakeEnabled &&
      document.visibilityState === 'visible' &&
      !searchOverlay.classList.contains('active') &&
      Date.now() >= wakeCooldownUntil;
  }

  function scheduleWakeRestart(delay) {
    clearWakeRestartTimer();
    if (!canListenWakeWord()) return;
    wakeRestartTimer = setTimeout(function() {
      startWakeListening();
    }, delay);
  }

  function startWakeListening() {
    if (!canListenWakeWord() || wakeListening) return;
    wakeRecognition.lang = 'zh-CN';
    try {
      wakeRecognition.start();
    } catch (_) {
      scheduleWakeRestart(WAKE_RETRY_DELAY_MS);
    }
  }

  function stopWakeListening() {
    clearWakeRestartTimer();
    if (!wakeListening) return;
    try {
      wakeRecognition.stop();
    } catch (_) {
      wakeListening = false;
    }
  }

  function wakeOnlyOpenSearch() {
    stopWakeListening();
    document.dispatchEvent(new CustomEvent('search:wake-word-detected'));
    pendingVoiceStart = true;
  }

  function handleWakeResult(event) {
    if (!canListenWakeWord()) return;
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript || '';
    }
    if (!containsWakeWord(transcript)) return;
    wakeCooldownUntil = Date.now() + WAKE_COOLDOWN_MS;
    wakeOnlyOpenSearch();
  }

  wakeRecognition.addEventListener('start', function() {
    wakeListening = true;
  });

  wakeRecognition.addEventListener('result', handleWakeResult);

  wakeRecognition.addEventListener('error', function(event) {
    wakeListening = false;
    const errorType = event && event.error ? event.error : '';
    if (errorType === 'service-not-allowed') {
      wakeEnabled = false;
      stopWakeListening();
      return;
    }
    if (errorType === 'not-allowed') {
      scheduleWakeRestart(3000);
      return;
    }
    if (errorType === 'aborted') {
      return;
    }
    scheduleWakeRestart(WAKE_RETRY_DELAY_MS);
  });

  wakeRecognition.addEventListener('end', function() {
    wakeListening = false;
    scheduleWakeRestart(500);
  });

  document.addEventListener('search:opened', function() {
    stopWakeListening();
  });

  document.addEventListener('search:closed', function() {
    pendingVoiceStart = false;
    wakeCooldownUntil = Date.now() + WAKE_COOLDOWN_MS;
    scheduleWakeRestart(350);
  });

  document.addEventListener('search:wake-voice-complete', function() {
    pendingVoiceStart = false;
  });

  document.addEventListener('search:voice-input-started', function() {
    pendingVoiceStart = false;
    stopWakeListening();
  });

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      stopWakeListening();
      return;
    }
    scheduleWakeRestart(160);
  });

  window.addEventListener('focus', function() {
    scheduleWakeRestart(120);
  });

  scheduleWakeRestart(120);
});
