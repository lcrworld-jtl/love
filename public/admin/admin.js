let token = localStorage.getItem('love_token') || '';
let data = null;

const root = document.getElementById('admin-root');
const toast = document.getElementById('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== 数据路径读写（解决索引错位崩溃问题） =====
// path 格式: "sections.2.items.3.name" / "title" / "sections.1.timeline.0.date"
function getByPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null) cur[p] = isNaN(Number(parts[i + 1])) ? {} : [];
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

// 全局事件委托 - 所有输入框/选择框/文本域的 input/change 都通过 data-path 写回 data
function bindGlobalInput() {
  root.addEventListener('input', (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    let v = el.value;
    if (el.type === 'number') v = v === '' ? 0 : (parseFloat(v) || 0);
    if (el.dataset.boolean === 'true') v = (v === 'true');
    setByPath(data, path, v);
  });
  root.addEventListener('change', (e) => {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    let v = el.value;
    if (el.type === 'checkbox') v = el.checked;
    if (el.dataset.boolean === 'true') v = (v === 'true');
    setByPath(data, path, v);
  });
}

// ===== 登录 =====
function renderLogin() {
  root.innerHTML = `
    <div class="login-box">
      <h2>Love 管理后台</h2>
      <input type="password" id="pwd" placeholder="输入密码" onkeydown="if(event.key==='Enter')doLogin()">
      <button class="btn btn-primary" style="width:100%" onclick="doLogin()">登录</button>
    </div>
  `;
}

async function doLogin() {
  const pwd = document.getElementById('pwd').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    if (res.ok) {
      const r = await res.json();
      token = r.token;
      localStorage.setItem('love_token', token);
      load();
    } else {
      showToast('密码错误');
    }
  } catch (e) {
    showToast('网络错误');
  }
}

async function load() {
  try {
    const res = await fetch('/api/content?t=' + Date.now());
    data = await res.json();
    renderEditor();
  } catch (e) {
    showToast('加载失败');
  }
}

// ===== 主编辑器渲染 =====
let currentTab = 'content';

function renderEditor() {
  root.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h1>Love 管理</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-outline" href="/" target="_blank" style="text-decoration:none">预览首页</a>
          <a class="btn btn-outline" href="/lover" target="_blank" style="text-decoration:none">/lover</a>
          <a class="btn btn-outline" href="/capsule" target="_blank" style="text-decoration:none">/capsule</a>
          <a class="btn btn-outline" href="/stars" target="_blank" style="text-decoration:none">/stars</a>
          <a class="btn btn-outline" href="/anniversary" target="_blank" style="text-decoration:none">/anniversary</a>
          <a class="btn btn-outline" href="/gallery" target="_blank" style="text-decoration:none">/gallery</a>
          <a class="btn btn-outline" href="/bucket-list" target="_blank" style="text-decoration:none">/bucket-list</a>
          <button class="btn btn-outline" onclick="logout()">退出</button>
        </div>
      </div>
      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab ${currentTab==='content'?'active':''}" data-tab="content">内容板块</button>
        <button class="admin-tab ${currentTab==='messages'?'active':''}" data-tab="messages">留言墙</button>
        <button class="admin-tab ${currentTab==='apply'?'active':''}" data-tab="apply">入驻申请</button>
        <button class="admin-tab ${currentTab==='voice'?'active':''}" data-tab="voice">语音留言</button>
        <button class="admin-tab ${currentTab==='capsules'?'active':''}" data-tab="capsules">时间胶囊</button>
        <button class="admin-tab ${currentTab==='wishes'?'active':''}" data-tab="wishes">星空许愿</button>
        <button class="admin-tab ${currentTab==='anniv'?'active':''}" data-tab="anniv">纪念日</button>
        <button class="admin-tab ${currentTab==='gallery'?'active':''}" data-tab="gallery">照片墙</button>
        <button class="admin-tab ${currentTab==='bucket'?'active':''}" data-tab="bucket">愿望清单</button>
        <button class="admin-tab ${currentTab==='agreement'?'active':''}" data-tab="agreement">君子协定</button>
        <button class="admin-tab ${currentTab==='stats'?'active':''}" data-tab="stats">访问统计</button>
      </div>
      <div id="tab-content"></div>
    </div>
  `;

  // Tab 切换
  root.querySelectorAll('.admin-tab').forEach(t => {
    t.addEventListener('click', () => {
      currentTab = t.dataset.tab;
      renderEditor();
    });
  });

  // 渲染当前 Tab
  if (currentTab === 'content') renderContentTab();
  else if (currentTab === 'messages') renderMessagesTab();
  else if (currentTab === 'apply') renderApplyTab();
  else if (currentTab === 'voice') renderVoiceTab();
  else if (currentTab === 'capsules') renderCapsulesTab();
  else if (currentTab === 'wishes') renderWishesTab();
  else if (currentTab === 'anniv') renderAnnivTab();
  else if (currentTab === 'gallery') renderGalleryTab();
  else if (currentTab === 'bucket') renderBucketTab();
  else if (currentTab === 'agreement') renderAgreementTab();
  else if (currentTab === 'stats') renderStatsTab();
}

// ===== 内容板块 Tab =====
function renderContentTab() {
  const tabContent = document.getElementById('tab-content');
  const sectionsHtml = (data.sections || []).map((sec, i) => renderSection(sec, i)).join('');

  tabContent.innerHTML = `
    <div class="field">
      <label>页面标题</label>
      <input type="text" value="${esc(data.title)}" data-path="title">
    </div>
    <div class="field">
      <label>副标题</label>
      <input type="text" value="${esc(data.subtitle)}" data-path="subtitle">
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:20px 0">
    ${sectionsHtml}
    <button class="add-btn" onclick="addSection()">+ 添加板块</button>
    <div class="save-bar">
      <button class="btn btn-outline" onclick="load()">重置</button>
      <button class="btn btn-primary" onclick="save()">保存</button>
    </div>
  `;
}

// ===== 留言墙 Tab =====
async function renderMessagesTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/messages/all', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const msgs = r.messages || [];
  const pending = msgs.filter(m => !m.approved);
  const approved = msgs.filter(m => m.approved);

  tabContent.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card"><div class="stats-num">${pending.length}</div><div class="stats-label">待审核</div></div>
      <div class="stats-card"><div class="stats-num">${approved.length}</div><div class="stats-label">已通过</div></div>
    </div>
    ${pending.length ? '<h3 style="margin:16px 0 8px;color:var(--primary-dark)">待审核</h3>' : ''}
    ${pending.map(m => renderMessageCard(m, true)).join('') || ''}
    ${approved.length ? '<h3 style="margin:16px 0 8px;color:var(--primary-dark)">已通过</h3>' : ''}
    ${approved.map(m => renderMessageCard(m, false)).join('') || ''}
    ${!msgs.length ? '<div class="empty-hint">暂无留言</div>' : ''}
  `;
}

