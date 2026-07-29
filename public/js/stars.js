// 星空许愿 - 3D 粒子星云 + 实体行星
// 粒子星云算法照抄自 z2586300277/three-cesium-examples (Apache License 2.0)
// 仓库: https://github.com/z2586300277/three-cesium-examples
// 实体行星：使用 Three.js 原生 SphereGeometry + 大气层 BackSide Fresnel shader
// 纹理来自 threejs.org 官方 examples CDN（稳定可靠，无 npm 依赖）
// 大气层算法：参考 threejs.org/examples/Planets/Atmosphere.html (MIT)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const { api, showToast } = window.LoveCommon;
let selectedColor = '#FFD700';

function esc(t) {
  const d = document.createElement('div');
  d.textContent = t == null ? '' : String(t);
  return d.innerHTML;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
  return new Date(iso).toLocaleDateString('zh-CN');
}

// ===== Three.js 场景对象 =====
let scene, camera, renderer, controls;
let galaxyPoints = null;
let wishStarsGroup;
let backgroundStars;
let wishStars = [];
let clock;
let gu;  // uniform 容器

// ===== 照抄开源核心：150,000 粒子星云生成 =====
// 原始来源: https://github.com/z2586300277/three-cesium-examples/blob/dev/threeExamples/particle/PlanetParticle.html
function initThree() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x160016);
  scene.fog = new THREE.FogExp2(0x160016, 0.005);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
  // 相机初始位置看向 z=-90 的地月系
  camera.position.set(0, 10, -45);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 20;
  controls.maxDistance = 200;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;

  // ===== 相机飞行操纵系统（键盘 + 虚拟摇杆） =====
  // 移动 OrbitControls.target 来"飞行"，相机自动跟随
  const keys = {};
  let joystickDir = { x: 0, y: 0 };  // 摇杆归一化方向

  // 键盘监听
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // 虚拟摇杆（移动端）
  const joystickContainer = document.getElementById('joystick-container');
  const joystickKnob = document.getElementById('joystick-knob');
  if (joystickContainer && joystickKnob) {
    const maxR = 35; // 摇杆最大偏移半径
    let activeTouchId = null;

    joystickContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeTouchId === null) {
        activeTouchId = e.changedTouches[0].identifier;
        updateJoystick(e.changedTouches[0]);
      }
    }, { passive: false });

    joystickContainer.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          updateJoystick(e.changedTouches[i]);
          break;
        }
      }
    }, { passive: false });

    const resetJoystick = () => {
      joystickDir.x = 0;
      joystickDir.y = 0;
      joystickKnob.style.transform = 'translate(0px, 0px)';
      activeTouchId = null;
    };

    joystickContainer.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          resetJoystick();
          break;
        }
      }
    });
    joystickContainer.addEventListener('touchcancel', resetJoystick);

    function updateJoystick(touch) {
      const rect = joystickContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, maxR);
      if (dist > 0) {
        dx = (dx / dist) * clamp;
        dy = (dy / dist) * clamp;
      }
      joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      joystickDir.x = dx / maxR;
      joystickDir.y = dy / maxR;
    }
  }

  const FLY_SPEED = 8;

  gu = {
    time: { value: 0 },
    keys: keys,
    joystickDir: joystickDir,
    flySpeed: FLY_SPEED
  };

  clock = new THREE.Clock();

  generateGalaxyParticles();
  createBackgroundStars();
  createPlanet();

  wishStarsGroup = new THREE.Group();
  scene.add(wishStarsGroup);
  loadWishStars();

  // 点击愿望星查看愿望
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchend', onCanvasTouchEnd);
  canvas.addEventListener('touchstart', () => { lastTouchStart = Date.now(); }, { passive: true });

  window.addEventListener('resize', onResize);
  animate();
}

