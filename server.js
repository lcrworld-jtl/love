const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3009;
const DATA_DIR = path.join(__dirname, 'data');
const VOICE_DIR = path.join(DATA_DIR, 'voice');
const DATA_FILE = path.join(DATA_DIR, 'content.json');
const APPLY_FILE = path.join(DATA_DIR, 'applications.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const CAPSULES_FILE = path.join(DATA_DIR, 'capsules.json');
const WISHES_FILE = path.join(DATA_DIR, 'wishes.json');
const VOICE_META_FILE = path.join(DATA_DIR, 'voice_meta.json');
const ANNIV_FILE = path.join(DATA_DIR, 'anniversaries.json');
const GALLERY_DIR = path.join(DATA_DIR, 'gallery');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const BUCKET_FILE = path.join(DATA_DIR, 'bucket_list.json');
const AGREEMENT_FILE = path.join(DATA_DIR, 'agreement.json');
const NETEASE_API = process.env.NETEASE_API || 'http://127.0.0.1:3002';
const PLAYLIST_ID = process.env.PLAYLIST_ID || '';

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });
if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

// 图片扩展名映射
const IMG_EXT_MAP = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg',
  'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/bmp': 'bmp'
};

// Simple token auth
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'love2026';
const TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

// 语音上传用裸 body
app.use('/api/voice/upload', express.raw({ type: ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/wav', 'audio/*'], limit: '10mb' }));
app.use(express.json({ limit: '15mb' }));

// 静态文件 - 对 service-worker.js 不缓存
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('service-worker.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Auth 中间件（提前定义，供后续路由使用）
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== TOKEN) {
    return res.status(401).json({ error: '未授权' });
  }
  next();
}

// ===== SEO: 站点域名 & 页面清单 =====
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const SEO_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/lover', priority: '0.9', changefreq: 'weekly' },
  { path: '/capsule', priority: '0.8', changefreq: 'weekly' },
  { path: '/stars', priority: '0.8', changefreq: 'weekly' },
  { path: '/anniversary', priority: '0.8', changefreq: 'weekly' },
  { path: '/gallery', priority: '0.8', changefreq: 'weekly' },
  { path: '/bucket-list', priority: '0.7', changefreq: 'weekly' },
  { path: '/agreement', priority: '0.6', changefreq: 'monthly' }
];

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(`# Love 站点 robots.txt
# https://love.lcrworld.xyz

# ===== 默认规则：所有爬虫 =====
User-agent: *
Allow: /
Allow: /$
Allow: /lover
Allow: /capsule
Allow: /stars
Allow: /anniversary
Allow: /gallery
Allow: /bucket-list
Allow: /agreement
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /api
Disallow: /service-worker.js
Disallow: /manifest.json
Disallow: /og-image.png
Disallow: /*.json$
Disallow: /*.css$
Disallow: /*.js$

# ===== 主流爬虫单独声明（无额外限制，仅记录意图） =====
User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Baiduspider
Allow: /
Crawl-delay: 1

User-agent: Baiduspider-image
Allow: /

User-agent: bingbot
Allow: /
Crawl-delay: 1

User-agent: Sogou web spider
Allow: /
Crawl-delay: 2

User-agent: 360Spider
Allow: /
Crawl-delay: 1

User-agent: Bytespider
Allow: /
Crawl-delay: 1

User-agent: YandexBot
Allow: /

# ===== 明确禁止的爬虫（无价值抓取/恶意爬虫） =====
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: PetalBot
Disallow: /

# ===== Sitemap =====
Sitemap: ${SITE_URL}/sitemap.xml
`);
});

// sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const today = new Date().toISOString().slice(0, 10);
  const urls = SEO_PAGES.map(p => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

// ===== 通用 JSON 文件读写 =====
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== 简单限流（按 IP） =====
const rateLimitMap = new Map();
function rateLimit(key, maxCount, windowMs) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };
  if (now > record.reset) {
    record.count = 0;
    record.reset = now + windowMs;
  }
  record.count++;
  rateLimitMap.set(key, record);
  return record.count <= maxCount;
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

// ===== Helper: fetch JSON from Netease API =====
function fetchNetease(apiPath) {
  return new Promise((resolve, reject) => {
    http.get(NETEASE_API + apiPath, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ===== 内容 API =====
app.get('/api/content', (req, res) => {
  try {
    const data = readJson(DATA_FILE, { title: '', subtitle: '', sections: [] });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: '读取失败' });
  }
});

app.post('/api/content', auth, (req, res) => {
  try {
    writeJson(DATA_FILE, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

// ===== 音乐 API =====
// 网易云返回的 url/picUrl 都是 http://，HTTPS 页面会被浏览器以 mixed content 拦截，
// 这里统一升级为 https://
function httpsify(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^http:\/\//, 'https://');
}

app.get('/api/music/playlist', async (req, res) => {
  try {
    const data = await fetchNetease('/playlist/detail?id=' + PLAYLIST_ID);
    if (data.code === 200 && data.playlist) {
      const songs = data.playlist.tracks.map(t => ({
        id: t.id,
        name: t.name,
        artist: (t.ar && t.ar[0]) ? t.ar[0].name : '',
        picUrl: httpsify((t.al && t.al.picUrl) ? t.al.picUrl : ''),
        album: (t.al && t.al.name) ? t.al.name : ''
      }));
      res.json({ songs });
    } else {
      res.status(500).json({ error: '获取歌单失败' });
    }
  } catch (e) {
    res.status(500).json({ error: 'API错误' });
  }
});

app.get('/api/music/url', async (req, res) => {
  const songId = req.query.id;
  if (!songId) return res.status(400).json({ error: '缺少id' });
  try {
    const data = await fetchNetease('/song/url?id=' + songId);
    if (data.code === 200 && data.data && data.data[0]) {
      const url = httpsify(data.data[0].url);
      if (!url) return res.status(404).json({ error: '暂无版权' });
      res.json({ url, name: data.data[0].name });
    } else {
      res.status(404).json({ error: '获取链接失败' });
    }
  } catch (e) {
    res.status(500).json({ error: 'API错误' });
  }
});

// ===== 登录 =====
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: TOKEN });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

// ===== 申请 API =====
function readApplications() { return readJson(APPLY_FILE, []); }

app.post('/api/apply', (req, res) => {
  try {
    const { role, realName } = req.body;
    if (!role || !realName) return res.status(400).json({ error: '请填写必要信息' });
    if (!rateLimit('apply:' + getClientIp(req), 5, 60 * 1000)) {
      return res.status(429).json({ error: '操作太频繁，请稍后再试' });
    }
    const apps = readApplications();
    apps.push({
      id: Date.now().toString(),
      role,
      ...req.body,
      time: new Date().toISOString()
    });
    writeJson(APPLY_FILE, apps);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '提交失败' });
  }
});

app.get('/api/applications', auth, (req, res) => {
  res.json({ applications: readApplications() });
});

app.delete('/api/applications/:id', auth, (req, res) => {
  try {
    const apps = readApplications().filter(a => a.id !== req.params.id);
    writeJson(APPLY_FILE, apps);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

// ===== 留言墙 API =====
// GET 公开（只返回已审核通过），POST 公开提交（待审核）
app.get('/api/messages', (req, res) => {
  const all = readJson(MESSAGES_FILE, []);
  const approved = all.filter(m => m.approved);
  res.json({ messages: approved });
});

app.post('/api/messages', (req, res) => {
  try {
    const { name, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });
    if (content.length > 500) return res.status(400).json({ error: '内容过长' });
    if (!rateLimit('msg:' + getClientIp(req), 10, 60 * 1000)) {
      return res.status(429).json({ error: '操作太频繁' });
    }
    const all = readJson(MESSAGES_FILE, []);
    const msg = {
      id: Date.now().toString(),
      name: (name || '匿名').toString().slice(0, 20),
      content: content.trim(),
      approved: false,
      time: new Date().toISOString()
    };
    all.unshift(msg);
    writeJson(MESSAGES_FILE, all);
    res.json({ ok: true, message: '留言已提交，审核后将展示' });
  } catch (e) {
    res.status(500).json({ error: '提交失败' });
  }
});

// 管理员获取全部（含未审核）
app.get('/api/messages/all', auth, (req, res) => {
  res.json({ messages: readJson(MESSAGES_FILE, []) });
});

// 审核通过/取消
app.post('/api/messages/:id/approve', auth, (req, res) => {
  const all = readJson(MESSAGES_FILE, []);
  const m = all.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: '不存在' });
  m.approved = req.body.approved !== false;
  writeJson(MESSAGES_FILE, all);
  res.json({ ok: true });
});

app.delete('/api/messages/:id', auth, (req, res) => {
  const all = readJson(MESSAGES_FILE, []).filter(m => m.id !== req.params.id);
  writeJson(MESSAGES_FILE, all);
  res.json({ ok: true });
});

// ===== 站点访问统计 API =====
// 初始化统计数据结构
function initStats() {
  const s = readJson(STATS_FILE, null);
  if (s) return s;
  return {
    totalPv: 0,
    totalUv: 0,
    daily: {},   // 'YYYY-MM-DD' -> { pv, uv }
    pages: {},   // path -> pv
    visitors: [] // [{ id, ip, ua, first, last, city }]
  };
}

app.post('/api/stats/track', (req, res) => {
  try {
    const { path: pagePath, visitorId } = req.body;
    if (!pagePath) return res.json({ ok: true });
    if (!rateLimit('track:' + getClientIp(req), 60, 60 * 1000)) {
      return res.json({ ok: true });
    }
    const s = initStats();
    const today = new Date().toISOString().slice(0, 10);
    s.daily[today] = s.daily[today] || { pv: 0, uv: 0 };
    s.daily[today].pv++;
    s.pages[pagePath] = (s.pages[pagePath] || 0) + 1;
    s.totalPv++;
    // UV
    const visitorKey = visitorId || getClientIp(req);
    if (!s.visitors.find(v => v.id === visitorKey)) {
      s.visitors.push({
        id: visitorKey,
        ip: getClientIp(req),
        ua: (req.headers['user-agent'] || '').slice(0, 200),
        first: new Date().toISOString(),
        last: new Date().toISOString(),
        city: ''
      });
      s.totalUv++;
      s.daily[today].uv++;
    } else {
      const v = s.visitors.find(v => v.id === visitorKey);
      v.last = new Date().toISOString();
    }
    writeJson(STATS_FILE, s);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true });
  }
});

// 管理员查看统计
app.get('/api/stats', auth, (req, res) => {
  const s = initStats();
  // 只返回最近 30 天的 daily
  const daily = {};
  Object.keys(s.daily).sort().slice(-30).forEach(k => daily[k] = s.daily[k]);
  res.json({
    totalPv: s.totalPv,
    totalUv: s.totalUv,
    daily,
    pages: s.pages,
    visitors: s.visitors.slice(-100)
  });
});

// ===== 时间胶囊 API =====
// 公开创建（无需登录，匿名）
app.post('/api/capsules', (req, res) => {
  try {
    const { from, to, content, unlockAt } = req.body;
    if (!content || !unlockAt) return res.status(400).json({ error: '内容和解锁时间必填' });
    if (content.length > 5000) return res.status(400).json({ error: '内容过长' });
    if (!rateLimit('cap:' + getClientIp(req), 5, 60 * 1000)) {
      return res.status(429).json({ error: '操作太频繁' });
    }
    const unlockTime = new Date(unlockAt).getTime();
    if (isNaN(unlockTime) || unlockTime <= Date.now()) {
      return res.status(400).json({ error: '解锁时间必须晚于现在' });
    }
    const all = readJson(CAPSULES_FILE, []);
    const cap = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      from: (from || '匿名').toString().slice(0, 30),
      to: (to || '未来的你').toString().slice(0, 30),
      content: content.trim(),
      unlockAt: new Date(unlockAt).toISOString(),
      createdAt: new Date().toISOString(),
      opened: false
    };
    all.push(cap);
    writeJson(CAPSULES_FILE, all);
    res.json({ ok: true, id: cap.id, unlockAt: cap.unlockAt });
  } catch (e) {
    res.status(500).json({ error: '创建失败' });
  }
});

// 公开查询：返回所有胶囊（未解锁的不含 content，只显示倒计时元信息）
app.get('/api/capsules', (req, res) => {
  const now = Date.now();
  const all = readJson(CAPSULES_FILE, []);
  const result = all.map(c => {
    const unlocked = new Date(c.unlockAt).getTime() <= now;
    return {
      id: c.id,
      from: c.from,
      to: c.to,
      content: unlocked ? c.content : null,
      unlockAt: c.unlockAt,
      createdAt: c.createdAt,
      unlocked
    };
  });
  res.json({ capsules: result });
});

// 管理员查看全部（必须在 /:id 之前，否则 'all' 会被当作 id 参数）
app.get('/api/capsules/all', auth, (req, res) => {
  res.json({ capsules: readJson(CAPSULES_FILE, []) });
});

// 查询单个胶囊是否解锁
app.get('/api/capsules/:id', (req, res) => {
  const cap = readJson(CAPSULES_FILE, []).find(c => c.id === req.params.id);
  if (!cap) return res.status(404).json({ error: '不存在' });
  const unlocked = new Date(cap.unlockAt).getTime() <= Date.now();
  res.json({
    id: cap.id,
    from: cap.from,
    to: cap.to,
    unlockAt: cap.unlockAt,
    createdAt: cap.createdAt,
    unlocked,
    content: unlocked ? cap.content : null
  });
});

app.delete('/api/capsules/:id', auth, (req, res) => {
  const all = readJson(CAPSULES_FILE, []).filter(c => c.id !== req.params.id);
  writeJson(CAPSULES_FILE, all);
  res.json({ ok: true });
});

// ===== 星空许愿 API =====
app.get('/api/wishes', (req, res) => {
  const all = readJson(WISHES_FILE, []);
  res.json({ wishes: all });
});

app.post('/api/wishes', (req, res) => {
  try {
    const { name, wish, color } = req.body;
    if (!wish || !wish.trim()) return res.status(400).json({ error: '愿望不能为空' });
    if (wish.length > 100) return res.status(400).json({ error: '愿望过长' });
    if (!rateLimit('wish:' + getClientIp(req), 20, 60 * 1000)) {
      return res.status(429).json({ error: '操作太频繁' });
    }
    const all = readJson(WISHES_FILE, []);
    const w = {
      id: Date.now().toString(),
      name: (name || '匿名旅人').toString().slice(0, 20),
      wish: wish.trim(),
      color: (color || '#FFD700').toString().slice(0, 20),
      time: new Date().toISOString()
    };
    all.push(w);
    // 最多保留 500 条避免无限增长
    if (all.length > 500) all.splice(0, all.length - 500);
    writeJson(WISHES_FILE, all);
    res.json({ ok: true, wish: w });
  } catch (e) {
    res.status(500).json({ error: '提交失败' });
  }
});

app.delete('/api/wishes/:id', auth, (req, res) => {
  const all = readJson(WISHES_FILE, []).filter(w => w.id !== req.params.id);
  writeJson(WISHES_FILE, all);
  res.json({ ok: true });
});

app.get('/api/wishes/all', auth, (req, res) => {
  res.json({ wishes: readJson(WISHES_FILE, []) });
});

// ===== 语音留言 API =====
const VOICE_EXT_MAP = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3'
};

app.post('/api/voice/upload', (req, res) => {
  try {
    if (!req.body || !req.body.length) return res.status(400).json({ error: '无音频数据' });
    if (!rateLimit('voice:' + getClientIp(req), 5, 60 * 1000)) {
      return res.status(429).json({ error: '操作太频繁' });
    }
    const ct = req.headers['content-type'] || 'audio/webm';
    const ext = VOICE_EXT_MAP[ct] || 'webm';
    const id = Date.now().toString();
    const filename = id + '.' + ext;
    fs.writeFileSync(path.join(VOICE_DIR, filename), req.body);
    // 元信息
    const meta = readJson(VOICE_META_FILE, []);
    meta.push({
      id,
      filename,
      from: (req.query.from || '匿名').toString().slice(0, 30),
      duration: Math.min(parseInt(req.query.duration) || 0, 600),
      size: req.body.length,
      time: new Date().toISOString(),
      approved: false
    });
    writeJson(VOICE_META_FILE, meta);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: '上传失败' });
  }
});

// 后台手动上传音频文件（管理员，JSON+base64，免依赖 multer）
// body: { from, filename, mime, data(base64) }
app.post('/api/voice/admin-upload', auth, (req, res) => {
  try {
    const { from, filename: origName, mime, data } = req.body || {};
    if (!data) return res.status(400).json({ error: '无音频数据' });
    const ct = mime || 'audio/mp3';
    const ext = VOICE_EXT_MAP[ct] || (origName ? origName.split('.').pop().toLowerCase() : 'mp3');
    const id = Date.now().toString();
    const filename = id + '.' + ext;
    const buf = Buffer.from(data.split(',').pop(), 'base64');
    if (buf.length > 20 * 1024 * 1024) return res.status(413).json({ error: '文件过大（>20MB）' });
    fs.writeFileSync(path.join(VOICE_DIR, filename), buf);
    const meta = readJson(VOICE_META_FILE, []);
    meta.push({
      id,
      filename,
      from: (from || '管理员上传').toString().slice(0, 30),
      duration: 0,
      size: buf.length,
      origName: (origName || '').slice(0, 100),
      time: new Date().toISOString(),
      approved: false  // 上传后默认待审核，管理员可在列表里点"通过"展示
    });
    writeJson(VOICE_META_FILE, meta);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: '上传失败' });
  }
});

// 公开访问：只返回已审核的语音
app.get('/api/voice', (req, res) => {
  const meta = readJson(VOICE_META_FILE, []).filter(m => m.approved);
  res.json({ voices: meta });
});

// 静态语音文件
app.get('/voice/:filename', (req, res) => {
  const f = path.join(VOICE_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(f)) return res.status(404).send('Not found');
  res.sendFile(f);
});

// 管理员查看全部语音
app.get('/api/voice/all', auth, (req, res) => {
  res.json({ voices: readJson(VOICE_META_FILE, []) });
});

app.post('/api/voice/:id/approve', auth, (req, res) => {
  const meta = readJson(VOICE_META_FILE, []);
  const m = meta.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: '不存在' });
  m.approved = req.body.approved !== false;
  writeJson(VOICE_META_FILE, meta);
  res.json({ ok: true });
});

app.delete('/api/voice/:id', auth, (req, res) => {
  const meta = readJson(VOICE_META_FILE, []);
  const m = meta.find(x => x.id === req.params.id);
  if (m) {
    const f = path.join(VOICE_DIR, m.filename);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  writeJson(VOICE_META_FILE, meta.filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

// ===== 纪念日 API =====
// 公开 GET（纪念日不涉密），增删改需鉴权
// 事件结构: { id, type: 'together'|'anniversary'|'birthday'|'custom', title, date(YYYY-MM-DD), desc, yearly(bool) }
app.get('/api/anniversaries', (req, res) => {
  res.json({ events: readJson(ANNIV_FILE, []) });
});

app.post('/api/anniversaries', auth, (req, res) => {
  try {
    const { type, title, date, desc, yearly } = req.body || {};
    if (!title || !date) return res.status(400).json({ error: '请填写标题和日期' });
    const events = readJson(ANNIV_FILE, []);
    const ev = {
      id: Date.now().toString(),
      type: type || 'custom',
      title: String(title).slice(0, 50),
      date: String(date).slice(0, 20),
      desc: String(desc || '').slice(0, 200),
      yearly: !!yearly,
      time: new Date().toISOString()
    };
    events.push(ev);
    writeJson(ANNIV_FILE, events);
    res.json({ ok: true, event: ev });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.put('/api/anniversaries/:id', auth, (req, res) => {
  try {
    const events = readJson(ANNIV_FILE, []);
    const ev = events.find(x => x.id === req.params.id);
    if (!ev) return res.status(404).json({ error: '不存在' });
    const { type, title, date, desc, yearly } = req.body || {};
    if (type !== undefined) ev.type = type;
    if (title !== undefined) ev.title = String(title).slice(0, 50);
    if (date !== undefined) ev.date = String(date).slice(0, 20);
    if (desc !== undefined) ev.desc = String(desc).slice(0, 200);
    if (yearly !== undefined) ev.yearly = !!yearly;
    writeJson(ANNIV_FILE, events);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/anniversaries/:id', auth, (req, res) => {
  const events = readJson(ANNIV_FILE, []).filter(x => x.id !== req.params.id);
  writeJson(ANNIV_FILE, events);
  res.json({ ok: true });
});

// ===== 照片墙 API =====
// 照片存储在 data/gallery/，元数据在 gallery.json
// 上传走 base64 JSON（同语音上传模式，免依赖 multer）
app.get('/api/gallery', (req, res) => {
  res.json({ photos: readJson(GALLERY_FILE, []) });
});

// 静态图片文件访问
app.get('/gallery-img/:filename', (req, res) => {
  const f = path.join(GALLERY_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(f)) return res.status(404).send('Not found');
  res.sendFile(f);
});

// 上传照片：body { filename, mime, data(base64), date, caption }
app.post('/api/gallery', auth, (req, res) => {
  try {
    const { filename: origName, mime, data, date, caption } = req.body || {};
    if (!data) return res.status(400).json({ error: '无图片数据' });
    const ct = mime || 'image/jpeg';
    const ext = IMG_EXT_MAP[ct] || (origName ? origName.split('.').pop().toLowerCase() : 'jpg');
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return res.status(400).json({ error: '不支持的图片格式' });
    }
    const buf = Buffer.from(data.split(',').pop(), 'base64');
    if (buf.length > 15 * 1024 * 1024) return res.status(413).json({ error: '图片过大（>15MB）' });
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const filename = id + '.' + ext;
    fs.writeFileSync(path.join(GALLERY_DIR, filename), buf);
    const photos = readJson(GALLERY_FILE, []);
    const photo = {
      id,
      filename,
      date: date || new Date().toISOString().slice(0, 10),
      caption: String(caption || '').slice(0, 100),
      size: buf.length,
      time: new Date().toISOString()
    };
    photos.push(photo);
    writeJson(GALLERY_FILE, photos);
    res.json({ ok: true, photo });
  } catch (e) {
    res.status(500).json({ error: '上传失败' });
  }
});

// 更新照片描述/日期
app.put('/api/gallery/:id', auth, (req, res) => {
  try {
    const photos = readJson(GALLERY_FILE, []);
    const p = photos.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: '不存在' });
    const { caption, date } = req.body || {};
    if (caption !== undefined) p.caption = String(caption).slice(0, 100);
    if (date !== undefined) p.date = String(date).slice(0, 20);
    writeJson(GALLERY_FILE, photos);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/gallery/:id', auth, (req, res) => {
  const photos = readJson(GALLERY_FILE, []);
  const p = photos.find(x => x.id === req.params.id);
  if (p) {
    const f = path.join(GALLERY_DIR, p.filename);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  writeJson(GALLERY_FILE, photos.filter(x => x.id !== req.params.id));
  res.json({ ok: true });
});

// ===== 共同愿望清单 API =====
// 公开 GET（只返回展示中的项），增删改需鉴权
// 项结构: { id, title, desc, done(bool), doneAt, time }
app.get('/api/bucket-list', (req, res) => {
  res.json({ items: readJson(BUCKET_FILE, []) });
});

app.post('/api/bucket-list', auth, (req, res) => {
  try {
    const { title, desc } = req.body || {};
    if (!title) return res.status(400).json({ error: '请填写标题' });
    const items = readJson(BUCKET_FILE, []);
    const item = {
      id: Date.now().toString(),
      title: String(title).slice(0, 80),
      desc: String(desc || '').slice(0, 200),
      done: false,
      doneAt: null,
      time: new Date().toISOString()
    };
    items.push(item);
    writeJson(BUCKET_FILE, items);
    res.json({ ok: true, item });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.put('/api/bucket-list/:id', auth, (req, res) => {
  try {
    const items = readJson(BUCKET_FILE, []);
    const it = items.find(x => x.id === req.params.id);
    if (!it) return res.status(404).json({ error: '不存在' });
    const { title, desc, done } = req.body || {};
    if (title !== undefined) it.title = String(title).slice(0, 80);
    if (desc !== undefined) it.desc = String(desc).slice(0, 200);
    if (done !== undefined) {
      it.done = !!done;
      it.doneAt = done ? new Date().toISOString() : null;
    }
    writeJson(BUCKET_FILE, items);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

app.delete('/api/bucket-list/:id', auth, (req, res) => {
  const items = readJson(BUCKET_FILE, []).filter(x => x.id !== req.params.id);
  writeJson(BUCKET_FILE, items);
  res.json({ ok: true });
});

// ===== 君子协定 API =====
// 支持中英文双语：titleEn / contentEn 为英文版字段
app.get('/api/agreement', (req, res) => {
  const data = readJson(AGREEMENT_FILE, {
    title: '君子协定', content: '',
    titleEn: "Gentleman's Agreement", contentEn: '',
    updatedAt: null
  });
  // 兼容旧数据：若没有 En 字段，补默认值
  if (!data.titleEn) data.titleEn = "Gentleman's Agreement";
  if (!data.contentEn) data.contentEn = '';
  res.json(data);
});

app.post('/api/agreement', auth, (req, res) => {
  try {
    const { title, content, titleEn, contentEn } = req.body;
    // 读取旧数据，保留未提交的字段
    const old = readJson(AGREEMENT_FILE, {});
    const data = {
      title: (title != null ? title : old.title || '君子协定').toString().slice(0, 200),
      content: (content != null ? content : old.content || '').toString(),
      titleEn: (titleEn != null ? titleEn : old.titleEn || "Gentleman's Agreement").toString().slice(0, 200),
      contentEn: (contentEn != null ? contentEn : old.contentEn || '').toString(),
      updatedAt: new Date().toISOString()
    };
    writeJson(AGREEMENT_FILE, data);
    res.json({ ok: true, updatedAt: data.updatedAt });
  } catch (e) {
    res.status(500).json({ error: '保存失败' });
  }
});

// ===== SPA 路由 =====
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/lover', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lover.html'));
});

app.get('/capsule', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'capsule.html'));
});

app.get('/stars', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stars.html'));
});

app.get('/anniversary', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'anniversary.html'));
});

app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

app.get('/bucket-list', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bucket-list.html'));
});

app.get('/agreement', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agreement.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Love site running on http://127.0.0.1:${PORT}`);
});