function renderMessageCard(m, isPending) {
  return `
    <div class="list-card ${isPending ? 'pending' : 'approved'}">
      <div class="list-card-head">
        <div>
          <span class="list-card-title">${esc(m.name)}</span>
          <span class="badge ${isPending ? 'badge-pending' : 'badge-approved'}">${isPending ? '待审核' : '已通过'}</span>
        </div>
        <span class="list-card-meta">${new Date(m.time).toLocaleString('zh-CN')}</span>
      </div>
      <div class="list-card-body">${esc(m.content)}</div>
      <div class="list-card-actions">
        ${isPending ? `<button class="btn btn-primary" onclick="approveMsg('${m.id}', true)">通过</button>` : `<button class="btn btn-outline" onclick="approveMsg('${m.id}', false)">取消通过</button>`}
        <button class="btn btn-danger" onclick="delMsg('${m.id}')">删除</button>
      </div>
    </div>
  `;
}

async function approveMsg(id, approved) {
  await fetch('/api/messages/' + id + '/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ approved })
  });
  renderMessagesTab();
}

async function delMsg(id) {
  if (!confirm('确认删除？')) return;
  await fetch('/api/messages/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderMessagesTab();
}

// ===== 入驻申请 Tab（原有逻辑） =====
async function renderApplyTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/applications', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const apps = r.applications || [];

  if (!apps.length) {
    tabContent.innerHTML = '<div class="empty-hint">暂无申请</div>';
    return;
  }

  tabContent.innerHTML = apps.map(a => {
    const skipKeys = ['id', 'role', 'time'];
    const fieldLabels = { name: '名字', realName: '真实姓名', gender: '性别', zodiac: '星座', birthDate: '出生日期', classInfo: '班级', hobbies: '兴趣爱好', reason: '理由', contact: '联系方式', message: '留言' };
    const fieldsHtml = Object.keys(a)
      .filter(k => !skipKeys.includes(k) && a[k])
      .map(k => `<div style="font-size:13px;margin:2px 0"><strong style="color:var(--primary)">${fieldLabels[k]||k}：</strong>${esc(String(a[k]))}</div>`)
      .join('');
    return `
      <div class="list-card">
        <div class="list-card-head">
          <div>
            <span class="list-card-title">${esc(a.role)}</span>
          </div>
          <span class="list-card-meta">${new Date(a.time).toLocaleString('zh-CN')}</span>
        </div>
        <div class="list-card-body">${fieldsHtml}</div>
        <div class="list-card-actions">
          <button class="btn btn-primary" onclick="approveApplication('${a.id}')">一键通过</button>
          <button class="btn btn-danger" onclick="delApplication('${a.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

async function approveApplication(id) {
  if (!confirm('确认通过该申请并把申请者设为正式成员？')) return;
  const res = await fetch('/api/applications/' + id + '/approve', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const r = await res.json().catch(() => ({}));
  if (res.ok) {
    showToast('已通过：' + (r.person || ''));
    renderApplyTab();
  } else {
    showToast(r.error || '通过失败');
  }
}

async function delApplication(id) {
  if (!confirm('确认删除？')) return;
  await fetch('/api/applications/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderApplyTab();
}

// ===== 语音留言 Tab =====
async function renderVoiceTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/voice/all', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const voices = r.voices || [];

  const uploadBox = `
    <div class="list-card" style="margin-bottom:16px;border:2px dashed var(--border)">
      <div class="list-card-head">
        <div><span class="list-card-title">手动上传音频</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--text-secondary)">来源名字</label>
          <input type="text" id="voice-up-from" placeholder="如：某位朋友" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
        </div>
        <div style="flex:1;min-width:160px">
          <label style="font-size:12px;color:var(--text-secondary)">音频文件（mp3/wav/m4a/ogg/webm，≤20MB）</label>
          <input type="file" id="voice-up-file" accept="audio/*" style="width:100%;margin-top:4px;font-size:12px">
        </div>
        <button class="btn btn-primary" id="voice-up-btn" onclick="uploadVoiceFile()">上传</button>
      </div>
    </div>
  `;

  if (!voices.length) {
    tabContent.innerHTML = uploadBox + '<div class="empty-hint">暂无语音留言</div>';
    return;
  }

  tabContent.innerHTML = uploadBox + voices.map(v => `
    <div class="list-card ${v.approved ? 'approved' : 'pending'}">
      <div class="list-card-head">
        <div>
          <span class="list-card-title">${esc(v.from)}</span>
          <span class="badge ${v.approved ? 'badge-approved' : 'badge-pending'}">${v.approved ? '已通过' : '待审核'}</span>
        </div>
        <span class="list-card-meta">${new Date(v.time).toLocaleString('zh-CN')} · ${v.duration}s · ${(v.size/1024).toFixed(0)}KB${v.origName ? ' · ' + esc(v.origName) : ''}</span>
      </div>
      <audio controls preload="none" src="/voice/${esc(v.filename)}" style="width:100%;margin:8px 0"></audio>
      <div class="list-card-actions">
        ${v.approved ? `<button class="btn btn-outline" onclick="approveVoice('${v.id}', false)">取消通过</button>` : `<button class="btn btn-primary" onclick="approveVoice('${v.id}', true)">通过</button>`}
        <button class="btn btn-danger" onclick="delVoice('${v.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

// 后台手动上传音频文件：读取为 base64，走 JSON 提交
async function uploadVoiceFile() {
  const fileInput = document.getElementById('voice-up-file');
  const fromInput = document.getElementById('voice-up-from');
  const btn = document.getElementById('voice-up-btn');
  const file = fileInput && fileInput.files[0];
  if (!file) { showToast('请选择音频文件'); return; }
  if (file.size > 20 * 1024 * 1024) { showToast('文件不能超过 20MB'); return; }

  btn.disabled = true;
  btn.textContent = '上传中...';

  try {
    // 读取为 Data URL（base64）
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('读取失败'));
      r.readAsDataURL(file);
    });

    const res = await fetch('/api/voice/admin-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        from: (fromInput && fromInput.value.trim()) || '管理员上传',
        filename: file.name,
        mime: file.type || 'audio/mp3',
        data: dataUrl
      })
    });
    const r = await res.json();
    if (res.ok && r.ok) {
      showToast('上传成功');
      renderVoiceTab();
    } else {
      showToast('上传失败：' + (r.error || '未知错误'));
    }
  } catch (e) {
    showToast('上传失败：' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '上传';
  }
}

