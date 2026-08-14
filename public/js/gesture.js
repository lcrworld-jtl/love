// 手势驱动动画 - 滑动时生成粉色拖尾粒子
(function() {
  // iframe 模式：特效由顶层 shell 统一提供，本页不再初始化
  if (window.self !== window.top) return;
  const canvas = document.getElementById('effect-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, trails = [];
  let lastX = 0, lastY = 0, hasLast = false;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class TrailParticle {
    constructor(x, y) {
      this.x = x + (Math.random() - 0.5) * 20;
      this.y = y + (Math.random() - 0.5) * 20;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5 - 0.3;
      this.size = 3 + Math.random() * 5;
      this.life = 1;
      this.decay = 0.03;
      const colors = ['#FFB3C6', '#FFC0CB', '#FFD1DC', '#FF6B9D'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      this.size *= 0.96;
    }
    draw() {
      if (this.life > 0 && this.size > 0.5) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 鼠标移动
  document.addEventListener('mousemove', e => {
    if (hasLast) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        trails.push(new TrailParticle(e.clientX, e.clientY));
      }
    }
    lastX = e.clientX;
    lastY = e.clientY;
    hasLast = true;
  });

  // 触摸移动
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (hasLast) {
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 3) {
        for (let i = 0; i < 2; i++) {
          trails.push(new TrailParticle(t.clientX, t.clientY));
        }
      }
    }
    lastX = t.clientX;
    lastY = t.clientY;
    hasLast = true;
  }, { passive: true });

  document.addEventListener('touchend', () => { hasLast = false; });

  function animate() {
    trails = trails.filter(p => p.life > 0 && p.size > 0.5);
    trails.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();
