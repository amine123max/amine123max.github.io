// 不蒜子计数器数字格式化
// 将大数字格式化为 K（千）格式，与其他统计数据保持一致

(function() {
  function formatNumber(num) {
    if (!num || isNaN(num)) return '--';
    const n = parseInt(num);
    if (n >= 1000) {
      return (n / 1000).toFixed(1) + 'K';
    }
    return n.toString();
  }

  function updateBusuanzi() {
    const pvElement = document.getElementById('busuanzi_value_site_pv');
    const uvElement = document.getElementById('busuanzi_value_site_uv');
    
    if (pvElement && pvElement.textContent && pvElement.textContent !== '--') {
      const rawValue = pvElement.textContent.replace(/[^0-9]/g, '');
      if (rawValue) {
        pvElement.setAttribute('data-raw-value', rawValue);
        pvElement.textContent = formatNumber(rawValue);
      }
    }
    
    if (uvElement && uvElement.textContent && uvElement.textContent !== '--') {
      const rawValue = uvElement.textContent.replace(/[^0-9]/g, '');
      if (rawValue) {
        uvElement.setAttribute('data-raw-value', rawValue);
        uvElement.textContent = formatNumber(rawValue);
      }
    }
  }

  // 监听不蒜子加载完成
  let checkCount = 0;
  const maxChecks = 50; // 最多检查5秒
  
  const checkInterval = setInterval(function() {
    checkCount++;
    const pvElement = document.getElementById('busuanzi_value_site_pv');
    
    if (pvElement && pvElement.textContent && pvElement.textContent !== '--' && pvElement.textContent !== '0') {
      updateBusuanzi();
      clearInterval(checkInterval);
    } else if (checkCount >= maxChecks) {
      clearInterval(checkInterval);
      console.log('Busuanzi counter timeout');
    }
  }, 100);

  // 页面加载完成后也检查一次
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(updateBusuanzi, 1000);
    });
  } else {
    setTimeout(updateBusuanzi, 1000);
  }

  // MutationObserver 监听DOM变化
  if (window.MutationObserver) {
    let busuanziObserver = null;
    
    // 等待元素出现后开始监听
    const waitForElement = setInterval(function() {
      const pvElement = document.getElementById('busuanzi_value_site_pv');
      if (pvElement && !busuanziObserver) {
        busuanziObserver = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.target.id === 'busuanzi_value_site_pv' || 
                mutation.target.id === 'busuanzi_value_site_uv') {
              updateBusuanzi();
            }
          });
        });
        
        busuanziObserver.observe(pvElement, { 
          childList: true, 
          characterData: true, 
          subtree: true 
        });
        clearInterval(waitForElement);
      }
    }, 100);
  }
})();