async function approveVoice(id, approved) {
  await fetch('/api/voice/' + id + '/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ approved })
  });
  renderVoiceTab();
}

async function delVoice(id) {
  if (!confirm('确认删除？此操作不可恢复')) return;
  await fetch('/api/voice/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderVoiceTab();
}

// ===== 时间胶囊 Tab =====
async function renderCapsulesTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/capsules/all', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const caps = r.capsules || [];

  if (!caps.length) {
    tabContent.innerHTML = '<div class="empty-hint">暂无时间胶囊</div>';
    return;
  }

  const now = Date.now();
  tabContent.innerHTML = caps.map(c => {
    const unlocked = new Date(c.unlockAt).getTime() <= now;
    return `
      <div class="list-card ${unlocked ? 'approved' : 'pending'}">
        <div class="list-card-head">
          <div>
            <span class="list-card-title">${esc(c.from)} → ${esc(c.to)}</span>
            <span class="badge ${unlocked ? 'badge-approved' : 'badge-pending'}">${unlocked ? '已解锁' : '未解锁'}</span>
          </div>
          <span class="list-card-meta">埋于 ${new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin:4px 0">解锁时间：${new Date(c.unlockAt).toLocaleString('zh-CN')}</div>
        ${unlocked ? `<div class="list-card-body">${esc(c.content).replace(/\n/g, '<br>')}</div>` : '<div class="list-card-body" style="color:var(--text-secondary);font-style:italic">[内容未解锁]</div>'}
        <div class="list-card-actions">
          <button class="btn btn-danger" onclick="delCapsule('${c.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

async function delCapsule(id) {
  if (!confirm('确认删除这颗胶囊？')) return;
  await fetch('/api/capsules/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderCapsulesTab();
}

// ===== 星空许愿 Tab =====
async function renderWishesTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/wishes/all', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const wishes = r.wishes || [];

  if (!wishes.length) {
    tabContent.innerHTML = '<div class="empty-hint">暂无愿望</div>';
    return;
  }

  tabContent.innerHTML = `
    <div class="stats-card" style="margin-bottom:16px"><div class="stats-num">${wishes.length}</div><div class="stats-label">总愿望数</div></div>
    ${wishes.slice().reverse().map(w => `
      <div class="list-card" style="border-left:3px solid ${esc(w.color || '#FFD700')}">
        <div class="list-card-head">
          <div><span class="list-card-title">${esc(w.name)}</span></div>
          <span class="list-card-meta">${new Date(w.time).toLocaleString('zh-CN')}</span>
        </div>
        <div class="list-card-body">${esc(w.wish)}</div>
        <div class="list-card-actions">
          <button class="btn btn-danger" onclick="delWish('${w.id}')">删除</button>
        </div>
      </div>
    `).join('')}
  `;
}

async function delWish(id) {
  if (!confirm('确认删除这个愿望？')) return;
  await fetch('/api/wishes/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderWishesTab();
}

// ===== 纪念日 Tab =====
async function renderAnnivTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/anniversaries');
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const events = r.events || [];

  const typeLabels = { together: '在一起', anniversary: '纪念日', birthday: '生日', custom: '自定义' };
  const addBox = `
    <div class="list-card" style="margin-bottom:16px;border:2px dashed var(--border)">
      <div class="list-card-head">
        <div><span class="list-card-title">添加纪念日事件</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--text-secondary)">类型</label>
          <select id="anniv-type" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
            <option value="together">在一起（用于实时计时）</option>
            <option value="anniversary">纪念日（每年）</option>
            <option value="birthday">生日（每年）</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--text-secondary)">标题</label>
          <input type="text" id="anniv-title" placeholder="如：我们在一起的日子" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--text-secondary)">日期</label>
          <input type="date" id="anniv-date" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
        </div>
      </div>
      <div style="margin-top:8px">
        <label style="font-size:12px;color:var(--text-secondary)">描述（选填）</label>
        <input type="text" id="anniv-desc" placeholder="一句话描述" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="anniv-yearly">
        <label for="anniv-yearly" style="font-size:12px;color:var(--text-secondary)">按年重复（生日/纪念日勾选）</label>
      </div>
      <div style="margin-top:10px;text-align:right">
        <button class="btn btn-primary" id="anniv-add-btn" onclick="addAnniv()">添加</button>
      </div>
    </div>
  `;

  if (!events.length) {
    tabContent.innerHTML = addBox + '<div class="empty-hint">暂无纪念日事件</div>';
    return;
  }

  tabContent.innerHTML = addBox + events.map(e => `
    <div class="list-card">
      <div class="list-card-head">
        <div>
          <span class="list-card-title">${esc(e.title)}</span>
          <span class="badge badge-approved">${typeLabels[e.type] || e.type}</span>
          ${e.yearly ? '<span class="badge badge-pending">每年</span>' : ''}
        </div>
        <span class="list-card-meta">${esc(e.date)}</span>
      </div>
      ${e.desc ? `<div class="list-card-body">${esc(e.desc)}</div>` : ''}
      <div class="list-card-actions">
        <button class="btn btn-danger" onclick="delAnniv('${e.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

async function addAnniv() {
  const type = document.getElementById('anniv-type').value;
  const title = document.getElementById('anniv-title').value.trim();
  const date = document.getElementById('anniv-date').value;
  const desc = document.getElementById('anniv-desc').value.trim();
  const yearly = document.getElementById('anniv-yearly').checked;
  if (!title || !date) { showToast('请填写标题和日期'); return; }
  // together 类型默认不每年重复
  const finalYearly = type === 'together' ? false : yearly;
  const res = await fetch('/api/anniversaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ type, title, date, desc, yearly: finalYearly })
  });
  if (res.ok) {
    showToast('已添加');
    renderAnnivTab();
  } else {
    showToast('添加失败');
  }
}

