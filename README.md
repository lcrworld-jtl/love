# MyLove 💗

> 喜欢不一定要拥有。但有些东西，值得被记住。

[![GitHub](https://img.shields.io/badge/GitHub-lcrworld--jtl%2Flove-181717?logo=github)](https://github.com/lcrworld-jtl/love)
[![Gitee](https://img.shields.io/badge/Gitee-lcrworld%2Flove-C71D23?logo=gitee)](https://gitee.com/lcrworld/love)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

这是一个关于爱的网站。

不是那种千篇一律的情侣主页模板——它是我一行一行写出来的，从恋爱观到时间胶囊，从星空许愿到君子协议。每一行代码背后，都有一个想要被珍藏的瞬间。

如果你也有些话想说、有些事想记、有些人想放在心里特别的位置，也许它会适合你。

## ✨ 这里面有什么

- **💌 首页** — 写下你的恋爱观、好感量化表、原则和碎碎念。不是给别人看的，是给自己看的。
- **💑 恋人页** — 为那个特别的人建一个专属页面：音乐播放器、恋爱计时器、时间线、相册。
- **⏳ 时间胶囊** — 写一封信给未来的你们，设定解锁时间，到日子了才能打开。
- **🌟 星空许愿** — Three.js 粒子星空，对着流星许个愿吧。
- **📅 纪念日倒计时** — 下一个重要的日子还有多久？时刻记着。
- **📷 照片墙** — 把在一起的瞬间都挂上去。
- **📋 愿望清单** — 一起想做的事，一件一件来。
- **📜 君子协议** — 写下你们之间的约定。（内容不随项目开源，留给每对情侣自己定义。）
- **🌸 樱花飘落** — 整站樱花飘落动效，点击屏幕会冒出爱心。
- **📲 PWA 支持** — 可以添加到手机主屏幕，像 App 一样使用，支持离线访问。
- **🔍 SEO 优化** — robots.txt、sitemap.xml、结构化数据、Open Graph，该有的都有。
- **🛡️ 管理后台** — 可视化管理所有内容，不用碰代码。

## 🌸 在线预览

👉 [love.lcrworld.xyz](https://love.lcrworld.xyz)

## 🚀 自己搭一个

```bash
# 克隆仓库（GitHub）
git clone https://github.com/lcrworld-jtl/love.git
# 或克隆仓库（Gitee）
# git clone https://gitee.com/lcrworld/love.git

cd love

# 安装依赖
npm install

# 启动
npm start
```

打开 `http://localhost:3009` 就能看到你的站点了。

## ⚙️ 配置

复制 `.env.example` 为 `.env`，按需修改：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3009` |
| `ADMIN_PASSWORD` | 管理后台密码（必填） | 无默认值，必须设置 |
| `NETEASE_API` | 网易云 API 地址（音乐播放器用） | `http://127.0.0.1:3002` |
| `PLAYLIST_ID` | 网易云歌单 ID | 空（不启用音乐） |
| `SITE_URL` | 站点域名（SEO 用） | `http://localhost:3009` |

> 音乐播放器需要配合 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 使用。不需要的话留空即可，不影响其他功能。

## 📁 项目结构

```
love/
├── public/                 # 前端文件
│   ├── css/style.css       # 全站样式
│   ├── js/                 # 脚本
│   │   ├── app.js          # 首页逻辑
│   │   ├── widgets.js      # 留言墙 / 语音 / 打字机情书
│   │   ├── stars.js        # Three.js 星空粒子
│   │   ├── capsule.js      # 时间胶囊
│   │   ├── gallery.js      # 照片墙
│   │   ├── anniversary.js  # 纪念日倒计时
│   │   ├── bucket-list.js  # 愿望清单
│   │   ├── music-player.js # 音乐播放器
│   │   ├── sakura.js       # 樱花飘落
│   │   ├── click-effect.js # 点击爱心
│   │   ├── gesture.js      # 手势交互
│   │   └── common.js       # 公共工具函数
│   ├── admin/              # 管理后台
│   ├── index.html          # 首页
│   ├── lover.html          # 恋人页
│   ├── capsule.html        # 时间胶囊
│   ├── stars.html          # 星空许愿
│   ├── anniversary.html    # 纪念日
│   ├── gallery.html        # 照片墙
│   ├── bucket-list.html    # 愿望清单
│   ├── agreement.html      # 君子协议
│   ├── service-worker.js   # PWA 离线缓存
│   └── manifest.json       # PWA 清单
├── data/                   # 数据文件（运行时自动创建）
├── server.js               # 后端服务（Express）
├── package.json
├── .env.example            # 配置模板
└── README.md
```

## 📝 关于数据

所有数据存储在 `data/` 目录下的 JSON 文件中，无需数据库。首次启动时自动创建。

| 文件 | 说明 |
|------|------|
| `content.json` | 首页内容（恋爱观、量化表、原则等） |
| `messages.json` | 留言墙（访客提交，需审核） |
| `capsules.json` | 时间胶囊 |
| `wishes.json` | 星空许愿 |
| `stats.json` | 访问统计 |
| `applications.json` | 恋人申请 |
| `anniversaries.json` | 纪念日事件 |
| `gallery.json` | 照片墙元数据 |
| `bucket_list.json` | 愿望清单 |
| `agreement.json` | 君子协议（不随项目开源） |

> 用户生成的数据（留言、胶囊、愿望等）和君子协议内容不在开源范围内。
> 仓库中不含任何真实数据，请放心使用。

## 🌐 部署

推荐使用 PM2：

```bash
npm install -g pm2
pm2 start server.js --name mylove
pm2 save
pm2 startup
```

配合 Nginx 反向代理即可上线。记得配置 SSL 证书（推荐 [certbot](https://certbot.eff.org/)）。

Nginx 参考配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传体积
    client_max_body_size 25m;
}
```

## 🛠️ 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript（无框架依赖）
- **3D**：Three.js（星空粒子效果）
- **PWA**：Service Worker + Web App Manifest
- **存储**：JSON 文件（无需数据库）

## 🙏 开源致谢

### 星空许愿

星空许愿页面的粒子星云算法参考了以下开源项目：

- **[z2586300277/three-cesium-examples](https://github.com/z2586300277/three-cesium-examples)**（Apache License 2.0）— 15 万粒子星云生成算法、GLSL 粒子流动着色器，均参考自该项目的 `PlanetParticle.html` 示例
- **[Three.js 官方示例 — Planets/Atmosphere](https://threejs.org/examples/Planets/Atmosphere.html)**（MIT）— 行星大气层光晕的 Fresnel Shader 算法参考

感谢这些项目的作者，让这片星河得以闪耀。

## 📄 开源协议

[MIT License](./LICENSE)

你可以自由使用、修改、分发本项目。只需保留版权声明。

> 君子协议页面内容、用户生成的数据不在开源范围内。

## 💬 写在最后


这个网站不是什么了不起的东西。它只是一个容器，装一些也许微不足道、但对当事人来说重若千钧的小事。

如果你用了它，希望它能帮你记住一些美好的东西。

如果有一天你们分开了，也没关系。那些回忆是真的，这就够了。


---

*如果这个项目对你有帮助，给个 ⭐ Star 就好。不点赞也没关系，祝你开心。*
