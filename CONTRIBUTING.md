# 贡献指南

感谢你对 MyLove 感兴趣！无论你是发现了 Bug、有功能建议，还是想提交代码，都欢迎参与。

## 🐛 报告问题

如果你遇到了问题，请先检查是否已有 [Issues](https://github.com/lcrworld-jtl/love/issues) 中提过。如果还没有，请新建一个 Issue，描述清楚：

- 问题是什么
- 如何复现
- 期望的行为
- 实际的行为
- 截图或报错信息（如果有）

## 💡 功能建议

欢迎提交新功能想法。在 Issue 中描述清楚你想加什么功能、为什么有用、以及可能的实现思路。

## 🔧 提交代码

1. Fork 本仓库
2. 创建一个新分支：`git checkout -b feat/your-feature-name`
3. 提交你的改动
4. 推送到你的分支：`git push origin feat/your-feature-name`
5. 提交 Pull Request

### 提交规范

commit message 请遵循以下格式：

```
<type>: <简短描述>

<详细说明（可选）>
```

type 可以是：

- `feat` — 新功能
- `fix` — 修复 Bug
- `docs` — 文档变更
- `style` — 代码风格调整（不影响功能）
- `refactor` — 重构（不新增功能也不修 Bug）
- `perf` — 性能优化
- `chore` — 构建/工具/依赖变更

## 🧪 本地开发

```bash
# 克隆
git clone https://github.com/lcrworld-jtl/love.git
cd love

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env
# 编辑 .env，填入 ADMIN_PASSWORD 和 PLAYLIST_ID

# 启动
npm start
```

项目结构见 [README.md](./README.md)。

## 📝 注意事项

- 本项目是个人项目，代码风格可能比较随意。提交代码前请尽量保持风格一致。
- 不要提交真实数据（如 content.json、.env 等）。
- 君子协议页面内容、用户生成的数据不在开源范围内。
- 如果你改了前端代码，请确保在主流浏览器中测试过。

## 🤝 行为准则

保持友善，保持尊重。代码审查是对事不对人。

---

感谢你的贡献。