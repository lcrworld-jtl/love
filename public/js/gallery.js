// 照片墙
// 三种视图：瀑布流 / 3D 旋转木马 / 拼贴网格
// 大图查看器：左右切换 + 键盘 ←→ + Esc 关闭
// 数据源：GET /api/gallery，图片走 /gallery-img/:filename

(function () {
  'use strict';
  const { api, showToast } = window.LoveCommon;
  let photos = [];
  let currentView = 'masonry';
  let carouselIdx = 0;
  let carouselTimer = null;
  let lightboxIdx = 0;
  let isAnimating = false;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function imgUrl(filename) {
    return '/gallery-img/' + encodeURIComponent(filename);
  }

  // 按日期倒序
  function sortedPhotos() {
    return photos.slice().sort((a, b) => {
      const da = a.date || a.time || '';
      const db = b.date || b.time || '';
      return db.localeCompare(da);
    });
  }

  function renderEmpty(container) {
    container.innerHTML = `
      <div class="gallery-empty">
        <div class="ge-icon">📷</div>
        <div>还没有照片</div>
        <div style="font-size:12px;margin-top:6px">管理员可在后台上传</div>
      </div>
    `;
  }

  // ===== 入场动画辅助 =====
  // 给 items 添加交错渐入动画
  function animateItems(container, selector, animClass, stagger = 80) {
    const items = container.querySelectorAll(selector);
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) ${i * stagger}ms, transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) ${i * stagger}ms`;
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  // ===== 视图切换（带淡出→淡入过渡） =====
  function switchView(view) {
    if (view === currentView) return;
    currentView = view;
    document.querySelectorAll('#view-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    // 清理旋转木马定时器
    if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }

    const container = document.getElementById('gallery-container');
    // 先淡出
    container.classList.add('view-changing');
    setTimeout(() => {
      if (view === 'masonry') renderMasonry(container);
      else if (view === 'carousel') renderCarousel(container);
      else if (view === 'grid') renderGrid(container);
      // 再淡入
      requestAnimationFrame(() => {
        container.classList.remove('view-changing');
      });
    }, 280);
  }

  // ===== 视图 1：瀑布流 =====
  function renderMasonry(container) {
    const list = sortedPhotos();
    if (!list.length) return renderEmpty(container);
    container.innerHTML = `
      <div class="masonry">
        ${list.map((p, i) => `
          <div class="masonry-item" data-idx="${i}">
            <img src="${imgUrl(p.filename)}" alt="${esc(p.caption)}" loading="lazy" style="transition: transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)">
            <div class="masonry-caption">
              ${p.caption ? `<div class="mc-text">${esc(p.caption)}</div>` : ''}
              <div class="mc-date">${esc(p.date || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    bindClicks(container);
    // 交错渐入动画
    animateItems(container, '.masonry-item', 'gallery-animate-fade', 80);
  }

  // ===== 视图 2：3D 旋转木马 =====
  function renderCarousel(container) {
    const list = sortedPhotos();
    if (!list.length) return renderEmpty(container);
    container.innerHTML = `
      <div class="carousel-wrap" style="opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease">
        <button class="carousel-nav prev" id="cr-prev">‹</button>
        <div class="carousel" id="carousel"></div>
        <button class="carousel-nav next" id="cr-next">›</button>
      </div>
      <div class="carousel-dots" id="cr-dots"></div>
    `;

    const carousel = document.getElementById('carousel');
    const dots = document.getElementById('cr-dots');
    const n = list.length;

    carousel.innerHTML = list.map((p, i) => `
      <div class="carousel-item" data-idx="${i}">
        <img src="${imgUrl(p.filename)}" alt="${esc(p.caption)}">
        <div class="ci-caption">
          ${p.caption ? `<div>${esc(p.caption)}</div>` : ''}
          <div class="ci-date">${esc(p.date || '')}</div>
        </div>
      </div>
    `).join('');

    dots.innerHTML = list.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('');

    // 把每个 carousel-item 沿 Y 轴围成一个圆环
    function layout() {
      const items = carousel.querySelectorAll('.carousel-item');
      const angleStep = 360 / n;
      const radius = Math.max(220, n * 50);
      items.forEach((el, i) => {
        const angle = (i - carouselIdx) * angleStep;
        el.style.transition = 'transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)';
        el.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
      });
      dots.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === carouselIdx);
      });
    }

    function goTo(idx) {
      carouselIdx = ((idx % n) + n) % n;
      layout();
    }
    function next() { goTo(carouselIdx + 1); }
    function prev() { goTo(carouselIdx - 1); }

    document.getElementById('cr-prev').addEventListener('click', () => { prev(); resetAuto(); });
    document.getElementById('cr-next').addEventListener('click', () => { next(); resetAuto(); });
    dots.querySelectorAll('.dot').forEach(d => {
      d.addEventListener('click', () => { goTo(Number(d.dataset.idx)); resetAuto(); });
    });

    // 点击当前居中图片打开大图
    carousel.querySelectorAll('.carousel-item').forEach(el => {
      el.addEventListener('click', () => {
        openLightbox(Number(el.dataset.idx));
      });
    });

    // 自动旋转（每 4 秒）
    function startAuto() {
      carouselTimer = setInterval(next, 4000);
    }
    function resetAuto() {
      if (carouselTimer) clearInterval(carouselTimer);
      startAuto();
    }

    layout();
    startAuto();

    // 旋转木马入场动画
    requestAnimationFrame(() => {
      const wrap = container.querySelector('.carousel-wrap');
      if (wrap) {
        wrap.style.opacity = '1';
        wrap.style.transform = 'translateY(0)';
      }
    });
  }

  // ===== 视图 3：拼贴网格 =====
  function renderGrid(container) {
    const list = sortedPhotos();
    if (!list.length) return renderEmpty(container);
    container.innerHTML = `
      <div class="grid-view">
        ${list.map((p, i) => `
          <div class="grid-item" data-idx="${i}">
            <img src="${imgUrl(p.filename)}" alt="${esc(p.caption)}" loading="lazy">
            <div class="gi-overlay">
              ${p.caption ? `<div>${esc(p.caption)}</div>` : ''}
              <div style="opacity:0.8;font-size:10px;margin-top:2px">${esc(p.date || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    bindClicks(container);
    // 交错弹入动画
    animateItems(container, '.grid-item', 'gallery-animate-pop', 60);
  }

  function bindClicks(container) {
    container.querySelectorAll('[data-idx]').forEach(el => {
      el.addEventListener('click', () => {
        openLightbox(Number(el.dataset.idx));
      });
    });
  }

  // ===== 大图查看器（带过渡动画） =====
  function openLightbox(idx) {
    const list = sortedPhotos();
    if (!list.length) return;
    lightboxIdx = ((idx % list.length) + list.length) % list.length;
    const lb = document.getElementById('lightbox');
    // 设置初始状态
    lb.style.display = 'flex';
    lb.style.opacity = '0';
    // 图片先隐藏
    const img = document.getElementById('lightbox-img');
    img.style.opacity = '0';
    img.style.transform = 'scale(0.92)';
    img.src = imgUrl(list[lightboxIdx].filename);
    // 更新 meta
    document.getElementById('lb-caption').textContent = list[lightboxIdx].caption || '';
    document.getElementById('lb-date').textContent = list[lightboxIdx].date || '';
    document.getElementById('lightbox-counter').textContent = `${lightboxIdx + 1} / ${list.length}`;
    // 触发淡入
    requestAnimationFrame(() => {
      lb.style.opacity = '1';
      img.style.opacity = '1';
      img.style.transform = 'scale(1)';
    });
    // 等过渡完成后加 show class 以便键盘事件
    setTimeout(() => {
      lb.classList.add('show');
    }, 350);
  }

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    lb.classList.remove('show');
    // 淡出动画
    img.style.opacity = '0';
    img.style.transform = 'scale(0.92)';
    lb.style.opacity = '0';
    setTimeout(() => {
      lb.style.display = '';
    }, 350);
  }

  function updateLightbox(direction) {
    const list = sortedPhotos();
    const p = list[lightboxIdx];
    if (!p) return;
    if (isAnimating) return;
    isAnimating = true;

    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lb-caption');
    const date = document.getElementById('lb-date');
    const counter = document.getElementById('lightbox-counter');

    // 方向：1 = 下一张（从右滑入），-1 = 上一张（从左滑入）
    const dir = direction || 0;

    // 当前图片淡出 + 滑出
    const exitTransform = dir > 0 ? 'translateX(-30px) scale(0.95)' : 'translateX(30px) scale(0.95)';
    img.style.opacity = '0';
    img.style.transform = exitTransform;

    setTimeout(() => {
      // 换图
      img.src = imgUrl(p.filename);
      caption.textContent = p.caption || '';
      date.textContent = p.date || '';
      counter.textContent = `${lightboxIdx + 1} / ${list.length}`;

      // 新图从另一侧滑入
      const enterTransform = dir > 0 ? 'translateX(30px) scale(0.95)' : 'translateX(-30px) scale(0.95)';
      img.style.opacity = '0';
      img.style.transform = enterTransform;

      requestAnimationFrame(() => {
        img.style.opacity = '1';
        img.style.transform = 'translateX(0) scale(1)';
      });

      setTimeout(() => {
        isAnimating = false;
      }, 350);
    }, 300);
  }

  function lightboxNext() {
    const list = sortedPhotos();
    const prev = lightboxIdx;
    lightboxIdx = (lightboxIdx + 1) % list.length;
    updateLightbox(1);
  }
  function lightboxPrev() {
    const list = sortedPhotos();
    lightboxIdx = (lightboxIdx - 1 + list.length) % list.length;
    updateLightbox(-1);
  }

  function bindEvents() {
    document.querySelectorAll('#view-switch button').forEach(b => {
      b.addEventListener('click', () => switchView(b.dataset.view));
    });
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lb-prev').addEventListener('click', lightboxPrev);
    document.getElementById('lb-next').addEventListener('click', lightboxNext);
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    // 键盘
    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('lightbox');
      if (!lb.classList.contains('show')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lightboxPrev();
      else if (e.key === 'ArrowRight') lightboxNext();
    });
    // 触屏滑动（lightbox）
    let touchStartX = 0;
    document.getElementById('lightbox').addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    document.getElementById('lightbox').addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) lightboxPrev();
        else lightboxNext();
      }
    }, { passive: true });
  }

  async function load() {
    const r = await api('/api/gallery');
    if (!r) return;
    photos = r.photos || [];
    bindEvents();
    const container = document.getElementById('gallery-container');
    renderMasonry(container);
  }

  load();
})();