// ===== 照抄开源算法，用纯 ShaderMaterial 实现（不受 three.js 版本变化影响） =====
// 算法来源: https://github.com/z2586300277/three-cesium-examples/blob/dev/threeExamples/particle/PlanetParticle.html
// 原版用 onBeforeCompile 注入 PointsMaterial，但 three.js 新版 shader 结构改变导致替换失效，
// 这里改用纯 ShaderMaterial 完整自定义 vertex/fragment shader，保留同样的视觉效果
function generateGalaxyParticles() {
  const sizes = [];
  const shift = [];
  const positions = [];

  // pushShift：每个粒子分配 4 个动画参数（相位/方向/速度/幅度）
  // 照抄自 PlanetParticle.html
  function pushShift() {
    shift.push(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      (Math.random() * 0.9 + 0.1) * Math.PI * 0.1,
      Math.random() * 0.9 + 0.1
    );
  }

  // 5 万球壳分布粒子
  for (let i = 0; i < 50000; i++) {
    const v = new THREE.Vector3()
      .randomDirection()
      .multiplyScalar(Math.random() * 0.5 + 9.5);
    positions.push(v.x, v.y, v.z);
    sizes.push(Math.random() * 2.0 + 1.2);
    pushShift();
  }

  // 10 万圆盘分布粒子
  for (let i = 0; i < 100000; i++) {
    const r = 10, R = 40;
    const rand = Math.pow(Math.random(), 1.5);
    const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
    const v = new THREE.Vector3().setFromCylindricalCoords(
      radius,
      Math.random() * 2 * Math.PI,
      (Math.random() - 0.5) * 2
    );
    positions.push(v.x, v.y, v.z);
    sizes.push(Math.random() * 2.0 + 1.2);
    pushShift();
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('sizes', new THREE.Float32BufferAttribute(sizes, 1));
  g.setAttribute('shift', new THREE.Float32BufferAttribute(shift, 4));

  // 完整自定义着色器（不再依赖 onBeforeCompile 字符串替换）
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uSize: { value: 40.0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSize;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;

      void main() {
        // 照抄开源：粒子按 shift 参数做圆周流动
        float t = uTime;
        float moveT = mod(shift.x + shift.z * t, 6.28318530718);
        float moveS = mod(shift.y + shift.z * t, 6.28318530718);
        vec3 transformed = position;
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;

        // 照抄开源：颜色由内（暖橙）向外（冷紫）渐变
        float d = length(abs(position) / vec3(40., 10., 40));
        d = clamp(d, 0., 1.);
        vColor = mix(vec3(255., 200., 30.), vec3(160., 80., 255.), d) / 200.;

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uSize * sizes * uPixelRatio * (1.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        // 照抄开源：圆形软边发光粒子
        float d = length(gl_PointCoord.xy - 0.5);
        float alpha = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `
  });

  // 保存 uniform 引用，主循环里更新
  gu.time = m.uniforms.uTime;

  galaxyPoints = new THREE.Points(g, m);
  galaxyPoints.rotation.order = 'ZYX';
  galaxyPoints.rotation.z = 0.2;
  scene.add(galaxyPoints);
}

// ===== 实体行星（Three.js 原生实现，零 npm 依赖） =====
// 地球 + 大气层光晕（BackSide 球壳 + Fresnel shader）
// 算法参考 threejs.org/examples/Planets/Atmosphere.html (MIT)
// 纹理使用 threejs.org 官方 examples CDN（长期稳定）
let planet = null;
let planetOrbit = null;  // 行星公转轨道节点

function createPlanet() {
  const textureLoader = new THREE.TextureLoader();

  // ============ 主行星：地球 ============
  // 关键：用 MeshStandardMaterial + 强 emissive，避免在黑色背景下变暗成"光圈"
  const earthTexture = textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
  );
  earthTexture.colorSpace = THREE.SRGBColorSpace;

  const earthBump = textureLoader.load(
    'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'
  );

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(5, 64, 64),
    new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: earthBump,
      bumpScale: 0.05,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x223344),     // 自发光打底，避免背光面全黑
      emissiveMap: earthTexture,               // 纹理也用作自发光，昼夜都有颜色
      emissiveIntensity: 0.8
    })
  );
  // 地球放到远离星云的独立区域（星云盘在 z=0，半径 ~40，地球挪到 -90）
  const PLANET_BASE_Z = -90;
  earth.position.set(0, 0, PLANET_BASE_Z);

  // ============ 大气层光晕 ============
  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
        gl_FragColor = vec4(0.35, 0.7, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 64, 64),
    atmosphereMaterial
  );
  atmosphere.position.set(0, 0, PLANET_BASE_Z);

  // ============ 月球 ============
  const moonTexture = textureLoader.load(
    'https://threejs.org/examples/textures/planets/moon_1024.jpg'
  );
  moonTexture.colorSpace = THREE.SRGBColorSpace;

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 32, 32),
    new THREE.MeshStandardMaterial({
      map: moonTexture,
      roughness: 0.95,
      metalness: 0.05,
      emissive: new THREE.Color(0x443322),
      emissiveMap: moonTexture,
      emissiveIntensity: 0.6
    })
  );
  // 月球放在离地球较远的位置（地球前方，绕地球转）
  moon.position.set(15, 3, PLANET_BASE_Z - 8);

  // 月球不加光晕（避免"光圈"看起来比实体还大），只靠本身纹理可见

  // scene 直接添加地球（中心固定不公转）
  scene.add(earth);
  scene.add(atmosphere);

  // 月球放到独立的公转节点里（绕地球转）
  planetOrbit = new THREE.Group();
  planetOrbit.add(moon);
  scene.add(planetOrbit);

  planet = earth;

  // 光源（照亮地球 + 大气层用）
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
  sunLight.position.set(-1, 0.5, 1);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x505078, 0.9));

  planetOrbit.userData.moon = moon;
  planetOrbit.userData.atmosphere = atmosphere;
  // 月球公转半径（围绕地球中心 PLANET_BASE_Z）
  planetOrbit.userData.moonOrbitRadius = 15;
  planetOrbit.userData.moonBaseY = 3;
  planetOrbit.userData.moonCenterZ = PLANET_BASE_Z - 8;
  planetOrbit.userData.moonCenterX = 0;
}

// 远景背景星
function createBackgroundStars() {
  const count = 4000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const brightness = 0.4 + Math.random() * 0.6;
    const tint = Math.random();
    if (tint < 0.7) {
      colors[i * 3] = brightness; colors[i * 3 + 1] = brightness; colors[i * 3 + 2] = brightness;
    } else if (tint < 0.9) {
      colors[i * 3] = brightness * 0.7; colors[i * 3 + 1] = brightness * 0.85; colors[i * 3 + 2] = brightness;
    } else {
      colors[i * 3] = brightness; colors[i * 3 + 1] = brightness * 0.95; colors[i * 3 + 2] = brightness * 0.7;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.4,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });

  backgroundStars = new THREE.Points(geometry, material);
  scene.add(backgroundStars);
}

// ===== 愿望星（叠加在星云中） =====
async function loadWishStars() {
  const data = await api('/api/wishes');
  if (!data) return;
  const wishes = data.wishes || [];
  renderWishList(wishes);
  addWishStarsToScene(wishes);
}

function clearWishStars() {
  while (wishStarsGroup.children.length > 0) {
    const obj = wishStarsGroup.children[0];
    wishStarsGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  wishStars = [];
}

function addWishStarsToScene(wishes) {
  clearWishStars();

  wishes.forEach((w) => {
    const color = new THREE.Color(w.color || '#FFD700');

    // 在星云盘内随机分布
    const radius = 12 + Math.random() * 25;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 4;
    const pos = new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    // 中心亮星
    const geo = new THREE.SphereGeometry(0.25, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color });
    const star = new THREE.Mesh(geo, mat);
    star.position.copy(pos);
    star.userData = w;
    wishStarsGroup.add(star);

    // 光晕
    const haloGeo = new THREE.SphereGeometry(0.7, 12, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.copy(pos);
    wishStarsGroup.add(halo);

    wishStars.push({
      star, halo,
      basePos: pos.clone(),
      phase: Math.random() * Math.PI * 2,
      color
    });
  });
}

function renderWishList(wishes) {
  const list = document.getElementById('wish-list');
  if (!list) return;
  if (!wishes.length) {
    list.innerHTML = '<div class="stars-empty">星河还空着，做第一个许愿的人吧</div>';
    return;
  }
  list.innerHTML = wishes.slice().reverse().map(w => `
    <div class="stars-wish-item" style="border-left-color:${esc(w.color || '#FFD700')}">
      <div class="stars-wish-name">${esc(w.name)} · ${timeAgo(w.time)}</div>
      <div class="stars-wish-content">${esc(w.wish)}</div>
    </div>
  `).join('');
}

// ===== Raycaster：点击愿望星查看愿望 =====
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let lastTouchStart = 0;

function setPointer(e) {
  const p = e.touches ? e.touches[0] : e;
  pointer.x = (p.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(p.clientY / window.innerHeight) * 2 + 1;
}

function pickWishStar() {
  if (!wishStars.length) return null;
  raycaster.setFromCamera(pointer, camera);
  raycaster.params.Mesh = {};
  const meshes = wishStars.map(w => w.star);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    return hits[0].object.userData;
  }
  return null;
}

function onCanvasClick(e) {
  setPointer(e);
  const w = pickWishStar();
  if (w) {
    showToast(`${w.name}：${w.wish}`);
  }
}

function onCanvasTouchEnd(e) {
  // 区分点击与拖动：touchstart 到 touchend 时间短才算点击
  if (Date.now() - lastTouchStart > 400) return;
  const t = e.changedTouches[0];
  if (!t) return;
  pointer.x = (t.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(t.clientY / window.innerHeight) * 2 + 1;
  const w = pickWishStar();
  if (w) {
    showToast(`${w.name}：${w.wish}`);
  }
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== 主循环（照抄开源：uTime 驱动 GLSL 粒子流动） =====
function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime() * 0.5;

  if (controls) controls.update();

  // ===== 相机飞行：键盘 + 摇杆同时移动 camera.position 和 controls.target =====
  // 关键修复：
  //   1. 用独立 delta time（getElapsedTime 之后 getDelta 返回接近 0）
  //   2. 必须同时移动 position 和 target，否则只是转头不是飞行
  if (gu && gu.keys && gu.joystickDir) {
    const now = performance.now();
    if (!gu.lastFlyTime) gu.lastFlyTime = now;
    const dt = Math.min((now - gu.lastFlyTime) / 1000, 0.1);
    gu.lastFlyTime = now;
    const speed = gu.flySpeed * dt;
    if (speed > 0) {
      // 相机朝向向量（在 XZ 平面上的投影，用于水平移动）
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      // 累积位移
      const move = new THREE.Vector3();
      const k = gu.keys;
      if (k['w'] || k['arrowup']) move.addScaledVector(forward, speed);
      if (k['s'] || k['arrowdown']) move.addScaledVector(forward, -speed);
      if (k['a'] || k['arrowleft']) move.addScaledVector(right, -speed);
      if (k['d'] || k['arrowright']) move.addScaledVector(right, speed);
      if (k['q']) move.y -= speed;
      if (k['e']) move.y += speed;

      // 虚拟摇杆（移动端）：摇杆 y 轴上推 = forward
      const j = gu.joystickDir;
      if (j.x !== 0 || j.y !== 0) {
        move.addScaledVector(forward, -j.y * speed * 1.5);
        move.addScaledVector(right, j.x * speed * 1.5);
      }

      // 同时移动相机和注视点（保持相对偏移不变 = 飞行）
      if (move.lengthSq() > 0) {
        camera.position.add(move);
        controls.target.add(move);
      }
    }
  }

  // 关键：把时间传给 shader，vertex shader 里粒子按 shift 参数做圆周流动
  if (gu && gu.time) {
    gu.time.value = elapsedTime * Math.PI;
  }

  // 整个星云缓慢自转
  if (galaxyPoints) {
    galaxyPoints.rotation.y = elapsedTime * 0.05;
  }

  // 行星自转 + 月球公转（地月系独立于星云）
  if (planet) {
    planet.rotation.y = elapsedTime * 0.3;  // 自转
  }
  if (planetOrbit) {
    // 月球绕地球公转（地月系中心在 (0, 0, PLANET_BASE_Z - 8)）
    const r = planetOrbit.userData.moonOrbitRadius || 15;
    const baseY = planetOrbit.userData.moonBaseY || 3;
    const cx = planetOrbit.userData.moonCenterX || 0;
    const cz = planetOrbit.userData.moonCenterZ || -98;
    if (planetOrbit.userData.moon) {
      const t = elapsedTime * 0.15;
      planetOrbit.userData.moon.position.x = cx + Math.cos(t) * r;
      planetOrbit.userData.moon.position.z = cz + Math.sin(t) * r;
      planetOrbit.userData.moon.position.y = baseY + Math.sin(t * 0.5) * 2;
      planetOrbit.userData.moon.rotation.y = elapsedTime * 0.2;
    }
  }

  // 愿望星闪烁 + 微浮动
  for (let i = 0; i < wishStars.length; i++) {
    const w = wishStars[i];
    const flicker = 0.5 + (Math.sin(elapsedTime * 2 + w.phase) * 0.5 + 0.5) * 0.5;
    w.halo.material.opacity = 0.3 + flicker * 0.5;
    const scale = 0.85 + flicker * 0.4;
    w.star.scale.setScalar(scale);
    w.halo.scale.setScalar(0.9 + flicker * 0.35);
    const dy = Math.sin(elapsedTime * 0.8 + w.phase) * 0.3;
    w.star.position.set(w.basePos.x, w.basePos.y + dy, w.basePos.z);
    w.halo.position.copy(w.star.position);
  }

  // 背景星缓慢自转
  if (backgroundStars) backgroundStars.rotation.y += 0.00015;

  if (renderer) renderer.render(scene, camera);
}

// ===== 提交愿望 =====
async function submitWish() {
  const name = document.getElementById('wish-name').value.trim();
  const wish = document.getElementById('wish-content').value.trim();
  if (!wish) { showToast('请写下你的愿望'); return; }

  const btn = document.getElementById('wish-submit');
  btn.disabled = true;
  btn.textContent = '点亮中...';

  const data = await api('/api/wishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || '匿名旅人', wish, color: selectedColor })
  });

  btn.disabled = false;
  btn.textContent = '点亮这颗星';

  if (data && data.ok) {
    showToast('愿望已点亮，已在星河中闪耀');
    document.getElementById('wish-content').value = '';
    // 刷新星云中的愿望星 + 列表
    loadWishStars();
    // 摄像机轻微推近，给点反馈
    if (controls) {
      camera.position.multiplyScalar(0.96);
    }
  } else {
    showToast('点亮失败，请重试');
  }
}

function initColorPicker() {
  const dots = document.querySelectorAll('.stars-color-dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedColor = dot.dataset.color;
    });
  });
}

// ===== 面板展开 / 收起 =====
function initPanelToggle() {
  const toggle = document.getElementById('stars-toggle');
  const toggleText = document.getElementById('stars-toggle-text');
  const panel = document.getElementById('stars-panel');
  const closeBtn = document.getElementById('stars-panel-close');
  if (!toggle || !panel) return;

  const OPEN_TEXT = '收起面板';
  const CLOSED_TEXT = '许愿 · 查看星河';

  function openPanel() {
    panel.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    if (toggleText) toggleText.textContent = OPEN_TEXT;
  }
  function closePanel() {
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    if (toggleText) toggleText.textContent = CLOSED_TEXT;
  }

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // 移动端：下拉抓手关闭
  const grabber = panel.querySelector('.stars-grabber');
  if (grabber) {
    let startY = 0, dragging = false;
    grabber.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY; dragging = true;
    }, { passive: true });
    grabber.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80) { closePanel(); dragging = false; }
    }, { passive: true });
    grabber.addEventListener('touchend', () => { dragging = false; });
  }

  // ESC 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });
}

function init() {
  initThree();
  initColorPicker();
  initPanelToggle();
  const submitBtn = document.getElementById('wish-submit');
  if (submitBtn) submitBtn.addEventListener('click', submitWish);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
