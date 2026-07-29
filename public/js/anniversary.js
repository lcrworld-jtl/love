// 纪念日倒计时中心
// 功能：在一起实时秒数跳动 + 即将到来的纪念日/生日倒计时
// 不再包含时间线（首页已有）
// 数据源：GET /api/anniversaries

(function () {
  'use strict';
  const { api, showToast } = window.LoveCommon;
  let events = [];
  let togetherEvent = null;  // type === 'together' 的事件
  let tickTimer = null;

  // 解析 YYYY-MM-DD 为当天 00:00:00 的 Date
  function parseDate(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  // 类型 → emoji + 中文标签 + 渐变类
  const TYPE_META = {
    anniversary: { emoji: '💍', label: '纪念日', grad: 'grad-anniversary' },
    birthday:    { emoji: '🎂', label: '生日',   grad: 'grad-birthday' },
    custom:      { emoji: '✨', label: '每年',   grad: 'grad-custom' },
    together:    { emoji: '💗', label: '在一起', grad: 'grad-anniversary' }
  };

  // 计算下一个年度纪念日距今还有多少天
  function nextYearlyDays(baseDate) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let next = new Date(now.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    if (next < startOfToday) {
      next = new Date(now.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
    }
    const diff = Math.round((next - startOfToday) / 86400000);
    return { days: diff, nextDate: next, isToday: diff === 0 };
  }

  // 渲染"在一起"实时计时卡片
  function renderTogether() {
    const wrap = document.getElementById('together-card');
    if (!togetherEvent) {
      wrap.innerHTML = '<div class="together-empty">还没有"在一起"的日期<br>管理员可在后台添加一条类型为"在一起"的事件</div>';
      return;
    }
    const startDate = parseDate(togetherEvent.date);
    if (!startDate) {
      wrap.innerHTML = '<div class="together-empty">日期格式错误</div>';
      return;
    }
    wrap.innerHTML = `
      <div class="together-card">
        <div class="tc-label">${esc(togetherEvent.title || '我们在一起')}</div>
        <div class="tc-date">从 ${fmtDate(startDate)} 开始 · 每一秒都在累积</div>
        <div class="tc-days" id="tc-days-num">0<span class="unit">天</span></div>
        <div class="tc-seconds" id="tc-seconds">0 小时 0 分 0 秒</div>
        ${togetherEvent.desc ? `<div style="margin-top:14px;font-size:13px;opacity:0.92">${esc(togetherEvent.desc)}</div>` : ''}
      </div>
    `;
    tickTogether(startDate);
  }

  function tickTogether(startDate) {
    const daysEl = document.getElementById('tc-days-num');
    const secEl = document.getElementById('tc-seconds');
    if (!daysEl || !secEl) return;

    function update() {
      const now = new Date();
      const diff = now - startDate;
      if (diff < 0) {
        daysEl.innerHTML = '0<span class="unit">天</span>';
        secEl.textContent = '（尚未开始）';
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      daysEl.innerHTML = days + '<span class="unit">天</span>';
      secEl.textContent = `${hours} 小时 ${mins} 分 ${secs} 秒`;
    }
    update();
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(update, 1000);
  }

  // 渲染即将到来的纪念日倒计时（年度事件，按剩余天数升序）
  function renderCountdowns() {
    const grid = document.getElementById('countdown-grid');
    const yearlyEvents = events.filter(e => e.yearly && e.type !== 'together' && parseDate(e.date));
    if (!yearlyEvents.length) {
      grid.innerHTML = '<div class="empty-grid">还没有即将到来的纪念日<br>管理员可在后台添加"每年重复"的事件</div>';
      return;
    }

    const computed = yearlyEvents.map(e => {
      const base = parseDate(e.date);
      const info = nextYearlyDays(base);
      return { ev: e, ...info };
    });
    computed.sort((a, b) => a.days - b.days);

    grid.innerHTML = computed.map(c => {
      const meta = TYPE_META[c.ev.type] || TYPE_META.custom;
      const cls = [
        'countdown-card',
        meta.grad,
        c.isToday ? 'cc-today' : (c.days > 0 ? '' : 'cc-past')
      ].filter(Boolean).join(' ');

      const daysLabel = c.isToday
        ? `<span class="unit">🎉 就是今天！</span>`
        : `${c.days}<span class="unit">天后</span>`;

      return `
        <div class="${cls}">
          <div class="cc-bg-icon">${meta.emoji}</div>
          <div>
            <div class="cc-top">
              <span class="cc-emoji">${meta.emoji}</span>
              <span>${meta.label}</span>
            </div>
            <div class="cc-title">${esc(c.ev.title)}</div>
            <div class="cc-date">${fmtDate(c.nextDate)}</div>
          </div>
          <div class="cc-days">${daysLabel}</div>
        </div>
      `;
    }).join('');
  }

  async function load() {
    const r = await api('/api/anniversaries');
    if (!r) return;
    events = r.events || [];
    togetherEvent = events.find(e => e.type === 'together') || null;
    renderTogether();
    renderCountdowns();
  }

  // 页面卸载时清理计时器
  window.addEventListener('beforeunload', () => {
    if (tickTimer) clearInterval(tickTimer);
  });

  load();
})();
