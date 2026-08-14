// 点击爱心特效
(function() {
  // iframe 模式：特效由顶层 shell 统一提供，本页不再初始化
  if (window.self !== window.top) return;
  const canvas = document.getElementById('effect-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawHeart(x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-10, -5, -20, 5, 0, 15);
    ctx.bezierCurveTo(20, 5, 10, -5, 0, 5);
    ctx.fill();
    ctx.restore();
  }

  class HeartParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 1;
      this.size = 10 + Math.random() * 15;
      this.life = 1;
      this.decay = 0.015 + Math.random() * 0.015;
      const colors = ['#FF6B9D', '#FFB3C6', '#FF1493', '#FF69B4', '#FFC0CB'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.08;
      this.life -= this.decay;
      this.size *= 0.98;
    }
    draw() {
      if (this.life > 0 && this.size > 1) {
        drawHeart(this.x, this.y, this.size, this.color, this.life);
      }
    }
  }

  // 点击/触摸触发
  function trigger(x, y) {
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      particles.push(new HeartParticle(x, y));
    }
  }

  document.addEventListener('click', e => {
    // 排除导航等交互元素
    if (e.target.closest('.nav-item')) return;
    trigger(e.clientX, e.clientY);
  });

  document.addEventListener('touchstart', e => {
    if (e.target.closest('.nav-item')) return;
    const t = e.touches[0];
    trigger(t.clientX, t.clientY);
  }, { passive: true });

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles = particles.filter(p => p.life > 0 && p.size > 1);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();
