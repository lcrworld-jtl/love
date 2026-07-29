// 樱花飘落特效 - 基于开源canvas樱花动画
(function() {
  const canvas = document.getElementById('sakura-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, petals = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // 樱花瓣
  class Petal {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : -20;
      this.size = 8 + Math.random() * 12;
      this.speedY = 0.5 + Math.random() * 1.5;
      this.speedX = -0.5 + Math.random() * 1;
      this.rotate = Math.random() * Math.PI * 2;
      this.rotateSpeed = -0.02 + Math.random() * 0.04;
      this.swing = Math.random() * Math.PI * 2;
      this.swingSpeed = 0.01 + Math.random() * 0.02;
      this.opacity = 0.4 + Math.random() * 0.5;
      // 粉色系随机
      const pinks = ['#FFB7C5', '#FFC0CB', '#FF69B4', '#FFD1DC', '#FFB6C1'];
      this.color = pinks[Math.floor(Math.random() * pinks.length)];
    }
    update() {
      this.swing += this.swingSpeed;
      this.x += this.speedX + Math.sin(this.swing) * 0.8;
      this.y += this.speedY;
      this.rotate += this.rotateSpeed;
      if (this.y > H + 20) this.reset(false);
      if (this.x < -20) this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotate);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      // 画花瓣形状
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        this.size * 0.3, -this.size * 0.5,
        this.size * 0.8, -this.size * 0.3,
        this.size, 0
      );
      ctx.bezierCurveTo(
        this.size * 0.8, this.size * 0.3,
        this.size * 0.3, this.size * 0.5,
        0, 0
      );
      ctx.fill();
      ctx.restore();
    }
  }

  // 根据屏幕大小生成花瓣数量
  const count = window.innerWidth < 480 ? 20 : 35;
  for (let i = 0; i < count; i++) petals.push(new Petal());

  function animate() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();
