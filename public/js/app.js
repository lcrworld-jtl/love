// SVG 图标
const ICONS = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="22" y1="20" x2="2" y2="20"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>',
  feather: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 4C15 9 9 15 4 20M20 4c-4 0-8 2-11 5l3 3c3-3 5-7 5-11M20 4c0 4-2 8-5 11l-3-3c3-3 7-5 11-5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>'
};

// 饼图配色（粉色系，无渐变）
const PIE_COLORS = ['#FF6B9D', '#FF8FB1', '#FFB3C6', '#FFC8D9', '#FFD6E0', '#FFDFE8', '#FFE8F0', '#FFEFF5'];

// 每日情话
const QUOTES = [
  { text: '我喜欢你，不是一见钟情，而是慢慢喜欢上了你。', author: '佚名' },
  { text: '最好的感情是随意，却又彼此在意；是惬意，却又彼此珍惜。', author: '佚名' },
  { text: '所谓幸福，就是和对的人，以彼此都舒服的方式，过一辈子。', author: '佚名' },
  { text: '感情里最怕的不是争吵，而是沉默。沉默是心死的开始。', author: '佚名' },
  { text: '喜欢是乍见之欢，爱是久处不厌。', author: '佚名' },
  { text: '好的爱情，是让你变成更好的人，而不是失去自己。', author: '佚名' },
  { text: '陪伴是最长情的告白，守护是最沉默的陪伴。', author: '佚名' },
  { text: '你不用多好，我喜欢就好；我没有很好，你不嫌弃就好。', author: '佚名' },
  { text: '感情不需要诺言、协议与条件。它只需要两个人：一个能够信任的人，一个愿意理解的人。', author: '佚名' },
  { text: '真正的喜欢，是就算见过你最糟的样子，依然想要留在你身边。', author: '佚名' },
  { text: '心动是本能，忠诚是选择。', author: '佚名' },
  { text: '爱不是寻找一个完美的人，而是学会用完美的眼光，欣赏一个不完美的人。', author: '佚名' },
  { text: '比起说"我爱你"，更浪漫的是"我在呢"。', author: '佚名' },
  { text: '所谓浪漫，就是没有后来。所谓后来，就是浪漫的延续。', author: '佚名' }
];

let contentData = null;

async function loadContent() {
  try {
    const res = await fetch('/api/content?t=' + Date.now());
    contentData = await res.json();
    // 仅首页自动渲染完整内容；lover 页由调用方处理
    if (document.body.dataset.page !== 'lover') {
      render();
    }
  } catch (e) {
    document.getElementById('content').innerHTML = '<div class="card"><p>加载失败，请刷新重试</p></div>';
  }
}

function render() {
  if (!contentData) return;

  // 标题打字机效果
  typewriter('page-title', contentData.title || 'Love', () => {
    typewriter('page-subtitle', contentData.subtitle || '', null, 30);
  });

  // 导航 - 只做跳转
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  contentData.sections.forEach((sec, i) => {
    const item = document.createElement('div');
    item.className = 'nav-item';
    item.innerHTML = (ICONS[sec.icon] || ICONS.heart) + `<span>${sec.title}</span>`;
    item.onclick = () => scrollToSection(i);
    nav.appendChild(item);
  });

  // 内容 - 所有板块依次展示
  const main = document.getElementById('content');
  main.innerHTML = '';
  contentData.sections.forEach((sec, i) => {
    const section = document.createElement('div');
    section.className = 'section';
    section.id = `sec-${i}`;

    if (sec.type === 'quantification' && sec.items) {
      section.innerHTML = renderQuantification(sec, i);
    } else if (sec.type === 'links' && sec.items) {
      section.innerHTML = renderLinks(sec);
    } else if (sec.type === 'role') {
      section.innerHTML = renderRole(sec, i);
    } else {
      section.innerHTML = `
        <div class="card">
          <div class="card-title">${ICONS[sec.icon] || ICONS.heart}<span>${sec.title}</span></div>
          <div class="card-content">${escapeHtml(sec.content || '')}</div>
        </div>
      `;
    }
    main.appendChild(section);
  });

  // 初始化相册跑马灯
  initAlbumCarousel();

  // 每日情话
  renderDailyQuote();

  // 爱心计数器
  renderLikeCounter();

  // 返回顶部按钮
  renderBackTop();

  // 触发量化表动画
  contentData.sections.forEach((sec, i) => {
    if (sec.type === 'quantification' && sec.items) {
      setTimeout(() => animateQuant(i), 100 + i * 200);
    }
  });

  // 滚动监听 - 高亮导航 + 卡片上浮动画
  setupScrollSpy();
  setupRevealAnimation();

  // 留言墙 & 语音留言
  if (window.LoveWidgets) {
    main.appendChild(LoveWidgets.renderMessageWall());
    main.appendChild(LoveWidgets.renderVoiceWall());
  }
}

