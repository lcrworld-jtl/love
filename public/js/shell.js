// 顶层 shell 脚本
// 职责：iframe 初始路由、URL 同步、前进/后退支持、切换页面时的丝滑淡入淡出过渡
// 原理：音乐播放器常驻本层，各页面内容在 iframe 内切换 → 切换页面不刷新、音乐不断
(function () {
  'use strict';

  // 仅顶层 shell 生效
  if (window.self !== window.top) return;

  const frame = document.getElementById('app-frame');
  if (!frame) return;

  const BASE = location.origin;
  // 直达页面白名单（其余一律回首页内容）
  const PAGES = [
    '/home', '/lover', '/capsule', '/stars', '/anniversary',
    '/gallery', '/bucket-list', '/agreement'
  ];

  function resolveTarget() {
    let p = location.pathname.replace(/\/+$/, '') || '/';
    if (p === '/') return BASE + '/home';
    if (PAGES.indexOf(p) === -1) return BASE + '/home';
    return BASE + p;
  }

  function syncURL() {
    try {
      const p = frame.contentWindow.location.pathname;
      if (p && p !== location.pathname) {
        history.pushState({}, '', p);
      }
      const t = frame.contentDocument && frame.contentDocument.title;
      if (t) document.title = t;
    } catch (e) {}
  }

  // 淡入：新页面载入后平滑显现
  function fadeIn() {
    frame.classList.add('ready');
    frame.style.pointerEvents = 'auto';
  }

  // 淡出：切换前先隐藏，避免生硬的跳变
  function fadeOut() {
    frame.classList.remove('ready');
    frame.style.pointerEvents = 'none';
  }

  // 拦截 iframe 内部站内链接：淡出后切换 src，并同步地址栏 URL
  function bindNavFade() {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.removeEventListener('click', handleInnerClick, true);
      doc.addEventListener('click', handleInnerClick, true);
    } catch (e) {}
  }

  function handleInnerClick(e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    // 锚点或新窗口链接不拦截
    if (href.startsWith('#') || a.target === '_blank' || a.hasAttribute('download')) return;
    // 站外链接不拦截
    let path = href;
    try {
      if (/^https?:\/\//i.test(href)) {
        if (new URL(href).origin !== BASE) return;
        path = new URL(href).pathname;
      }
    } catch (err) { return; }

    const clean = path.replace(/\/+$/, '') || '/';
    if (PAGES.indexOf(clean) === -1 && clean !== '/') return;
    // 已在目标页则无需重载
    const current = (location.pathname.replace(/\/+$/, '') || '/') === '/'
      ? '/home'
      : location.pathname.replace(/\/+$/, '');
    if (clean === current) return;

    e.preventDefault();
    e.stopPropagation();
    fadeOut();
    frame.src = BASE + (clean === '/' ? '/home' : clean);
  }

  frame.addEventListener('load', function () {
    syncURL();
    window.scrollTo(0, 0);
    fadeIn();
    bindNavFade();
  });

  // 浏览器前进 / 后退
  window.addEventListener('popstate', function () {
    fadeOut();
    frame.src = resolveTarget();
  });

  // 初始加载
  fadeOut();
  frame.src = resolveTarget();
})();