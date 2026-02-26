// 页面内语言切换功能
(function() {
    // 获取当前语言设置
    function getCurrentLang() {
        return localStorage.getItem('site-lang') || 'en';
    }

    // 只管理站点语言节点，避免误伤代码高亮等 data-lang="python" 元素
    function getLanguageNodes() {
        return Array.from(document.querySelectorAll('[data-lang]')).filter(el => {
            const value = (el.getAttribute('data-lang') || '').toLowerCase();
            return value === 'en' || value === 'zh';
        });
    }

    // 设置语言
    function setLanguage(lang) {
        localStorage.setItem('site-lang', lang);
        document.documentElement.setAttribute('lang', lang);

        const languageNodes = getLanguageNodes();

        // 隐藏站点中英文节点
        languageNodes.forEach(el => {
            el.style.display = 'none';
        });

        // 显示选中语言节点
        languageNodes.forEach(el => {
            const targetLang = (el.getAttribute('data-lang') || '').toLowerCase();
            if (targetLang !== lang) {
                return;
            }

            // 获取元素的标签名
            const tagName = el.tagName.toLowerCase();

            // 根据元素类型设置display
            if (tagName === 'span' || tagName === 'a') {
                el.style.display = 'inline';
            } else if (tagName === 'li') {
                el.style.display = 'list-item';
            } else {
                // div, ul, ol, p, section等都用block
                el.style.display = 'block';
            }
        });

        // 更新语言切换按钮文本
        updateLangButton(lang);

        // 触发语言切换事件（用于打字机效果重置）
        const event = new CustomEvent('languageChanged', { detail: { lang: lang } });
        window.dispatchEvent(event);
    }

    // 更新语言切换按钮 - 只显示另一种语言
    function updateLangButton(currentLang) {
        const langButtons = document.querySelectorAll('.lang-switch a');
        langButtons.forEach(btn => {
            const btnLang = btn.getAttribute('data-switch-lang');
            // 隐藏当前语言的按钮，显示另一个语言的按钮
            if (btnLang === currentLang) {
                btn.parentElement.style.display = 'none';
            } else {
                btn.parentElement.style.display = '';
            }
        });
    }

    // 初始化
    function init() {
        const currentLang = getCurrentLang();
        setLanguage(currentLang);
        
        // 绑定语言切换按钮事件
        document.querySelectorAll('.lang-switch a').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetLang = this.getAttribute('data-switch-lang');
                setLanguage(targetLang);
            });
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
