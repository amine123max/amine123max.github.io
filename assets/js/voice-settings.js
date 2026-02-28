document.addEventListener('DOMContentLoaded', function() {
  const SETTINGS_KEY = 'voice_settings';
  
  const defaultSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceIndex: 0,
    responseText: {
      zh: '我在，请说',
      en: 'I\'m here, please speak'
    }
  };

  let availableVoices = [];

  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return defaultSettings;
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }

  function getCurrentLang() {
    return localStorage.getItem('site-lang') || 'en';
  }

  function getText(en, zh) {
    return getCurrentLang() === 'zh' ? zh : en;
  }

  const settingsBackdrop = document.createElement('div');
  settingsBackdrop.className = 'settings-backdrop';
  document.body.appendChild(settingsBackdrop);

  const settingsDropdown = document.createElement('div');
  settingsDropdown.className = 'settings-dropdown';
  settingsDropdown.innerHTML = `
    <div class="settings-content">
      <div class="settings-header">
        <h2 class="settings-title">
          <span data-lang="en">Voice Settings</span>
          <span data-lang="zh">语音设置</span>
        </h2>
        <button class="settings-close" aria-label="Close">&times;</button>
      </div>
      
      <div class="settings-body">
        <div class="settings-group">
          <label>
            <span data-lang="en">Speech Rate (0.5-2.0)</span>
            <span data-lang="zh">语速 (0.5-2.0)</span>
          </label>
          <input type="number" id="rateInput" min="0.5" max="2.0" step="0.1" value="1.0">
        </div>

        <div class="settings-group">
          <label>
            <span data-lang="en">Pitch (0.5-2.0)</span>
            <span data-lang="zh">音调 (0.5-2.0)</span>
          </label>
          <input type="number" id="pitchInput" min="0.5" max="2.0" step="0.1" value="1.0">
        </div>

        <div class="settings-group">
          <label>
            <span data-lang="en">Volume (0.1-1.0)</span>
            <span data-lang="zh">音量 (0.1-1.0)</span>
          </label>
          <input type="number" id="volumeInput" min="0.1" max="1.0" step="0.1" value="1.0">
        </div>

        <div class="settings-group">
          <label>
            <span data-lang="en">Voice</span>
            <span data-lang="zh">音色</span>
          </label>
          <select id="voiceSelect" class="settings-select">
            <option value="0">
              <span data-lang="en">Default</span>
              <span data-lang="zh">默认</span>
            </option>
          </select>
        </div>

        <div class="settings-group">
          <label>
            <span data-lang="en">Response Text (Chinese)</span>
            <span data-lang="zh">回复文字（中文）</span>
          </label>
          <input type="text" id="responseTextZh" value="我在，请说" maxlength="50">
        </div>

        <div class="settings-group">
          <label>
            <span data-lang="en">Response Text (English)</span>
            <span data-lang="zh">回复文字（英文）</span>
          </label>
          <input type="text" id="responseTextEn" value="I'm here, please speak" maxlength="50">
        </div>
      </div>

      <div class="settings-footer">
        <button class="settings-btn settings-btn-test" id="testVoiceBtn">
          <span data-lang="en">Test Voice</span>
          <span data-lang="zh">测试语音</span>
        </button>
        <button class="settings-btn settings-btn-reset" id="resetSettingsBtn">
          <span data-lang="en">Reset</span>
          <span data-lang="zh">重置</span>
        </button>
        <button class="settings-btn settings-btn-save" id="saveSettingsBtn">
          <span data-lang="en">Save</span>
          <span data-lang="zh">保存</span>
        </button>
      </div>
  `;
  document.body.appendChild(settingsDropdown);

  const settingsBtn = document.getElementById('settingsBtn');
  const mobileSettingsBtn = document.getElementById('mobile-settings-toggle');
  const rateInput = document.getElementById('rateInput');
  const pitchInput = document.getElementById('pitchInput');
  const volumeInput = document.getElementById('volumeInput');
  const voiceSelect = document.getElementById('voiceSelect');
  const responseTextZh = document.getElementById('responseTextZh');
  const responseTextEn = document.getElementById('responseTextEn');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const resetBtn = document.getElementById('resetSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');

  function updateLanguageDisplay() {
    const lang = getCurrentLang();
    const elements = settingsDropdown.querySelectorAll('[data-lang]');
    elements.forEach(el => {
      const langAttr = el.getAttribute('data-lang');
      el.style.display = langAttr === lang ? 'inline' : 'none';
    });
  }

  function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
    const lang = getCurrentLang();
    const targetLang = lang === 'zh' ? 'zh' : 'en';
    const settings = loadSettings();
    
    voiceSelect.innerHTML = '';
    
    let hasOptions = false;
    availableVoices.forEach((voice, index) => {
      if (voice.lang.toLowerCase().startsWith(targetLang)) {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = voice.name + (voice.localService ? '' : ' (在线)');
        voiceSelect.appendChild(option);
        hasOptions = true;
      }
    });

    if (!hasOptions) {
      const option = document.createElement('option');
      option.value = '0';
      option.textContent = getText('Default', '默认');
      voiceSelect.appendChild(option);
    }
    
    // 恢复之前保存的音色选择
    if (settings.voiceIndex !== undefined && voiceSelect.options.length > 0) {
      // 确保索引在范围内
      const savedIndex = settings.voiceIndex;
      for (let i = 0; i < voiceSelect.options.length; i++) {
        if (parseInt(voiceSelect.options[i].value) === savedIndex) {
          voiceSelect.selectedIndex = i;
          break;
        }
      }
      
      // 如果没找到匹配的，选择第一个
      if (voiceSelect.selectedIndex === -1) {
        voiceSelect.selectedIndex = 0;
      }
    } else {
      voiceSelect.selectedIndex = 0;
    }
  }

  function loadSettingsToUI() {
    const settings = loadSettings();
    rateInput.value = settings.rate.toFixed(1);
    pitchInput.value = settings.pitch.toFixed(1);
    volumeInput.value = settings.volume.toFixed(1);
    responseTextZh.value = settings.responseText.zh;
    responseTextEn.value = settings.responseText.en;
    
    // 音色选择在loadVoices中处理
  }

  function openSettings(triggerBtn) {
    // 检查互斥锁
    if (window.navMutex && !window.navMutex.tryOpen('settings')) {
      return; // 其他功能正在运行，拒绝打开
    }
    
    settingsBackdrop.classList.add('active');
    settingsDropdown.classList.add('active');
    if (triggerBtn) {
      triggerBtn.classList.add('is-open');
    }
    loadSettingsToUI();
    updateLanguageDisplay();
  }

  function closeSettings() {
    settingsBackdrop.classList.remove('active');
    settingsDropdown.classList.remove('active');
    if (settingsBtn) settingsBtn.classList.remove('is-open');
    if (mobileSettingsBtn) mobileSettingsBtn.classList.remove('is-open');
    
    // 释放互斥锁（延迟以确保动画完成）
    setTimeout(function() {
      if (window.navMutex) {
        window.navMutex.close('settings');
      }
    }, 50);
  }

  function testVoice() {
    if (!window.speechSynthesis) {
      alert(getText('Speech synthesis not supported', '浏览器不支持语音合成'));
      return;
    }

    const lang = getCurrentLang();
    const text = lang === 'zh' ? responseTextZh.value : responseTextEn.value;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = parseFloat(rateInput.value);
    utterance.pitch = parseFloat(pitchInput.value);
    utterance.volume = parseFloat(volumeInput.value);
    
    const voiceIndex = parseInt(voiceSelect.value);
    if (availableVoices.length > 0 && availableVoices[voiceIndex]) {
      utterance.voice = availableVoices[voiceIndex];
    }
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function resetSettings() {
    rateInput.value = defaultSettings.rate.toFixed(1);
    pitchInput.value = defaultSettings.pitch.toFixed(1);
    volumeInput.value = defaultSettings.volume.toFixed(1);
    voiceSelect.value = defaultSettings.voiceIndex;
    responseTextZh.value = defaultSettings.responseText.zh;
    responseTextEn.value = defaultSettings.responseText.en;
  }

  function saveCurrentSettings() {
    const settings = {
      rate: Math.max(0.5, Math.min(2.0, parseFloat(rateInput.value) || 1.0)),
      pitch: Math.max(0.5, Math.min(2.0, parseFloat(pitchInput.value) || 1.0)),
      volume: Math.max(0.1, Math.min(1.0, parseFloat(volumeInput.value) || 1.0)),
      voiceIndex: parseInt(voiceSelect.value),
      responseText: {
        zh: responseTextZh.value.trim() || defaultSettings.responseText.zh,
        en: responseTextEn.value.trim() || defaultSettings.responseText.en
      }
    };
    saveSettings(settings);
    
    document.dispatchEvent(new CustomEvent('voice-settings-updated', { detail: settings }));
    
    closeSettings();
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (settingsDropdown.classList.contains('active')) {
        closeSettings();
      } else {
        openSettings(settingsBtn);
      }
    });
  }

  if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (settingsDropdown.classList.contains('active')) {
        closeSettings();
      } else {
        openSettings(mobileSettingsBtn);
      }
    });
  }

  settingsBackdrop.addEventListener('click', closeSettings);

  document.addEventListener('click', function(e) {
    if (!settingsDropdown.contains(e.target) && 
        e.target !== settingsBtn && 
        e.target !== mobileSettingsBtn &&
        !settingsBtn?.contains(e.target) &&
        !mobileSettingsBtn?.contains(e.target) &&
        e.target !== settingsBackdrop) {
      closeSettings();
    }
  });

  testVoiceBtn.addEventListener('click', testVoice);
  resetBtn.addEventListener('click', resetSettings);
  saveBtn.addEventListener('click', saveCurrentSettings);

  window.addEventListener('languageChanged', function() {
    updateLanguageDisplay();
    loadVoices();
  });

  if (window.speechSynthesis) {
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    }
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  loadSettingsToUI();

  window.getVoiceSettings = function() {
    const settings = loadSettings();
    if (availableVoices.length > 0 && settings.voiceIndex !== undefined) {
      settings.voice = availableVoices[settings.voiceIndex];
    }
    return settings;
  };
});
