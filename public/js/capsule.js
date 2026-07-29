// 时间胶囊页面逻辑
(function () {
  'use strict';

  const { api, showToast } = window.LoveCommon;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // 设置默认解锁时间为一周后
  function setDefaultUnlock() {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    const val = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    const input = document.getElementById('cap-unlock');
    if (input && !input.value) input.value = val;
  }

  async function submitCapsule() {
    const from = document.getElementById('cap-from').value.trim();
    const to = document.getElementById('cap-to').value.trim();
    const content = document.getElementById('cap-content').value.trim();
    const unlockAt = document.getElementById('cap-unlock').value;

    if (!content) { showToast('请写下胶囊内容'); return; }
    if (!unlockAt) { showToast('请选择解锁时间'); return; }

    const btn = document.getElementById('cap-submit');
    btn.disabled = true;
    btn.textContent = '封存中...';

    const data = await api('/api/capsules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, content, unlockAt })
    });

    btn.disabled = false;
    btn.textContent = '封存这颗胶囊';

    const result = document.getElementById('cap-result');
    if (data && data.ok) {
      // 保存胶囊 ID 到本地，方便日后查询
      const myCapsules = JSON.parse(localStorage.getItem('my_capsules') || '[]');
      myCapsules.push({ id: data.id, unlockAt: data.unlockAt });
      localStorage.setItem('my_capsules', JSON.stringify(myCapsules));

      const unlockDate = new Date(data.unlockAt);
      result.innerHTML = `
        <div class="cap-success">
          <div class="cap-success-title">胶囊已封存</div>
          <div class="cap-success-info">将于 ${formatDate(data.unlockAt)} 开启</div>
          <div class="cap-success-link">保存好这个链接，到时回来开启：<br><a href="/capsule?id=${data.id}">${location.origin}/capsule?id=${data.id}</a></div>
        </div>
      `;
      document.getElementById('cap-content').value = '';
      loadOpened();
    } else {
      result.innerHTML = '<div class="cap-error">封存失败，请重试</div>';
    }
  }

  // 计算剩余时间文案
  function countdownText(unlockAt) {
    const remain = new Date(unlockAt).getTime() - Date.now();
    if (remain <= 0) return '已到开启时间';
    const days = Math.floor(remain / 86400000);
    const hours = Math.floor((remain % 86400000) / 3600000);
    const mins = Math.floor((remain % 3600000) / 60000);
    if (days > 0) return `还有 ${days} 天 ${hours} 小时开启`;
    if (hours > 0) return `还有 ${hours} 小时 ${mins} 分钟开启`;
    return `还有 ${mins} 分钟开启`;
  }

  async function loadOpened() {
    const data = await api('/api/capsules');
    const container = document.getElementById('cap-opened');
    if (!data) return;
    const list = data.capsules || [];
    if (!list.length) {
      container.innerHTML = '<div class="msg-empty">还没有胶囊，做第一个埋下时光的人吧</div>';
      return;
    }
    // 排序：未解锁的（按即将开启）在前，已解锁的（按创建时间倒序）在后
    const sorted = list.slice().sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1;
      if (!a.unlocked) return new Date(a.unlockAt) - new Date(b.unlockAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    container.innerHTML = sorted.map(c => {
      if (c.unlocked) {
        return `
          <div class="cap-card">
            <div class="cap-meta">
              <span class="cap-from">${esc(c.from)}</span>
              <span class="cap-arrow">→</span>
              <span class="cap-to">${esc(c.to)}</span>
            </div>
            <div class="cap-content">${esc(c.content).replace(/\n/g, '<br>')}</div>
            <div class="cap-footer">
              <span>埋下于 ${formatDate(c.createdAt)}</span>
              <span>开启于 ${formatDate(c.unlockAt)}</span>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="cap-card locked">
            <div class="cap-meta">
              <span class="cap-from">${esc(c.from)}</span>
              <span class="cap-arrow">→</span>
              <span class="cap-to">${esc(c.to)}</span>
            </div>
            <div class="cap-locked-title">🔒 这颗胶囊还在沉睡</div>
            <div class="cap-locked-countdown">${countdownText(c.unlockAt)}</div>
            <div class="cap-footer">
              <span>埋下于 ${formatDate(c.createdAt)}</span>
              <span>解锁时间 ${formatDate(c.unlockAt)}</span>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // 查询特定胶囊（通过 URL ?id=xxx）
  async function checkCapsuleById() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) return;
    const data = await api('/api/capsules/' + id);
    if (!data) return;

    const container = document.getElementById('cap-opened');
    if (data.unlocked) {
      container.innerHTML = `
        <div class="cap-card highlighted">
          <div class="cap-meta">
            <span class="cap-from">${esc(data.from)}</span>
            <span class="cap-arrow">→</span>
            <span class="cap-to">${esc(data.to)}</span>
          </div>
          <div class="cap-content">${esc(data.content).replace(/\n/g, '<br>')}</div>
          <div class="cap-footer">
            <span>埋下于 ${formatDate(data.createdAt)}</span>
            <span>开启于 ${formatDate(data.unlockAt)}</span>
          </div>
        </div>
      `;
      container.scrollIntoView({ behavior: 'smooth' });
    } else {
      const remain = new Date(data.unlockAt).getTime() - Date.now();
      const days = Math.floor(remain / 86400000);
      const hours = Math.floor((remain % 86400000) / 3600000);
      container.innerHTML = `
        <div class="cap-card locked">
          <div class="cap-locked-title">这颗胶囊还没到开启时间</div>
          <div class="cap-locked-info">来自 ${esc(data.from)} 致 ${esc(data.to)}</div>
          <div class="cap-locked-countdown">还有 ${days} 天 ${hours} 小时开启</div>
          <div class="cap-locked-date">解锁时间：${formatDate(data.unlockAt)}</div>
        </div>
      `;
      container.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 返回顶部按钮
  function initBackTop() {
    const btn = document.getElementById('back-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 400);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // 让所有 .section 立即可见（capsule 页是独立 HTML，没有 app.js 的 reveal observer）
  function revealAll() {
    document.querySelectorAll('.section').forEach(s => s.classList.add('revealed'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    setDefaultUnlock();
    document.getElementById('cap-submit').addEventListener('click', submitCapsule);
    revealAll();
    loadOpened();
    checkCapsuleById();
    initBackTop();
  });
})();
