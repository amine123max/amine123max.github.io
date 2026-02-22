(function() {
  const API_URL = 'https://cv-download-worker.13409951849.workers.dev';
  
  let currentEmail = '';
  
  function createModal() {
    const loadingHTML = `
      <div id="loading-overlay" class="loading-overlay">
        <div class="loading-container">
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
          <div class="loading-bar"></div>
        </div>
      </div>
    `;
    
    const modalHTML = `
      <div id="cv-download-modal" class="cv-modal" style="display: none;">
        <div class="cv-modal-overlay"></div>
        <div class="cv-modal-content">
          <button class="cv-modal-close" aria-label="关闭">&times;</button>
          
          <div id="step-1" class="cv-step">
            <div class="cv-modal-header">
              <h2 class="cv-modal-title">
                <span data-lang="en">PersonalINFO Download Request</span>
                <span data-lang="zh">简历下载申请</span>
              </h2>
              <p class="cv-modal-subtitle">
                <span data-lang="en">Please provide your email and reason. A verification code will be sent to your email.</span>
                <span data-lang="zh">请提供您的邮箱和下载原因，我们将发送验证码到您的邮箱</span>
              </p>
            </div>
            
            <form id="cv-request-form" class="cv-form">
              <div class="cv-form-group">
                <label for="cv-email">
                  <span data-lang="en">Email Address *</span>
                  <span data-lang="zh">邮箱地址 *</span>
                </label>
                <input 
                  type="email" 
                  id="cv-email" 
                  name="email" 
                  required 
                  placeholder="your-email@example.com"
                  autocomplete="email"
                >
              </div>
              
              <div class="cv-form-group">
                <label for="cv-reason">
                  <span data-lang="en">Reason for Download * (min. 5 characters)</span>
                  <span data-lang="zh">下载原因 * (至少5个字符)</span>
                </label>
                <textarea 
                  id="cv-reason" 
                  name="reason" 
                  rows="4" 
                  required 
                  minlength="5"
                  data-lang-placeholder-en="e.g., Interested in your research background for potential collaboration..."
                  data-lang-placeholder-zh="例如：对您的研究方向感兴趣，希望了解合作可能..."
                ></textarea>
              </div>
              
              <div class="cv-form-notice">
                <span data-lang="en">A verification token will be sent to your email (valid for 5 minutes).</span>
                <span data-lang="zh">令牌将发送至您的邮箱（5分钟内有效）</span>
              </div>
              
              <div class="cv-form-actions">
                <button type="button" class="cv-btn cv-btn-secondary" id="cv-cancel-btn-1">
                  <span data-lang="en">Cancel</span>
                  <span data-lang="zh">取消</span>
                </button>
                <button type="submit" class="cv-btn cv-btn-primary" id="cv-request-btn">
                  <span class="cv-btn-text">
                    <span data-lang="en">Send Code</span>
                    <span data-lang="zh">发送验证码</span>
                  </span>
                  <span class="cv-btn-loading" style="display: none;">
                    <span class="cv-spinner"></span>
                    <span data-lang="en">Sending...</span>
                    <span data-lang="zh">发送中...</span>
                  </span>
                </button>
              </div>
            </form>
            
            <div id="cv-message-1" class="cv-message" style="display: none;"></div>
          </div>
          
          <div id="step-2" class="cv-step" style="display: none;">
            <div class="cv-modal-header">
              <h2>
                <span data-lang="en">Enter Token</span>
                <span data-lang="zh">输入令牌</span>
              </h2>
              <p class="cv-modal-subtitle">
                <span data-lang="en">Please check your email and enter the token we sent you.</span>
                <span data-lang="zh">请查收邮件并输入我们发送给您的令牌</span>
              </p>
            </div>
            
            <form id="cv-verify-form" class="cv-form">
              <div class="cv-form-group">
                <label for="cv-token-1">
                  <span data-lang="en">Token *</span>
                  <span data-lang="zh">令牌 *</span>
                </label>
                <div class="cv-token-inputs">
                  <input type="text" class="cv-token-box" id="cv-token-1" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                  <input type="text" class="cv-token-box" id="cv-token-2" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                  <input type="text" class="cv-token-box" id="cv-token-3" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                  <input type="text" class="cv-token-box" id="cv-token-4" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                  <input type="text" class="cv-token-box" id="cv-token-5" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                  <input type="text" class="cv-token-box" id="cv-token-6" maxlength="1" pattern="[A-Z0-9]" autocomplete="off" style="text-transform: uppercase;">
                </div>
              </div>
              
              <div class="cv-form-notice">
                <span data-lang="en">Token is valid for 5 minutes and can only be used once.</span>
                <span data-lang="zh">令牌5分钟内有效，仅可使用一次</span>
              </div>
              
              <div class="cv-form-actions">
                <button type="button" class="cv-btn cv-btn-secondary" id="cv-back-btn">
                  <span data-lang="en">Back</span>
                  <span data-lang="zh">返回</span>
                </button>
                <button type="submit" class="cv-btn cv-btn-primary" id="cv-verify-btn">
                  <span class="cv-btn-text">
                    <span data-lang="en">Verify & Download</span>
                    <span data-lang="zh">验证并下载</span>
                  </span>
                  <span class="cv-btn-loading" style="display: none;">
                    <span class="cv-spinner"></span>
                    <span data-lang="en">Verifying...</span>
                    <span data-lang="zh">验证中...</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  function showLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.classList.add('active');
    }
  }
  
  function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.classList.remove('active');
    }
  }
  
  function showModal() {
    const modal = document.getElementById('cv-download-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      updateLanguage();
      showStep(1);
    }
  }
  
  function hideModal() {
    const modal = document.getElementById('cv-download-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      resetModal();
    }
  }
  
  function showStep(step) {
    document.getElementById('step-1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('step-2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('step-3').style.display = step === 3 ? 'block' : 'none';
    
    if (step === 2) {
      setTimeout(() => {
        const firstBox = document.getElementById('cv-token-1');
        if (firstBox) firstBox.focus();
      }, 100);
    }
    

  }
  
  function resetModal() {
    document.getElementById('cv-request-form').reset();
    document.getElementById('cv-verify-form').reset();
    
    const boxes = document.querySelectorAll('.cv-token-box');
    boxes.forEach(box => {
      box.value = '';
      box.classList.remove('filled');
    });
    
    currentEmail = '';
  }
  
  function shakeModal() {
    const modalContent = document.querySelector('.cv-modal-content');
    if (modalContent) {
      modalContent.classList.add('shake');
      setTimeout(() => {
        modalContent.classList.remove('shake');
      }, 500);
    }
  }
  
  function updatePlaceholder() {
    const lang = getCurrentLanguage();
    const textarea = document.getElementById('cv-reason');
    if (textarea) {
      const placeholder = lang === 'zh' 
        ? textarea.getAttribute('data-lang-placeholder-zh')
        : textarea.getAttribute('data-lang-placeholder-en');
      textarea.placeholder = placeholder;
    }
  }
  
  function updateLanguage() {
    const lang = getCurrentLanguage();
    const modal = document.getElementById('cv-download-modal');
    if (!modal) return;
    
    const elements = modal.querySelectorAll('[data-lang]');
    
    elements.forEach(el => {
      const langAttr = el.getAttribute('data-lang');
      const parentTag = el.parentElement?.tagName.toLowerCase();
      
      if (langAttr === lang) {
        if (parentTag === 'h2' || parentTag === 'h3' || parentTag === 'p' || parentTag === 'label' || parentTag === 'button') {
          el.style.display = 'inline';
        } else {
          el.style.display = 'inline-block';
        }
      } else {
        el.style.display = 'none';
      }
    });
    
    updatePlaceholder();
  }
  
  function getCurrentLanguage() {
    return localStorage.getItem('site-lang') || 'en';
  }
  
  let countdownInterval = null;
  
  function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    
    if (loading) {
      btn.disabled = true;
      btn.classList.add('loading');
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
  
  function startCountdown(btnId, seconds) {
    const btn = document.getElementById(btnId);
    let remaining = seconds;
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    btn.disabled = true;
    btn.classList.remove('loading');
    
    const updateText = () => {
      const lang = getCurrentLanguage();
      if (lang === 'zh') {
        btn.innerHTML = `<span>等待 ${remaining}s</span>`;
      } else {
        btn.innerHTML = `<span>Wait ${remaining}s</span>`;
      }
    };
    
    updateText();
    
    countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        btn.disabled = false;
        btn.innerHTML = `
          <span class="cv-btn-text">
            <span data-lang="en">Send Code</span>
            <span data-lang="zh">发送验证码</span>
          </span>
        `;
        updateLanguage();
      } else {
        updateText();
      }
    }, 1000);
  }
  
  async function handleRequestSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('cv-email').value.trim();
    const reason = document.getElementById('cv-reason').value.trim();
    
    if (!email || !reason || reason.length < 5) {
      shakeModal();
      return;
    }
    
    setButtonLoading('cv-request-btn', true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const response = await fetch(`${API_URL}/api/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, reason }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Request successful, switching to step 2');
        currentEmail = email;
        startCountdown('cv-request-btn', 30);
        setTimeout(() => {
          showStep(2);
        }, 100);
      } else {
        console.log('Request failed:', data.message);
        setButtonLoading('cv-request-btn', false);
        shakeModal();
      }
    } catch (error) {
      console.error('请求失败:', error);
      setButtonLoading('cv-request-btn', false);
      shakeModal();
    }
  }
  
  function setupTokenInputs() {
    const boxes = document.querySelectorAll('.cv-token-box');
    
    boxes.forEach((box, index) => {
      box.addEventListener('input', function(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (value) {
          e.target.value = value.charAt(0);
          e.target.classList.add('filled');
          
          if (index < boxes.length - 1) {
            boxes[index + 1].focus();
          }
        } else {
          e.target.value = '';
          e.target.classList.remove('filled');
        }
      });
      
      box.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace') {
          if (e.target.value) {
            e.target.value = '';
            e.target.classList.remove('filled');
          } else if (index > 0) {
            boxes[index - 1].focus();
            boxes[index - 1].value = '';
            boxes[index - 1].classList.remove('filled');
          }
        } else if (e.key === 'Delete') {
          e.target.value = '';
          e.target.classList.remove('filled');
        } else if (e.key === 'ArrowLeft' && index > 0) {
          boxes[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < boxes.length - 1) {
          boxes[index + 1].focus();
        }
      });
      
      box.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        boxes.forEach(b => {
          b.value = '';
          b.classList.remove('filled');
        });
        
        for (let i = 0; i < Math.min(pastedData.length, boxes.length); i++) {
          boxes[i].value = pastedData[i];
          boxes[i].classList.add('filled');
        }
        
        const lastFilledIndex = Math.min(pastedData.length - 1, boxes.length - 1);
        if (lastFilledIndex >= 0) {
          boxes[lastFilledIndex].focus();
        }
      });
      
      box.addEventListener('focus', function(e) {
        e.target.select();
      });
    });
  }
  
  function getTokenValue() {
    const boxes = document.querySelectorAll('.cv-token-box');
    return Array.from(boxes).map(box => box.value).join('');
  }
  
  async function handleVerifySubmit(e) {
    e.preventDefault();
    
    const token = getTokenValue();
    
    if (!token || token.length < 6) {
      shakeModal();
      return;
    }
    
    if (!/^[A-Z0-9]{6}$/.test(token)) {
      shakeModal();
      return;
    }
    
    setButtonLoading('cv-verify-btn', true);
    
    try {
      const verifyResponse = await fetch(`${API_URL}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const verifyData = await verifyResponse.json();
      
      if (!verifyData.success) {
        shakeModal();
        setButtonLoading('cv-verify-btn', false);
        return;
      }
      
      const lang = getCurrentLanguage();
      
      await fetch(`${API_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      hideModal();
      showLoading();
      
      setTimeout(async () => {
        const generateFunc = lang === 'zh' ? window.generatePDFCN : window.generatePDFEN;
        
        if (typeof generateFunc === 'function') {
          try {
            await generateFunc();
            setTimeout(() => {
              hideLoading();
            }, 800);
          } catch (error) {
            console.error('PDF generation failed:', error);
            hideLoading();
          }
        } else {
          hideLoading();
          showModal();
          showStep(2);
          shakeModal();
        }
      }, 300);
    } catch (error) {
      console.error('验证失败:', error);
      shakeModal();
    } finally {
      setButtonLoading('cv-verify-btn', false);
    }
  }
  

  function init() {
    createModal();
    updateLanguage();
    
    const downloadBtn = document.querySelector('.btn-download');
    if (downloadBtn) {
      console.log('CV Download: Attaching event to download button');
      
      const newBtn = downloadBtn.cloneNode(true);
      downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
      
      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('CV Download: Button clicked, showing modal');
        showModal();
      });
      
      console.log('CV Download: Event attached successfully');
    } else {
      console.error('CV Download: Button not found');
    }
    
    const closeBtn = document.querySelector('.cv-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', hideModal);
    }
    
    const cancelBtn1 = document.getElementById('cv-cancel-btn-1');
    if (cancelBtn1) {
      cancelBtn1.addEventListener('click', hideModal);
    }
    
    const backBtn = document.getElementById('cv-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const boxes = document.querySelectorAll('.cv-token-box');
        boxes.forEach(box => {
          box.value = '';
          box.classList.remove('filled');
        });
        showStep(1);
      });
    }
    

    
    const requestForm = document.getElementById('cv-request-form');
    if (requestForm) {
      requestForm.addEventListener('submit', handleRequestSubmit);
    }
    
    const verifyForm = document.getElementById('cv-verify-form');
    if (verifyForm) {
      verifyForm.addEventListener('submit', handleVerifySubmit);
    }
    
    setupTokenInputs();
    
    window.addEventListener('languageChanged', function() {
      updateLanguage();
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 200);
    });
  } else {
    setTimeout(init, 200);
  }
})();
