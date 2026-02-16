// 移动端汉堡菜单控制
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('menu');
  
  if (!menuToggle || !menu) return;
  
  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  document.body.appendChild(overlay);
  
  // 切换菜单
  function toggleMenu() {
    menuToggle.classList.toggle('active');
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // 防止背景滚动
    if (menu.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  
  // 关闭菜单
  function closeMenu() {
    menuToggle.classList.remove('active');
    menu.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // 点击汉堡按钮
  menuToggle.addEventListener('click', toggleMenu);
  
  // 点击遮罩层关闭
  overlay.addEventListener('click', closeMenu);
  
  // 点击菜单项后关闭菜单
  const menuLinks = menu.querySelectorAll('a');
  menuLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // ESC键关闭菜单
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      closeMenu();
    }
  });
  
  // 窗口大小改变时关闭菜单
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth > 768 && menu.classList.contains('active')) {
        closeMenu();
      }
    }, 250);
  });
});