async function delAnniv(id) {
  if (!confirm('确认删除这个事件？')) return;
  await fetch('/api/anniversaries/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderAnnivTab();
}

// ===== 照片墙 Tab =====
async function renderGalleryTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/gallery');
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const photos = r.photos || [];

  const uploadBox = `
    <div class="list-card" style="margin-bottom:16px;border:2px dashed var(--border)">
      <div class="list-card-head">
        <div><span class="list-card-title">上传照片</span></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:160px">
          <label style="font-size:12px;color:var(--text-secondary)">图片文件（jpg/png/gif/webp，≤15MB）</label>
          <input type="file" id="gallery-up-file" accept="image/*" style="width:100%;margin-top:4px;font-size:12px">
        </div>
        <div style="flex:1;min-width:140px">
          <label style="font-size:12px;color:var(--text-secondary)">日期</label>
          <input type="date" id="gallery-up-date" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
        </div>
      </div>
      <div style="margin-top:8px">
        <label style="font-size:12px;color:var(--text-secondary)">一句话描述（选填）</label>
        <input type="text" id="gallery-up-caption" placeholder="如：春日野餐" maxlength="100" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="margin-top:10px;text-align:right">
        <button class="btn btn-primary" id="gallery-up-btn" onclick="uploadGalleryPhoto()">上传</button>
      </div>
    </div>
  `;

  if (!photos.length) {
    tabContent.innerHTML = uploadBox + '<div class="empty-hint">暂无照片</div>';
    return;
  }

  // 按日期倒序
  const sorted = photos.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  tabContent.innerHTML = uploadBox + sorted.map(p => `
    <div class="list-card">
      <div class="list-card-head">
        <div>
          <span class="list-card-title">${esc(p.caption || '（无描述）')}</span>
          <span class="list-card-meta">${esc(p.date || '')} · ${(p.size/1024).toFixed(0)}KB</span>
        </div>
        <span class="list-card-meta">${new Date(p.time).toLocaleString('zh-CN')}</span>
      </div>
      <img src="/gallery-img/${encodeURIComponent(p.filename)}" style="max-width:200px;max-height:200px;border-radius:8px;margin:8px 0;display:block;object-fit:cover">
      <div class="list-card-actions">
        <button class="btn btn-danger" onclick="delGallery('${p.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

async function uploadGalleryPhoto() {
  const fileInput = document.getElementById('gallery-up-file');
  const dateInput = document.getElementById('gallery-up-date');
  const captionInput = document.getElementById('gallery-up-caption');
  const btn = document.getElementById('gallery-up-btn');
  const file = fileInput && fileInput.files[0];
  if (!file) { showToast('请选择图片'); return; }
  if (file.size > 15 * 1024 * 1024) { showToast('图片不能超过 15MB'); return; }

  btn.disabled = true;
  btn.textContent = '上传中...';
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('读取失败'));
      r.readAsDataURL(file);
    });
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        filename: file.name,
        mime: file.type || 'image/jpeg',
        data: dataUrl,
        date: dateInput.value || new Date().toISOString().slice(0, 10),
        caption: (captionInput.value || '').trim()
      })
    });
    const r = await res.json();
    if (res.ok && r.ok) {
      showToast('上传成功');
      renderGalleryTab();
    } else {
      showToast('上传失败：' + (r.error || '未知错误'));
    }
  } catch (e) {
    showToast('上传失败：' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '上传';
  }
}

async function delGallery(id) {
  if (!confirm('确认删除这张照片？此操作不可恢复')) return;
  await fetch('/api/gallery/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderGalleryTab();
}

// ===== 愿望清单 Tab =====
async function renderBucketTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/bucket-list');
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const r = await res.json();
  const items = r.items || [];

  const addBox = `
    <div class="list-card" style="margin-bottom:16px;border:2px dashed var(--border)">
      <div class="list-card-head">
        <div><span class="list-card-title">添加愿望</span></div>
      </div>
      <div>
        <label style="font-size:12px;color:var(--text-secondary)">标题</label>
        <input type="text" id="bucket-title" placeholder="如：看一次极光" maxlength="80" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="margin-top:8px">
        <label style="font-size:12px;color:var(--text-secondary)">描述（选填）</label>
        <input type="text" id="bucket-desc" placeholder="补充说明" maxlength="200" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="margin-top:10px;text-align:right">
        <button class="btn btn-primary" onclick="addBucket()">添加</button>
      </div>
    </div>
  `;

  if (!items.length) {
    tabContent.innerHTML = addBox + '<div class="empty-hint">暂无愿望</div>';
    return;
  }

  const done = items.filter(x => x.done).length;
  const total = items.length;
  const percent = total ? Math.round(done / total * 100) : 0;

  tabContent.innerHTML = addBox + `
    <div class="stats-grid">
      <div class="stats-card"><div class="stats-num">${total}</div><div class="stats-label">总愿望</div></div>
      <div class="stats-card"><div class="stats-num">${done}</div><div class="stats-label">已完成 · ${percent}%</div></div>
    </div>
  ` + items.map(it => `
    <div class="list-card ${it.done ? 'approved' : 'pending'}">
      <div class="list-card-head">
        <div>
          <span class="list-card-title">${esc(it.title)}</span>
          <span class="badge ${it.done ? 'badge-approved' : 'badge-pending'}">${it.done ? '已完成' : '待完成'}</span>
        </div>
        <span class="list-card-meta">${it.doneAt ? '完成于 ' + new Date(it.doneAt).toLocaleDateString('zh-CN') : '添加于 ' + new Date(it.time).toLocaleDateString('zh-CN')}</span>
      </div>
      ${it.desc ? `<div class="list-card-body">${esc(it.desc)}</div>` : ''}
      <div class="list-card-actions">
        ${it.done
          ? `<button class="btn btn-outline" onclick="toggleBucket('${it.id}', false)">标记未完成</button>`
          : `<button class="btn btn-primary" onclick="toggleBucket('${it.id}', true)">标记完成</button>`}
        <button class="btn btn-danger" onclick="delBucket('${it.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

async function addBucket() {
  const title = document.getElementById('bucket-title').value.trim();
  const desc = document.getElementById('bucket-desc').value.trim();
  if (!title) { showToast('请填写标题'); return; }
  const res = await fetch('/api/bucket-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ title, desc })
  });
  if (res.ok) {
    showToast('已添加');
    renderBucketTab();
  } else {
    showToast('添加失败');
  }
}

async function toggleBucket(id, done) {
  await fetch('/api/bucket-list/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ done })
  });
  renderBucketTab();
}

