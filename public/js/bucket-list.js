// 共同愿望清单
// 公开查看 + 进度条
// 管理员（携带 token）可勾选 / 添加 / 删除
// 数据源：GET /api/bucket-list，POST/PUT/DELETE 需 Bearer token

(function () {
  'use strict';
  const { api, showToast } = window.LoveCommon;
  let items = [];
  let isAdmin = false;

  // 检测是否登录（携带 token 才能勾选/添加/删除）
  function checkAdmin() {
    const t = localStorage.getItem('love_token');
    isAdmin = !!t;
    document.getElementById('add-toggle').style.display = isAdmin ? 'inline-flex' : 'none';
  }

  function authHeaders() {
    return { 'Authorization': 'Bearer ' + (localStorage.getItem('love_token') || '') };
  }

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // 渲染进度条
  function renderProgress() {
    const total = items.length;
    const done = items.filter(x => x.done).length;
    const percent = total ? Math.round(done / total * 100) : 0;
    const card = document.getElementById('progress-card');
    if (!total) {
      card.innerHTML = `
        <div class="pc-head">
          <span class="pc-label">我们的进度</span>
          <span class="pc-count">0<span class="total"> / 0</span></span>
        </div>
        <div class="progress-bar"><div class="pb-fill" style="width:0%"></div></div>
        <div class="pc-percent">还没有愿望，开始添加吧</div>
      `;
      return;
    }
    card.innerHTML = `
      <div class="pc-head">
        <span class="pc-label">我们的进度</span>
        <span class="pc-count">${done}<span class="total"> / ${total}</span></span>
      </div>
      <div class="progress-bar"><div class="pb-fill" style="width:${percent}%"></div></div>
      <div class="pc-percent">${percent}% · ${total - done} 件未完成</div>
    `;
  }

  // 渲染列表（分两组：未完成 / 已完成）
  function renderList() {
    const container = document.getElementById('bucket-container');
    if (!items.length) {
      container.innerHTML = `
        <div class="empty">
          <div class="em-icon">📝</div>
          <div>愿望清单还是空的</div>
          <div style="font-size:12px;margin-top:6px">${isAdmin ? '点击上方按钮添加第一个愿望' : '管理员可在后台添加'}</div>
        </div>
      `;
      return;
    }

    // 排序：未完成在前，已完成在后；同组内按添加顺序
    const todo = items.filter(x => !x.done);
    const done = items.filter(x => x.done);

    const todoHtml = todo.length ? `
      <div class="group-title">
        <span>待完成</span>
        <span class="gt-line"></span>
      </div>
      <div class="bucket-list">
        ${todo.map(renderItem).join('')}
      </div>
    ` : '';

    const doneHtml = done.length ? `
      <div class="group-title">
        <span>已完成 ✨</span>
        <span class="gt-line"></span>
      </div>
      <div class="bucket-list">
        ${done.map(renderItem).join('')}
      </div>
    ` : '';

    container.innerHTML = todoHtml + doneHtml;

    // 绑定勾选/删除
    container.querySelectorAll('.bi-check').forEach(el => {
      el.addEventListener('click', () => toggleDone(el.dataset.id));
    });
    container.querySelectorAll('.bi-del').forEach(el => {
      el.addEventListener('click', () => delItem(el.dataset.id));
    });
  }

  function renderItem(it) {
    return `
      <div class="bucket-item ${it.done ? 'done' : ''}">
        <button class="bi-check" data-id="${esc(it.id)}" aria-label="勾选">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <div class="bi-body">
          <div class="bi-title">${esc(it.title)}</div>
          ${it.desc ? `<div class="bi-desc">${esc(it.desc)}</div>` : ''}
          ${it.done && it.doneAt ? `<div class="bi-meta">完成于 ${fmtDate(it.doneAt)}</div>` : ''}
        </div>
        ${isAdmin ? `
          <button class="bi-del" data-id="${esc(it.id)}" aria-label="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        ` : ''}
      </div>
    `;
  }

  async function toggleDone(id) {
    if (!isAdmin) { showToast('请先登录管理员'); return; }
    const it = items.find(x => x.id === id);
    if (!it) return;
    const newDone = !it.done;
    // 乐观更新
    it.done = newDone;
    it.doneAt = newDone ? new Date().toISOString() : null;
    renderProgress();
    renderList();

    const res = await fetch('/api/bucket-list/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ done: newDone })
    });
    if (!res.ok) {
      showToast('更新失败');
      load();  // 回滚
    }
  }

  async function delItem(id) {
    if (!isAdmin) return;
    if (!confirm('确认删除这个愿望？')) return;
    const res = await fetch('/api/bucket-list/' + id, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (res.ok) {
      showToast('已删除');
      load();
    } else {
      showToast('删除失败');
    }
  }

  async function addItem() {
    const title = document.getElementById('add-title').value.trim();
    const desc = document.getElementById('add-desc').value.trim();
    if (!title) { showToast('请填写标题'); return; }
    const btn = document.getElementById('add-submit');
    btn.disabled = true;
    btn.textContent = '添加中...';
    try {
      const res = await fetch('/api/bucket-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title, desc })
      });
      const r = await res.json();
      if (res.ok && r.ok) {
        showToast('已添加');
        document.getElementById('add-title').value = '';
        document.getElementById('add-desc').value = '';
        document.getElementById('add-form').classList.remove('show');
        load();
      } else {
        showToast(r.error || '添加失败');
      }
    } catch (e) {
      showToast('网络错误');
    } finally {
      btn.disabled = false;
      btn.textContent = '添加';
    }
  }

  function bindEvents() {
    document.getElementById('add-toggle').addEventListener('click', () => {
      document.getElementById('add-form').classList.toggle('show');
    });
    document.getElementById('add-cancel').addEventListener('click', () => {
      document.getElementById('add-form').classList.remove('show');
    });
    document.getElementById('add-submit').addEventListener('click', addItem);
  }

  async function load() {
    const r = await api('/api/bucket-list');
    if (!r) return;
    items = r.items || [];
    renderProgress();
    renderList();
  }

  checkAdmin();
  bindEvents();
  load();
})();
