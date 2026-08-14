// Love 站点公共脚本 - 所有页面共用
// 功能：Service Worker 注册、访问统计埋点、Toast 提示、请求封装

(function () {
  'use strict';

  // iframe 模式：由顶层 shell 统一提供播放器/特效
  const IN_IFRAME = window.self !== window.top;
  if (IN_IFRAME) {
    // 移除页面自带的音乐播放器 DOM，避免与顶层常驻播放器重复
    ['music-player', 'music-playlist', 'playlist-overlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.parentNode.removeChild(el);
    });
  }

  // ===== 访问者唯一 ID（localStorage 持久化） =====
  function getVisitorId() {
    let id = localStorage.getItem('love_visitor_id');
    if (!id) {
      id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('love_visitor_id', id);
    }
    return id;
  }

  // ===== 访问统计埋点 =====
  function trackVisit() {
    try {
      fetch('/api/stats/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: location.pathname || '/',
          visitorId: getVisitorId()
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // ===== Service Worker 注册 =====
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.js').catch(function () {
          // 注册失败静默处理
        });
      });
    }
  }

  // ===== 全局 Toast =====
  let toastEl = null;
  let toastTimer = null;
  function showToast(msg, duration) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'global-toast';
      toastEl.style.cssText = [
        'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
        'background:rgba(0,0,0,0.78)', 'color:#fff', 'padding:10px 20px',
        'border-radius:24px', 'font-size:13px', 'z-index:9999',
        'opacity:0', 'transition:opacity 0.25s', 'pointer-events:none',
        'max-width:80%', 'text-align:center', 'letter-spacing:0.5px'
      ].join(';');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = '0';
    }, duration || 2000);
  }

  // ===== 封装 fetch（统一错误处理） =====
  async function api(url, options) {
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '请求失败');
        return null;
      }
      return data;
    } catch (e) {
      showToast('网络错误');
      return null;
    }
  }

  // 暴露到全局
  window.LoveCommon = {
    getVisitorId: getVisitorId,
    trackVisit: trackVisit,
    registerSW: registerSW,
    showToast: showToast,
    api: api
  };

  // 自动初始化
  trackVisit();
  registerSW();
})();