async function delBucket(id) {
  if (!confirm('确认删除这个愿望？')) return;
  await fetch('/api/bucket-list/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
  renderBucketTab();
}

// ===== 君子协定 Tab =====
// 富文本编辑器 + 中文输入法防抖
async function renderAgreementTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';

  const res = await fetch('/api/agreement');
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const data = await res.json();

  tabContent.innerHTML = `
    <div class="agreement-editor">
      <h2 style="margin:0 0 16px">君子协定编辑</h2>

      <!-- 双语切换 -->
      <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:13px;color:#888">编辑语言：</span>
        <div style="display:inline-flex;border:1px solid #ddd;border-radius:6px;overflow:hidden">
          <button type="button" class="agr-lang-btn" data-lang="zh" style="padding:7px 16px;background:#2563eb;color:#fff;border:none;cursor:pointer;font-size:13px;font-family:inherit">中文版</button>
          <button type="button" class="agr-lang-btn" data-lang="en" style="padding:7px 16px;background:#fff;color:#333;border:none;border-left:1px solid #ddd;cursor:pointer;font-size:13px;font-family:inherit">English</button>
        </div>
        <span id="agr-lang-hint" style="font-size:12px;color:#aaa">前台 /agreement 页面根据访客选择的语言展示对应版本</span>
      </div>

      <div style="margin-bottom:12px">
        <input type="text" id="agr-title" class="form-input" placeholder="协定标题" value="${esc(data.title || '君子协定')}" style="width:100%;font-size:16px;font-weight:600;padding:10px 12px">
      </div>

      <div class="rt-toolbar" role="toolbar" aria-label="格式工具栏">
        <button type="button" class="rt-btn" data-cmd="bold" title="加粗 Ctrl+B"><b>B</b></button>
        <button type="button" class="rt-btn" data-cmd="italic" title="斜体 Ctrl+I"><i>I</i></button>
        <button type="button" class="rt-btn" data-cmd="underline" title="下划线 Ctrl+U"><u>U</u></button>
        <button type="button" class="rt-btn" data-cmd="strikeThrough" title="删除线"><s>S</s></button>
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="H1" title="一级标题">H1</button>
        <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="H2" title="二级标题">H2</button>
        <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="H3" title="三级标题">H3</button>
        <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="P" title="正文">正文</button>
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="无序列表">• 列表</button>
        <button type="button" class="rt-btn" data-cmd="insertOrderedList" title="有序列表">1. 列表</button>
        <button type="button" class="rt-btn" data-cmd="formatBlock" data-val="BLOCKQUOTE" title="引用">引用</button>
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn" data-cmd="justifyLeft" title="左对齐">左</button>
        <button type="button" class="rt-btn" data-cmd="justifyCenter" title="居中">中</button>
        <button type="button" class="rt-btn" data-cmd="justifyRight" title="右对齐">右</button>
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn" id="agr-link" title="插入链接">链接</button>
        <button type="button" class="rt-btn" data-cmd="insertHorizontalRule" title="分割线">—</button>
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn" data-cmd="removeFormat" title="清除格式">清除</button>
        <button type="button" class="rt-btn" id="agr-source" title="查看/编辑 HTML 源码">HTML</button>
      </div>

      <div id="agr-editor" class="rt-editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="协定正文编辑区"
           style="min-height:400px;max-height:600px;overflow-y:auto;background:#fff;border:1px solid #ddd;border-top:none;border-radius:0 0 6px 6px;padding:16px;font-size:15px;line-height:1.8;outline:none">${data.content || '<p>在此输入协定内容…</p>'}</div>
      <textarea id="agr-source-area" class="rt-source" style="display:none;width:100%;min-height:400px;max-height:600px;background:#1e1e1e;color:#d4d4d4;border:1px solid #ddd;border-radius:6px;padding:16px;font-family:Consolas,monospace;font-size:13px;resize:vertical" aria-label="HTML 源码编辑"></textarea>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn-primary" id="agr-save">保存</button>
          <span id="agr-status" style="font-size:13px;color:#888"></span>
        </div>
        <span id="agr-count" style="font-size:13px;color:#888">0 字</span>
      </div>
    </div>
    <style>
      .rt-toolbar{display:flex;flex-wrap:wrap;gap:2px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px 6px 0 0;padding:6px}
      .rt-btn{background:#fff;border:1px solid #ddd;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:13px;font-family:inherit;min-height:30px;transition:background .15s}
      .rt-btn:hover{background:#e8e8e8}
      .rt-btn:active{background:#d0d0d0}
      .rt-sep{width:1px;background:#ccc;margin:2px 4px}
      .rt-editor:focus{border-color:#aaa;box-shadow:0 0 0 2px rgba(37,99,235,.15)}
      .rt-editor:empty:before{content:attr(data-placeholder);color:#aaa}
      .rt-editor h1{font-size:1.6em;margin:.6em 0 .3em}
      .rt-editor h2{font-size:1.35em;margin:.6em 0 .3em}
      .rt-editor h3{font-size:1.15em;margin:.6em 0 .3em}
      .rt-editor p{margin:.5em 0}
      .rt-editor ul,.rt-editor ol{margin:.5em 0;padding-left:1.8em}
      .rt-editor blockquote{margin:.6em 0;padding:.4em 1em;border-left:4px solid #2563eb;background:#f9fafb;color:#555}
      .rt-editor a{color:#2563eb}
    </style>
  `;

  const editor = document.getElementById('agr-editor');
  const sourceArea = document.getElementById('agr-source-area');
  const titleInput = document.getElementById('agr-title');
  const saveBtn = document.getElementById('agr-save');
  const statusEl = document.getElementById('agr-status');
  const countEl = document.getElementById('agr-count');
  const sourceBtn = document.getElementById('agr-source');

  // ===== 中文输入法防抖 =====
  // compositionstart: 用户开始用输入法组字，此时不要保存/更新，否则会打断输入
  // compositionend: 组字结束，文本已确认，此时再触发保存
  let isComposing = false;
  let saveTimer = null;
  let sourceMode = false;

  // ===== 双语编辑：切换语言时缓存当前内容，恢复另一语言内容 =====
  // 两个语言的标题和正文都缓存在内存对象里，保存时一起提交
  const draft = {
    zh: { title: data.title || '君子协定', content: data.content || '<p>在此输入协定内容…</p>' },
    en: { title: data.titleEn || "Gentleman's Agreement", content: data.contentEn || '<p>Type the agreement here…</p>' }
  };
  let editLang = 'zh';

  function switchLang(newLang) {
    if (newLang === editLang) return;
    // 缓存当前语言内容
    draft[editLang].title = titleInput.value;
    draft[editLang].content = sourceMode ? sourceArea.value : editor.innerHTML;
    // 切换
    editLang = newLang;
    titleInput.value = draft[editLang].title;
    if (sourceMode) {
      sourceArea.value = draft[editLang].content;
    } else {
      editor.innerHTML = draft[editLang].content;
    }
    updateCount();
    // 更新按钮高亮
    tabContent.querySelectorAll('.agr-lang-btn').forEach(function (b) {
      if (b.dataset.lang === editLang) {
        b.style.background = '#2563eb'; b.style.color = '#fff';
      } else {
        b.style.background = '#fff'; b.style.color = '#333';
      }
    });
  }
  tabContent.querySelectorAll('.agr-lang-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchLang(b.dataset.lang); });
  });

  function updateCount() {
    const text = editor.innerText.replace(/\s/g, '');
    countEl.textContent = text.length + ' 字';
  }

  function scheduleSave(msg) {
    if (saveTimer) clearTimeout(saveTimer);
    statusEl.textContent = msg || '编辑中…';
    statusEl.style.color = '#888';
    saveTimer = setTimeout(doSave, 1500);
  }

  async function doSave(silent) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    // 缓存当前语言内容到 draft，再一起提交中英文两版
    draft[editLang].title = titleInput.value;
    draft[editLang].content = sourceMode ? sourceArea.value : editor.innerHTML;
    statusEl.textContent = '保存中…';
    statusEl.style.color = '#888';
    try {
      const r = await fetch('/api/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          title: draft.zh.title,
          content: draft.zh.content,
          titleEn: draft.en.title,
          contentEn: draft.en.content
        })
      });
      if (r.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
      const d = await r.json();
      if (d.ok) {
        statusEl.textContent = '已保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        statusEl.style.color = '#16a34a';
      } else {
        statusEl.textContent = '保存失败';
        statusEl.style.color = '#dc2626';
      }
    } catch (e) {
      statusEl.textContent = '网络错误';
      statusEl.style.color = '#dc2626';
    }
  }

  // 富文本工具栏命令
  tabContent.querySelectorAll('.rt-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault()); // 不让按钮失焦
    btn.addEventListener('click', () => {
      if (sourceMode) { showToast('请先切回富文本模式'); return; }
      editor.focus();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      document.execCommand(cmd, false, val);
      updateCount();
      scheduleSave();
    });
  });

  // 插入链接
  document.getElementById('agr-link').addEventListener('mousedown', e => e.preventDefault());
  document.getElementById('agr-link').addEventListener('click', () => {
    if (sourceMode) { showToast('请先切回富文本模式'); return; }
    const sel = window.getSelection().toString();
    const url = prompt('输入链接地址（含 https://）', 'https://');
    if (url) {
      editor.focus();
      document.execCommand('createLink', false, url);
      scheduleSave();
    }
  });

  // HTML 源码切换
  sourceBtn.addEventListener('click', () => {
    if (!sourceMode) {
      sourceArea.value = editor.innerHTML;
      editor.style.display = 'none';
      sourceArea.style.display = 'block';
      sourceBtn.textContent = '富文本';
      sourceMode = true;
    } else {
      editor.innerHTML = sourceArea.value;
      editor.style.display = 'block';
      sourceArea.style.display = 'none';
      sourceBtn.textContent = 'HTML';
      sourceMode = false;
      updateCount();
    }
    scheduleSave();
  });

  // ===== 输入法防抖核心 =====
  editor.addEventListener('compositionstart', () => {
    isComposing = true;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  });
  editor.addEventListener('compositionend', () => {
    isComposing = false;
    updateCount();
    scheduleSave();
  });
  editor.addEventListener('input', () => {
    if (isComposing) return;  // 输入法组字中，不触发保存
    updateCount();
    scheduleSave();
  });

  // 源码编辑也防抖
  sourceArea.addEventListener('compositionstart', () => {
    isComposing = true;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  });
  sourceArea.addEventListener('compositionend', () => {
    isComposing = false;
    scheduleSave();
  });
  sourceArea.addEventListener('input', () => {
    if (isComposing) return;
    scheduleSave();
  });

  titleInput.addEventListener('input', () => scheduleSave());
  titleInput.addEventListener('compositionstart', () => {
    isComposing = true;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  });
  titleInput.addEventListener('compositionend', () => {
    isComposing = false;
    scheduleSave();
  });

  saveBtn.addEventListener('click', () => doSave());

  // Ctrl+S 保存
  tabContent.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      doSave();
    }
  });

  updateCount();
}