function scrollToSection(index) {
  const el = document.getElementById(`sec-${index}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setupScrollSpy() {
  const sections = document.querySelectorAll('.section');
  const navItems = document.querySelectorAll('.nav-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = Array.from(sections).indexOf(entry.target);
        navItems.forEach((el, i) => {
          el.classList.toggle('active', i === idx);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-70px 0px -50% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ===== 卡片滚动上浮动画 =====
function setupRevealAnimation() {
  const sections = document.querySelectorAll('.section');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  sections.forEach(s => revealObserver.observe(s));
}

// ===== 饼图 =====

function animateQuant(index) {
  const section = document.getElementById(`sec-${index}`);
  if (!section) return;

  const sec = contentData.sections[index];
  const fills = section.querySelectorAll('.quant-fill');
  fills.forEach((fill, i) => {
    const weight = sec.items[i]?.weight || 0;
    fill.style.width = weight + '%';
    fill.style.background = PIE_COLORS[i % PIE_COLORS.length];
  });

  const canvas = section.querySelector('.quant-pie-canvas');
  if (canvas) {
    animatePieChart(canvas, sec.items);
    setupPieClick(canvas, sec.items, index);
  }
}

function setupPieClick(canvas, items, secIdx) {
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.max(10, Math.min(cx, cy) - 8);
  const innerRadius = Math.max(5, radius * 0.55);
  const total = items.reduce((sum, item) => sum + (item.weight || 0), 0);
  if (total === 0) return;

  let hoveredIndex = -1;
  const tooltip = document.getElementById(`pie-tooltip-${secIdx}`);
  const tipName = document.getElementById(`pie-tip-name-${secIdx}`);
  const tipPct = document.getElementById(`pie-tip-pct-${secIdx}`);
  const tipDesc = document.getElementById(`pie-tip-desc-${secIdx}`);

  function getSliceAt(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < innerRadius || dist > radius + 8) return -1;

    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    let startAngle = 0;
    for (let i = 0; i < items.length; i++) {
      const slice = (items[i].weight / total) * Math.PI * 2;
      if (angle >= startAngle && angle < startAngle + slice) return i;
      startAngle += slice;
    }
    return -1;
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let startAngle = -Math.PI / 2;
    items.forEach((item, i) => {
      const slice = (item.weight / total) * Math.PI * 2;
      const isHovered = i === hoveredIndex;
      const r = isHovered ? radius + 6 : radius;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.arc(cx, cy, innerRadius, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      startAngle += slice;
    });
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const idx = getSliceAt(x, y);

    if (idx >= 0) {
      if (hoveredIndex === idx) {
        hoveredIndex = -1;
        tooltip.classList.remove('show');
      } else {
        hoveredIndex = idx;
        const item = items[idx];
        const pct = ((item.weight / total) * 100).toFixed(1);
        tipName.textContent = item.name;
        tipPct.textContent = pct + '%';
        tipDesc.textContent = item.desc || '';
        tooltip.classList.add('show');
      }
      redraw();
    } else {
      hoveredIndex = -1;
      tooltip.classList.remove('show');
      redraw();
    }
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleClick({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });

  setTimeout(() => { redraw(); }, 900);
}

// ===== Role cards (恋人/老婆) =====

function startDaysTimer(elId, startTime) {
  function update() {
    const diff = Date.now() - startTime;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const el = document.getElementById(elId);
    if (!el) return;

    el.innerHTML = `
      <div class="role-days-title">我们已经在一起</div>
      <div class="role-days-main">
        <span class="role-days-num">${days}</span><span class="role-days-unit">天</span>
        <span class="role-days-num">${hours}</span><span class="role-days-unit">时</span>
        <span class="role-days-num">${mins}</span><span class="role-days-unit">分</span>
        <span class="role-days-num">${secs}</span><span class="role-days-unit">秒</span>
      </div>
    `;
  }
  update();
  setInterval(update, 1000);
}

function renderRole(sec, secIdx) {
  const occupied = sec.occupied || (sec.person && sec.person.trim());
  const role = sec.role || sec.title;
  const HEART_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';

  const avatarHtml = occupied
    ? `<div class="role-avatar occupied">${sec.avatar ? `<img src="${escapeHtml(sec.avatar)}" referrerpolicy="no-referrer">` : HEART_ICON}</div>`
    : `<div class="role-avatar empty">${HEART_ICON}</div>`;

  let bodyHtml;

  if (occupied) {
    // 已入驻 - 展示详细信息
    let detailsHtml = '';
    const detailFields = [
      { label: '性别', key: 'gender' },
      { label: '星座', key: 'zodiac' },
      { label: '生日', key: 'birthDate' },
      { label: '班级', key: 'classInfo' },
      { label: '爱好', key: 'hobbies' }
    ];
    detailFields.forEach(f => {
      if (sec[f.key]) {
        detailsHtml += `<div class="role-detail-row"><span class="role-detail-label">${f.label}</span><span class="role-detail-value">${escapeHtml(String(sec[f.key]))}</span></div>`;
      }
    });

    // 在一起的计时
    let daysHtml = '';
    if (sec.sinceDate) {
      daysHtml = `<div class="role-days" id="days-${secIdx}"></div>`;
      const startDate = new Date(sec.sinceDate).getTime();
      const elId = `days-${secIdx}`;
      if (startDate <= Date.now()) {
        startDaysTimer(elId, startDate);
      }
    }

    bodyHtml = `
      <div class="role-name">${escapeHtml(role)}</div>
      <div class="role-status-badge occupied">已有人入驻</div>
      <div class="role-person-name">${escapeHtml(sec.person || '')}</div>
      ${daysHtml}
      ${sec.message ? `<div class="role-person-message">${escapeHtml(sec.message)}</div>` : ''}
      ${detailsHtml ? `<div class="role-details">${detailsHtml}</div>` : ''}
    `;

    // 已入驻时展示时间线和相册
    bodyHtml += renderTimeline(sec);
    bodyHtml += renderAlbum(sec);

    // 恋人已入驻也显示申请按钮
    if (role === '恋人') {
      bodyHtml += `<button class="role-apply-btn locked" onclick="openApplyForm('${escapeHtml(role)}', true)">
        ${LOCK_ICON}<span>申请加入</span>
      </button>`;
    }
  } else {
    // 虚位以待 - 展示期待和要求
    const expectations = sec.expectations || [];
    let expectHtml = expectations.map(e => `<div class="role-expect-item"><span class="role-expect-dot"></span><span>${escapeHtml(e)}</span></div>`).join('');

    bodyHtml = `
      <div class="role-name">${escapeHtml(role)}</div>
      <div class="role-status-badge empty">虚位以待</div>
      <div class="role-expect-title">期待这样的你</div>
      <div class="role-expect-list">${expectHtml}</div>
      <button class="role-apply-btn" onclick="openApplyForm('${escapeHtml(role)}', false)">
        ${HEART_ICON}<span>申请加入</span>
      </button>
    `;
  }

  return `
    <div class="card role-card">
      ${avatarHtml}
      ${bodyHtml}
    </div>
  `;
}

// ===== 时间线（我们做过的事） =====
function renderTimeline(sec) {
  const items = sec.timeline || [];
  if (!items.length) return '';
  // 按日期升序展示（早 → 晚）
  const sorted = [...items].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const itemsHtml = sorted.map(item => {
    const dateStr = item.date ? formatDateZh(item.date) : '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-date">${escapeHtml(dateStr)}</div>
          ${item.title ? `<div class="timeline-title">${escapeHtml(item.title)}</div>` : ''}
          ${item.desc ? `<div class="timeline-desc">${escapeHtml(item.desc)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="role-section">
      <div class="role-section-title">${ICONS.spark || ICONS.heart}<span>我们做过的事</span></div>
      <div class="timeline">${itemsHtml}</div>
    </div>
  `;
}

function formatDateZh(dateStr) {
  // 兼容 2025-02-06 / 2025/2/6 / 7月12日 等格式
  const m = dateStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) return `${m[1]}年${parseInt(m[2])}月${parseInt(m[3])}日`;
  return dateStr;
}

// ===== 恋爱相册（网格并列排列） =====
function renderAlbum(sec) {
  const items = sec.album || [];
  if (!items.length) return '';

  const itemsHtml = items.map((item, i) => `
    <div class="album-slide" data-idx="${i}">
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.desc || '')}" loading="lazy" referrerpolicy="no-referrer">
      ${item.desc ? `<div class="album-desc">${escapeHtml(item.desc)}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="role-section">
      <div class="role-section-title">${ICONS.heart}<span>恋爱相册</span></div>
      <div class="album-grid" id="albumGrid">${itemsHtml}</div>
    </div>
  `;
}

// 初始化相册：点击图片打开大图查看器
function initAlbumCarousel() {
  const grid = document.getElementById('albumGrid');
  if (!grid) return;

  const slides = grid.querySelectorAll('.album-slide');
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      openAlbumViewer(i);
    });
  });
}

// 相册大图查看器（带缩放过渡 + 左右切换 + 手势）
let albumViewerIdx = 0;
let albumViewerItems = [];

function openAlbumViewer(idx) {
  const grid = document.getElementById('albumGrid');
  if (!grid) return;
  const slides = grid.querySelectorAll('.album-slide');
  albumViewerItems = [];
  albumViewerIdx = idx;
  slides.forEach(s => {
    const img = s.querySelector('img');
    const desc = s.querySelector('.album-desc');
    albumViewerItems.push({
      url: img ? img.src : '',
      desc: desc ? desc.textContent : ''
    });
  });

  let viewer = document.getElementById('album-viewer');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'album-viewer';
    viewer.className = 'album-viewer';
    viewer.innerHTML = `
      <div class="album-viewer-bg"></div>
      <button class="album-viewer-close" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button class="album-viewer-nav album-viewer-prev" aria-label="上一张">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
      </button>
      <button class="album-viewer-nav album-viewer-next" aria-label="下一张">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
      </button>
      <div class="album-viewer-stage">
        <img class="album-viewer-img">
      </div>
      <div class="album-viewer-desc"></div>
      <div class="album-viewer-counter"></div>
    `;
    document.body.appendChild(viewer);

    viewer.querySelector('.album-viewer-close').addEventListener('click', closeAlbumViewer);
    viewer.querySelector('.album-viewer-prev').addEventListener('click', () => viewerNav(-1));
    viewer.querySelector('.album-viewer-next').addEventListener('click', () => viewerNav(1));

    // 点击背景关闭
    viewer.querySelector('.album-viewer-bg').addEventListener('click', closeAlbumViewer);

    // 键盘
    document.addEventListener('keydown', viewerKeyHandler);

    // 触屏滑动
    let vTouchX = 0;
    viewer.addEventListener('touchstart', (e) => {
      vTouchX = e.touches[0].clientX;
    }, { passive: true });
    viewer.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - vTouchX;
      if (Math.abs(dx) > 50) viewerNav(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  updateViewer();
  viewer.classList.add('show');
}

function viewerNav(dir) {
  albumViewerIdx = (albumViewerIdx + dir + albumViewerItems.length) % albumViewerItems.length;
  updateViewer();
}

function updateViewer() {
  const viewer = document.getElementById('album-viewer');
  if (!viewer) return;
  const item = albumViewerItems[albumViewerIdx];
  if (!item) return;

  const img = viewer.querySelector('.album-viewer-img');
  // 淡入动画：先隐藏，换 src，再显示
  img.style.opacity = '0';
  img.style.transform = 'scale(0.92)';
  setTimeout(() => {
    img.src = item.url;
    img.style.opacity = '1';
    img.style.transform = 'scale(1)';
  }, 150);

  viewer.querySelector('.album-viewer-desc').textContent = item.desc || '';
  viewer.querySelector('.album-viewer-counter').textContent = `${albumViewerIdx + 1} / ${albumViewerItems.length}`;
}

function viewerKeyHandler(e) {
  const viewer = document.getElementById('album-viewer');
  if (!viewer || !viewer.classList.contains('show')) return;
  if (e.key === 'Escape') closeAlbumViewer();
  else if (e.key === 'ArrowLeft') viewerNav(-1);
  else if (e.key === 'ArrowRight') viewerNav(1);
}

function closeAlbumViewer() {
  const viewer = document.getElementById('album-viewer');
  if (viewer) {
    viewer.classList.remove('show');
    document.removeEventListener('keydown', viewerKeyHandler);
  }
}

// ===== Application form =====

// 恋人和老婆共用同一套申请表单字段
const APPLY_FIELDS = [
  { key: 'realName', label: '真实姓名 *', type: 'text', placeholder: '你的真实姓名', required: true, maxlength: 20 },
  { key: 'gender', label: '性别 *', type: 'select', required: true, options: ['女', '男'] },
  { key: 'zodiac', label: '星座 *', type: 'select', required: true, options: ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'] },
  { key: 'birthDate', label: '出生日期 *', type: 'date', required: true },
  { key: 'classInfo', label: '41中初三几班 *', type: 'text', placeholder: '如：3班', required: true, maxlength: 20 },
  { key: 'hobbies', label: '个人兴趣爱好 *', type: 'textarea', placeholder: '你喜欢做什么', required: true, maxlength: 500 },
  { key: 'reason', label: '为什么要成为TA？ *', type: 'textarea', placeholder: '说说你的理由', required: true, maxlength: 500 }
];

function openApplyForm(role, locked) {
  const overlay = document.getElementById('apply-overlay');
  const modal = document.getElementById('apply-modal');
  const titleEl = document.getElementById('apply-title');
  const formBody = document.getElementById('apply-form-body');
  const successEl = document.getElementById('apply-success');

  titleEl.textContent = '申请成为' + role;
  successEl.style.display = 'none';
  formBody.style.display = 'block';
  modal.dataset.role = role;

  const fields = APPLY_FIELDS;
  const disabledAttr = locked ? 'disabled' : '';

  let html = '';
  if (locked) {
    html += '<div style="padding:12px 16px;border-radius:10px;background:#FFF0F3;border:1px solid var(--border);margin-bottom:16px;text-align:center;font-size:13px;color:var(--primary-dark)">该位置已被占用，表单仅供查看，无法提交</div>';
  }
  fields.forEach(f => {
    html += '<div class="apply-field">';
    html += '<label>' + f.label + '</label>';
    if (f.type === 'textarea') {
      html += '<textarea id="apply-' + f.key + '" placeholder="' + (f.placeholder||'') + '" maxlength="' + (f.maxlength||500) + '" ' + disabledAttr + '></textarea>';
    } else if (f.type === 'select') {
      html += '<select id="apply-' + f.key + '" ' + disabledAttr + '>';
      html += '<option value="">请选择</option>';
      f.options.forEach(opt => {
        html += '<option value="' + opt + '">' + opt + '</option>';
      });
      html += '</select>';
    } else {
      html += '<input type="' + f.type + '" id="apply-' + f.key + '" placeholder="' + (f.placeholder||'') + '" maxlength="' + (f.maxlength||50) + '" ' + disabledAttr + '>';
    }
    html += '</div>';
  });
  if (locked) {
    html += '<button class="apply-submit" disabled style="opacity:0.5;cursor:not-allowed">位置已满，无法提交</button>';
  } else {
    html += '<button class="apply-submit" id="apply-submit-btn">提交申请</button>';
  }
  formBody.innerHTML = html;

  // Bind submit (only when not locked)
  if (!locked) {
    document.getElementById('apply-submit-btn').addEventListener('click', () => submitApplication(role, fields));
  }

  overlay.classList.add('show');
  modal.classList.add('show');
}

function closeApplyForm() {
  document.getElementById('apply-overlay').classList.remove('show');
  document.getElementById('apply-modal').classList.remove('show');
}

async function submitApplication(role, fields) {
  const formData = { role };

  for (const f of fields) {
    const el = document.getElementById('apply-' + f.key);
    const val = el.value.trim();
    if (f.required && !val) {
      alert('请填写：' + f.label.replace(' *', ''));
      el.focus();
      return;
    }
    formData[f.key] = val;
  }

  try {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      document.getElementById('apply-form-body').style.display = 'none';
      document.getElementById('apply-success').style.display = 'block';
    } else {
      alert('提交失败，请稍后重试');
    }
  } catch (e) {
    alert('网络错误，请稍后重试');
  }
}

// ===== Links (文章卡片) =====

function renderLinks(sec) {
  const EXTERNAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  const items = sec.items.map(item => `
    <a class="link-card" href="${item.url}" target="_blank" rel="noopener">
      <div class="link-card-info">
        <div class="link-card-title">${escapeHtml(item.title)}</div>
        <div class="link-card-desc">${escapeHtml(item.desc || '')}</div>
      </div>
      <div class="link-card-arrow">${EXTERNAL_ICON}</div>
    </a>
  `).join('');

  return `
    <div class="card">
      <div class="card-title">${ICONS[sec.icon] || ICONS.book}<span>${sec.title}</span></div>
      <div class="links-list">${items}</div>
    </div>
  `;
}

function renderQuantification(sec, secIdx) {
  const total = sec.items.reduce((sum, item) => sum + (item.weight || 0), 0);

  const chartHtml = `
    <div class="quant-chart-area">
      <div class="quant-pie-container">
        <canvas class="quant-pie-canvas" width="280" height="280"></canvas>
        <div class="quant-pie-center">
          <div class="quant-pie-center-num">${total}%</div>
          <div class="quant-pie-center-label">总计</div>
        </div>
      </div>
      <div class="quant-pie-tooltip" id="pie-tooltip-${secIdx}">
        <div class="quant-pie-tooltip-name" id="pie-tip-name-${secIdx}"></div>
        <div class="quant-pie-tooltip-pct" id="pie-tip-pct-${secIdx}"></div>
        <div class="quant-pie-tooltip-desc" id="pie-tip-desc-${secIdx}"></div>
      </div>
      <div class="quant-pie-hint">点击饼图查看详情</div>
      <div class="quant-legend">
        ${sec.items.map((item, i) => `
          <div class="quant-legend-item">
            <span class="quant-legend-dot" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
            <span>${escapeHtml(item.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const items = sec.items.map((item, i) => `
    <div class="quant-item">
      <div class="quant-header">
        <span class="quant-name">${escapeHtml(item.name)}</span>
        <span class="quant-weight">${item.weight}%</span>
      </div>
      <div class="quant-bar"><div class="quant-fill"></div></div>
      <div class="quant-desc">${escapeHtml(item.desc || '')}</div>
    </div>
  `).join('');

  return `
    <div class="card">
      <div class="card-title">${ICONS[sec.icon] || ICONS.chart}<span>${sec.title}</span></div>
      <div class="quant-wrapper">
        ${chartHtml}
        <div class="quant-list">${items}</div>
      </div>
    </div>
  `;
}

function animatePieChart(canvas, items) {
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.max(10, Math.min(cx, cy) - 8);
  const innerRadius = Math.max(5, radius * 0.55);
  const total = items.reduce((sum, item) => sum + (item.weight || 0), 0);

  if (total === 0) return;

  let progress = 0;
  const duration = 800;
  const startTime = performance.now();

  function draw(currentProgress) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = -Math.PI / 2;
    items.forEach((item, i) => {
      const slice = (item.weight / total) * Math.PI * 2 * currentProgress;
      if (slice <= 0) return;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.arc(cx, cy, innerRadius, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fill();

      startAngle += (item.weight / total) * Math.PI * 2;
    });
  }

  function animate(now) {
    const elapsed = now - startTime;
    progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    draw(eased);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// ===== 每日情话 =====

function renderDailyQuote() {
  const main = document.getElementById('content');
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];

  const div = document.createElement('div');
  div.className = 'section';
  div.id = 'sec-quote';
  div.innerHTML = `
    <div class="card quote-card">
      <div class="card-title">${ICONS.spark}<span>每日情话</span></div>
      <div class="quote-text">${escapeHtml(quote.text)}</div>
      <div class="quote-author">— ${escapeHtml(quote.author)}</div>
    </div>
  `;
  main.appendChild(div);
}

// ===== 爱心计数器 =====

function renderLikeCounter() {
  const main = document.getElementById('content');
  const storageKey = 'love_like_count';
  let count = parseInt(localStorage.getItem(storageKey) || '0');
  let liked = localStorage.getItem('love_like_liked') === '1';

  const div = document.createElement('div');
  div.className = 'section';
  div.id = 'sec-like';
  div.innerHTML = `
    <div class="card like-card">
      <div class="card-title">${ICONS.heart}<span>点个赞吧</span></div>
      <button class="like-btn ${liked ? 'liked' : ''}" id="like-btn" ${liked ? 'disabled' : ''}>
        <svg class="empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
          <path fill="none" d="M0 0H24V24H0z"></path>
          <path d="M16.5 3C19.538 3 22 5.5 22 9c0 7-7.5 11-10 12.5C9.5 20 2 16 2 9c0-3.5 2.5-6 5.5-6C9.36 3 11 4 12 5c1-1 2.64-2 4.5-2zm-3.566 15.604c.881-.556 1.676-1.109 2.42-1.701C18.335 14.533 20 11.943 20 9c0-2.36-1.537-4-3.5-4-1.076 0-2.24.57-3.086 1.414L12 7.828l-1.414-1.414C9.74 5.57 8.576 5 7.5 5 5.56 5 4 6.656 4 9c0 2.944 1.666 5.533 4.645 7.903.745.592 1.54 1.145 2.421 1.7.299.189.595.37.934.572.339-.202.635-.383.934-.571z"></path>
        </svg>
        <svg class="filled" height="28" width="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0H24V24H0z" fill="none"></path>
          <path d="M16.5 3C19.538 3 22 5.5 22 9c0 7-7.5 11-10 12.5C9.5 20 2 16 2 9c0-3.5 2.5-6 5.5-6C9.36 3 11 4 12 5c1-1 2.64-2 4.5-2z"></path>
        </svg>
        <span>${liked ? '已点赞' : 'Like'}</span>
      </button>
      <div class="like-count" id="like-count">${count} 人点赞</div>
    </div>
  `;
  main.appendChild(div);

  if (liked) return;

  const btn = document.getElementById('like-btn');
  const countEl = document.getElementById('like-count');
  btn.addEventListener('click', () => {
    if (liked) return;
    count += 1;
    liked = true;
    btn.classList.add('liked');
    btn.disabled = true;
    btn.querySelector('span').textContent = '已点赞';
    localStorage.setItem(storageKey, String(count));
    localStorage.setItem('love_like_liked', '1');
    countEl.textContent = count + ' 人点赞';
  });
}

// ===== 返回顶部 =====

function renderBackTop() {
  const btn = document.getElementById('back-top');
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  }, { passive: true });
}

// ===== 打字机效果 =====

function typewriter(elementId, text, callback, speed) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const charSpeed = speed || 80;
  el.innerHTML = '<span class="typewriter-cursor"></span>';
  let i = 0;

  function type() {
    if (i < text.length) {
      el.innerHTML = escapeHtml(text.substring(0, i + 1)) + '<span class="typewriter-cursor"></span>';
      i++;
      setTimeout(type, charSpeed);
    } else {
      // 完成后光标闪烁几次然后消失
      setTimeout(() => {
        el.innerHTML = escapeHtml(text);
        if (callback) callback();
      }, 1500);
    }
  }
  type();
}

// ===== 背景音乐播放器 =====

function initMusicPlayer() {
  const player = document.getElementById('music-player');
  if (!player) return; // 无播放器元素则跳过
  const cover = document.getElementById('music-cover');
  const nameEl = document.getElementById('music-name');
  const statusEl = document.getElementById('music-status');
  const toggleBtn = document.getElementById('music-toggle');
  const iconEl = document.getElementById('music-icon');
  const playlistPanel = document.getElementById('music-playlist');
  const playlistOverlay = document.getElementById('playlist-overlay');
  const playlistClose = document.getElementById('playlist-close');
  const playlistBody = document.getElementById('playlist-body');

  let audio = null;
  let songs = [];
  let currentIdx = 0;
  let isPlaying = false;
  let isLoadingUrl = false;

  const PLAY_ICON = '<path d="M8 5v14l11-7z"/>';
  const PAUSE_ICON = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  const PLAYING_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

  // ===== 跨页面播放状态持久化 =====
  function saveMusicState() {
    try {
      const state = {
        idx: currentIdx,
        songId: songs[currentIdx] ? songs[currentIdx].id : null,
        playing: isPlaying,
        time: audio ? audio.currentTime : 0,
        ts: Date.now()
      };
      localStorage.setItem('love_music', JSON.stringify(state));
    } catch (e) {}
  }

  function loadMusicState() {
    try {
      const raw = localStorage.getItem('love_music');
      if (!raw) return null;
      const state = JSON.parse(raw);
      // 超过 30 分钟视为过期
      if (Date.now() - state.ts > 30 * 60 * 1000) {
        localStorage.removeItem('love_music');
        return null;
      }
      return state;
    } catch (e) { return null; }
  }

  // 页面离开前保存播放进度
  window.addEventListener('beforeunload', saveMusicState);
  // 定时保存进度（每 5 秒），防止意外关闭
  setInterval(saveMusicState, 5000);

  async function loadPlaylist() {
    try {
      const res = await fetch('/api/music/playlist');
      const data = await res.json();
      if (data.songs && data.songs.length > 0) {
        songs = data.songs;
        renderPlaylist();

        // 检查是否有跨页面恢复的状态
        const saved = loadMusicState();
        // 歌单顺序/内容可能被调整，优先按歌曲 ID 匹配恢复，避免旧索引错位
        let restoreIdx = -1;
        if (saved && saved.songId && songs.length) {
          restoreIdx = songs.findIndex(s => String(s.id) === String(saved.songId));
        }
        if (restoreIdx === -1 && saved && saved.idx < songs.length) {
          restoreIdx = saved.idx;
        }
        if (restoreIdx >= 0) {
          currentIdx = restoreIdx;
          updateCover(songs[currentIdx]);
          nameEl.textContent = songs[currentIdx].name;
          if (saved.playing) {
            statusEl.textContent = '恢复播放...';
            playSong(currentIdx, saved.time || 0);
          } else {
            statusEl.textContent = '已暂停';
            iconEl.innerHTML = PLAY_ICON;
          }
          renderPlaylist();
        } else {
          updateCover(songs[0]);
          nameEl.textContent = songs[0].name;
          statusEl.textContent = '准备播放';
          autoPlay();
        }
      } else {
        // API 返回错误或歌单为空
        nameEl.textContent = '暂无歌曲';
        statusEl.textContent = data.error || '歌单为空';
        iconEl.innerHTML = PLAY_ICON;
      }
    } catch (e) {
      nameEl.textContent = '加载失败';
      statusEl.textContent = '请刷新重试';
      iconEl.innerHTML = PLAY_ICON;
    }
  }

  function updateCover(song) {
    if (song.picUrl) {
      cover.innerHTML = `<img src="${song.picUrl}" alt="${escapeHtml(song.name)}" referrerpolicy="no-referrer">`;
    } else {
      cover.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" class="music-cover-default"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
    }
  }

  function renderPlaylist() {
    playlistBody.innerHTML = songs.map((song, i) => `
      <div class="playlist-item ${i === currentIdx ? 'active' : ''}" data-idx="${i}">
        <div class="playlist-item-cover">
          ${song.picUrl ? `<img src="${song.picUrl}" alt="" referrerpolicy="no-referrer">` : ''}
        </div>
        <div class="playlist-item-info">
          <div class="playlist-item-name ${i === currentIdx ? 'active' : ''}">${escapeHtml(song.name)}</div>
          <div class="playlist-item-artist">${escapeHtml(song.artist)}</div>
        </div>
        ${i === currentIdx ? `<div class="playlist-item-playing">${PLAYING_ICON}</div>` : ''}
      </div>
    `).join('');

    playlistBody.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        if (idx !== currentIdx) {
          playSong(idx);
        }
        closePlaylist();
      });
    });
  }

  function openPlaylist() {
    playlistPanel.classList.add('show');
    playlistOverlay.classList.add('show');
  }

  function closePlaylist() {
    playlistPanel.classList.remove('show');
    playlistOverlay.classList.remove('show');
  }

  // 点击胶囊展开播放列表
  player.addEventListener('click', (e) => {
    if (e.target.closest('.music-toggle')) return; // 播放按钮单独处理
    openPlaylist();
  });

  playlistClose.addEventListener('click', closePlaylist);
  playlistOverlay.addEventListener('click', closePlaylist);

  function autoPlay() {
    // 尝试自动播放
    playSong(0);
  }

  async function playSong(idx, startTime) {
    if (!songs.length) return;

    // 立即更新 UI，让用户看到点击反馈
    currentIdx = idx;
    const song = songs[idx];
    nameEl.textContent = song.name;
    statusEl.textContent = '加载中...';
    updateCover(song);
    renderPlaylist();

    // 如果已有请求在加载中，跳过（不阻塞 UI 更新）
    if (isLoadingUrl) return;
    isLoadingUrl = true;

    // 清理旧 audio，移除所有事件监听避免误触发 error/ended
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = '';
      audio = null;
    }

    try {
      const res = await fetch('/api/music/url?id=' + song.id);
      const data = await res.json();

      // 修复竞态条件：如果用户在此期间点击了其他歌曲，放弃当前结果，立即加载新歌曲
      if (idx !== currentIdx) {
        isLoadingUrl = false;
        playSong(currentIdx);
        return;
      }

      if (!data.url) {
        statusEl.textContent = '无版权，跳过';
        isLoadingUrl = false;
        setTimeout(() => playSong((currentIdx + 1) % songs.length), 1500);
        return;
      }

      const newAudio = new Audio(data.url);
      newAudio.volume = 0.4;

      newAudio.onended = () => {
        if (audio !== newAudio) return;
        playSong((currentIdx + 1) % songs.length);
      };

      newAudio.onerror = () => {
        if (audio !== newAudio) return;
        statusEl.textContent = '播放失败，跳过';
        if (songs.length > 1) {
          setTimeout(() => {
            if (audio === newAudio) playSong((currentIdx + 1) % songs.length);
          }, 2000);
        }
      };

      audio = newAudio;

      // 跨页面恢复：先设置播放进度再播放
      if (startTime && startTime > 0) {
        // 等待元数据加载后跳转到指定位置
        await new Promise((resolve) => {
          const onMeta = () => {
            newAudio.currentTime = startTime;
            resolve();
          };
          if (newAudio.readyState >= 1) {
            onMeta();
          } else {
            newAudio.addEventListener('loadedmetadata', onMeta, { once: true });
          }
        });
      }

      await newAudio.play();
      isPlaying = true;
      isLoadingUrl = false;
      iconEl.innerHTML = PAUSE_ICON;
      cover.classList.add('spinning');
      statusEl.textContent = '播放中';
      saveMusicState();

    } catch (e) {
      isLoadingUrl = false;
      isPlaying = false;
      iconEl.innerHTML = PLAY_ICON;
      cover.classList.remove('spinning');
      statusEl.textContent = '点击播放';
    }
  }

  function togglePlay() {
    if (!songs.length) return;

    if (isPlaying && audio) {
      audio.pause();
      isPlaying = false;
      iconEl.innerHTML = PLAY_ICON;
      cover.classList.remove('spinning');
      statusEl.textContent = '已暂停';
      saveMusicState();
    } else {
      if (audio && audio.src) {
        audio.play().then(() => {
          isPlaying = true;
          iconEl.innerHTML = PAUSE_ICON;
          cover.classList.add('spinning');
          statusEl.textContent = '播放中';
          saveMusicState();
        }).catch(() => {});
      } else {
        playSong(currentIdx);
      }
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  loadPlaylist();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== 恋人独立页（/lover） =====

function renderLoverPage() {
  if (!contentData) return;

  // 标题
  typewriter('page-title', 'Lover', () => {
    typewriter('page-subtitle', '特别的人', null, 30);
  });

  // 只渲染 role 板块
  const main = document.getElementById('content');
  main.innerHTML = '';
  contentData.sections.forEach((sec, i) => {
    if (sec.type !== 'role') return;
    const section = document.createElement('div');
    section.className = 'section';
    section.id = `sec-${i}`;
    section.innerHTML = renderRole(sec, i);
    main.appendChild(section);
  });

  // 返回首页按钮
  renderBackHome();

  // 返回顶部按钮
  renderBackTop();

  setupRevealAnimation();

  // 打字机情书（lover 页特有）
  if (window.LoveWidgets) {
    main.insertBefore(LoveWidgets.renderTypewriterLetter([
      '亲爱的你：',
      '这是一封写在时光里的信。',
      '从相遇的那一刻起，',
      '我的世界便有了颜色。',
      '愿这份心情，',
      '能陪你走过每一个清晨与黄昏。'
    ]), main.firstChild);
  }
}

function renderBackHome() {
  const main = document.getElementById('content');
  const div = document.createElement('div');
  div.className = 'section';
  div.innerHTML = `
    <div class="card" style="text-align:center">
      <a href="/" style="display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:20px;border:2px solid var(--primary);background:var(--card-bg);color:var(--primary);font-size:14px;font-weight:600;text-decoration:none;transition:all 0.2s">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span>返回首页</span>
      </a>
    </div>
  `;
  main.appendChild(div);
}

// 初始化 - 根据页面类型分发
const PAGE_TYPE = document.body.dataset.page || 'home';

loadContent().then(() => {
  if (PAGE_TYPE === 'lover') {
    renderLoverPage();
  }
});

initMusicPlayer();
initApplyForm();

function initApplyForm() {
  document.getElementById('apply-close-btn').addEventListener('click', closeApplyForm);
  document.getElementById('apply-overlay').addEventListener('click', closeApplyForm);
}