// ===== 访问统计 Tab =====
async function renderStatsTab() {
  const tabContent = document.getElementById('tab-content');
  tabContent.innerHTML = '<div class="empty-hint">加载中...</div>';
  const res = await fetch('/api/stats', { headers: { 'Authorization': 'Bearer ' + token } });
  if (res.status === 401) { token = ''; localStorage.removeItem('love_token'); renderLogin(); return; }
  const s = await res.json();

  const dailyRows = Object.keys(s.daily).sort().reverse().map(k => `
    <div class="stats-row"><span>${k}</span><span>PV ${s.daily[k].pv} · UV ${s.daily[k].uv}</span></div>
  `).join('');

  const pageRows = Object.keys(s.pages).sort((a, b) => s.pages[b] - s.pages[a]).map(p => `
    <div class="stats-row"><span>${esc(p)}</span><span>${s.pages[p]}</span></div>
  `).join('');

  tabContent.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card"><div class="stats-num">${s.totalPv}</div><div class="stats-label">总浏览量 PV</div></div>
      <div class="stats-card"><div class="stats-num">${s.totalUv}</div><div class="stats-label">总访客数 UV</div></div>
    </div>
    <div class="list-card">
      <h3 style="margin:0 0 10px;color:var(--primary-dark);font-size:15px">最近 30 天</h3>
      ${dailyRows || '<div class="empty-hint">暂无数据</div>'}
    </div>
    <div class="list-card">
      <h3 style="margin:0 0 10px;color:var(--primary-dark);font-size:15px">页面访问分布</h3>
      ${pageRows || '<div class="empty-hint">暂无数据</div>'}
    </div>
  `;
}

function renderSection(sec, i) {
  const type = sec.type || 'text';
  const isQuant = type === 'quantification';
  const isLinks = type === 'links';
  const isRole = type === 'role';

  const typeHtml = `
    <div class="field">
      <label>类型</label>
      <select data-path="sections.${i}.type" onchange="changeType(${i}, this.value)">
        <option value="text" ${type==='text'?'selected':''}>文本</option>
        <option value="quantification" ${isQuant?'selected':''}>量化表</option>
        <option value="links" ${isLinks?'selected':''}>链接卡片</option>
        <option value="role" ${isRole?'selected':''}>角色入驻</option>
      </select>
    </div>
  `;

  let bodyHtml = '';
  if (isQuant) {
    bodyHtml = renderQuantEditor(i, sec.items || []);
  } else if (isLinks) {
    bodyHtml = renderLinksEditor(i, sec.items || []);
  } else if (isRole) {
    bodyHtml = renderRoleEditor(i, sec);
  } else {
    bodyHtml = `
      <div class="field">
        <label>内容（换行即换段）</label>
        <textarea data-path="sections.${i}.content">${esc(sec.content || '')}</textarea>
      </div>
    `;
  }

  return `
    <div class="section-editor">
      <div class="section-editor-header">
        <span class="section-editor-title">板块 ${i + 1}${isRole ? ' · 角色入驻' : ''}</span>
        <button class="btn btn-danger" style="padding:4px 12px;font-size:12px" onclick="delSection(${i})">删除</button>
      </div>
      <div class="field">
        <label>标题</label>
        <input type="text" value="${esc(sec.title)}" data-path="sections.${i}.title">
      </div>
      <div class="field">
        <label>图标</label>
        <select data-path="sections.${i}.icon">
          ${['heart','chart','star','feather','book','spark'].map(ic =>
            `<option value="${ic}" ${sec.icon===ic?'selected':''}>${ic}</option>`
          ).join('')}
        </select>
      </div>
      ${typeHtml}
      ${bodyHtml}
    </div>
  `;
}

// 量化表编辑器
function renderQuantEditor(secIdx, items) {
  const rows = items.map((item, j) => `
    <div class="quant-row">
      <input class="q-name" type="text" value="${esc(item.name)}" placeholder="名称" data-path="sections.${secIdx}.items.${j}.name">
      <input class="q-weight" type="number" value="${item.weight}" placeholder="权重" data-path="sections.${secIdx}.items.${j}.weight">
      <input class="q-desc" type="text" value="${esc(item.desc||'')}" placeholder="说明" data-path="sections.${secIdx}.items.${j}.desc">
      <button class="q-del" onclick="delItem('sections.${secIdx}.items', ${j})">×</button>
    </div>
  `).join('');

  return `
    <div class="quant-editor">
      <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px">量化项目</label>
      <div>${rows}</div>
      <button class="add-btn" onclick="addItem('sections.${secIdx}.items', {name:'',weight:0,desc:''})">+ 添加项目</button>
    </div>
  `;
}

// 链接卡片编辑器
function renderLinksEditor(secIdx, items) {
  const rows = items.map((item, j) => `
    <div class="quant-row" style="flex-wrap:wrap;gap:6px">
      <input class="q-name" type="text" value="${esc(item.title)}" placeholder="标题" data-path="sections.${secIdx}.items.${j}.title" style="flex:1;min-width:120px">
      <input class="q-desc" type="text" value="${esc(item.desc||'')}" placeholder="描述" data-path="sections.${secIdx}.items.${j}.desc" style="flex:1;min-width:120px">
      <input class="q-name" type="text" value="${esc(item.url||'')}" placeholder="链接URL" data-path="sections.${secIdx}.items.${j}.url" style="flex-basis:100%;min-width:0">
      <button class="q-del" onclick="delItem('sections.${secIdx}.items', ${j})">×</button>
    </div>
  `).join('');

  return `
    <div class="quant-editor">
      <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px">链接卡片</label>
      <div>${rows}</div>
      <button class="add-btn" onclick="addItem('sections.${secIdx}.items', {title:'',desc:'',url:''})">+ 添加链接</button>
    </div>
  `;
}

// 角色入驻编辑器（含时间线、相册）
function renderRoleEditor(secIdx, sec) {
  const expectations = sec.expectations || [];
  const timeline = sec.timeline || [];
  const album = sec.album || [];

  const expectRows = expectations.map((item, j) => `
    <div class="quant-row">
      <input class="q-name" type="text" value="${esc(item)}" placeholder="期待的内容" data-path="sections.${secIdx}.expectations.${j}" style="flex:1">
      <button class="q-del" onclick="delItem('sections.${secIdx}.expectations', ${j})">×</button>
    </div>
  `).join('');

  const timelineRows = timeline.map((item, j) => `
    <div class="quant-row" style="flex-wrap:wrap;gap:6px">
      <input class="q-weight" type="text" value="${esc(item.date||'')}" placeholder="日期 如 2025-02-06" data-path="sections.${secIdx}.timeline.${j}.date" style="flex:1;min-width:140px">
      <input class="q-name" type="text" value="${esc(item.title||'')}" placeholder="标题" data-path="sections.${secIdx}.timeline.${j}.title" style="flex:1;min-width:120px">
      <input class="q-desc" type="text" value="${esc(item.desc||'')}" placeholder="描述" data-path="sections.${secIdx}.timeline.${j}.desc" style="flex-basis:100%;min-width:0">
      <button class="q-del" onclick="delItem('sections.${secIdx}.timeline', ${j})">×</button>
    </div>
  `).join('');

  const albumRows = album.map((item, j) => `
    <div class="quant-row" style="flex-wrap:wrap;gap:6px;align-items:flex-start">
      ${item.url ? `<img src="${esc(item.url)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border)" referrerpolicy="no-referrer">` : ''}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <input class="q-name" type="text" value="${esc(item.url||'')}" placeholder="图片URL" data-path="sections.${secIdx}.album.${j}.url">
        <input class="q-desc" type="text" value="${esc(item.desc||'')}" placeholder="描述（选填）" data-path="sections.${secIdx}.album.${j}.desc">
      </div>
      <button class="q-del" onclick="delItem('sections.${secIdx}.album', ${j})">×</button>
    </div>
  `).join('');

  return `
    <div class="field">
      <label>角色名称</label>
      <input type="text" value="${esc(sec.role||sec.title)}" data-path="sections.${secIdx}.role">
    </div>
    <div class="field">
      <label>是否已入驻</label>
      <select data-path="sections.${secIdx}.occupied" data-boolean="true">
        <option value="false" ${!sec.occupied?'selected':''}>虚位以待</option>
        <option value="true" ${sec.occupied?'selected':''}>已入驻</option>
      </select>
    </div>
    <div class="field">
      <label>入驻人名称</label>
      <input type="text" value="${esc(sec.person||'')}" data-path="sections.${secIdx}.person">
    </div>
    <div class="field">
      <label>入驻人头像URL（选填）</label>
      <input type="text" value="${esc(sec.avatar||'')}" data-path="sections.${secIdx}.avatar">
    </div>
    <div class="field">
      <label>在一起的日子（选填，用于计时器）</label>
      <input type="date" value="${esc(sec.sinceDate||'')}" data-path="sections.${secIdx}.sinceDate">
    </div>
    <div class="field">
      <label>性别</label>
      <input type="text" value="${esc(sec.gender||'')}" data-path="sections.${secIdx}.gender">
    </div>
    <div class="field">
      <label>星座</label>
      <input type="text" value="${esc(sec.zodiac||'')}" data-path="sections.${secIdx}.zodiac">
    </div>
    <div class="field">
      <label>生日</label>
      <input type="text" value="${esc(sec.birthDate||'')}" data-path="sections.${secIdx}.birthDate">
    </div>
    <div class="field">
      <label>班级</label>
      <input type="text" value="${esc(sec.classInfo||'')}" data-path="sections.${secIdx}.classInfo">
    </div>
    <div class="field">
      <label>爱好</label>
      <input type="text" value="${esc(sec.hobbies||'')}" data-path="sections.${secIdx}.hobbies">
    </div>
    <div class="field">
      <label>入驻宣言</label>
      <textarea data-path="sections.${secIdx}.message" style="min-height:90px">${esc(sec.message||'')}</textarea>
    </div>

    <div class="quant-editor">
      <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px">期待列表（虚位以待时展示）</label>
      <div>${expectRows}</div>
      <button class="add-btn" onclick="addItem('sections.${secIdx}.expectations', '')">+ 添加期待</button>
    </div>

    <div class="quant-editor">
      <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px">时间线 · 我们做过的事（已入驻时展示）</label>
      <div>${timelineRows}</div>
      <button class="add-btn" onclick="addItem('sections.${secIdx}.timeline', {date:'',title:'',desc:''})">+ 添加时间线</button>
    </div>

    <div class="quant-editor">
      <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:8px">恋爱相册（已入驻时展示）</label>
      <div>${albumRows}</div>
      <button class="add-btn" onclick="addItem('sections.${secIdx}.album', {url:'',desc:''})">+ 添加照片</button>
    </div>
  `;
}

// ===== 类型切换（保留数据，只补默认字段） =====
function changeType(idx, newType) {
  const sec = data.sections[idx];
  const oldType = sec.type || 'text';
  if (oldType === newType) return;
  sec.type = newType;
  if (newType === 'quantification') {
    if (!Array.isArray(sec.items)) sec.items = [{ name: '', weight: 0, desc: '' }];
  } else if (newType === 'links') {
    if (!Array.isArray(sec.items)) sec.items = [{ title: '', desc: '', url: '' }];
  } else if (newType === 'role') {
    if (!sec.role) sec.role = sec.title || '角色';
    if (sec.occupied === undefined) sec.occupied = false;
    if (!sec.person) sec.person = '';
    if (!sec.message) sec.message = '';
    if (!sec.avatar) sec.avatar = '';
    if (!Array.isArray(sec.expectations)) sec.expectations = [''];
    if (!Array.isArray(sec.timeline)) sec.timeline = [];
    if (!Array.isArray(sec.album)) sec.album = [];
    delete sec.items;
  } else {
    delete sec.items;
    delete sec.expectations;
    delete sec.timeline;
    delete sec.album;
    if (sec.content === undefined) sec.content = '';
  }
  renderEditor();
}

// ===== 通用增删项（按路径操作，永不错位） =====
function addItem(arrPath, template) {
  const arr = getByPath(data, arrPath);
  if (!Array.isArray(arr)) {
    setByPath(data, arrPath, []);
  }
  getByPath(data, arrPath).push(typeof template === 'object' ? Object.assign({}, template) : template);
  renderEditor();
}

function delItem(arrPath, idx) {
  const arr = getByPath(data, arrPath);
  if (Array.isArray(arr)) {
    arr.splice(idx, 1);
    renderEditor();
  }
}

function addSection() {
  if (!Array.isArray(data.sections)) data.sections = [];
  data.sections.push({ id: 'sec' + Date.now(), title: '新板块', icon: 'heart', type: 'text', content: '' });
  renderEditor();
}

function delSection(idx) {
  data.sections.splice(idx, 1);
  renderEditor();
}

// ===== 保存 =====
async function save() {
  // 失焦让最后一个输入生效
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast('保存成功');
    } else if (res.status === 401) {
      showToast('登录已过期，请重新登录');
      token = '';
      localStorage.removeItem('love_token');
      renderLogin();
    } else {
      showToast('保存失败');
    }
  } catch (e) {
    showToast('网络错误');
  }
}

// ===== 申请列表（已被 Tab 集成，保留兼容） =====

function logout() {
  token = '';
  localStorage.removeItem('love_token');
  renderLogin();
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text == null ? '' : String(text);
  return d.innerHTML;
}

// 绑定全局输入事件委托（只绑定一次）
bindGlobalInput();

// 初始化
if (token) {
  load();
} else {
  renderLogin();
}
