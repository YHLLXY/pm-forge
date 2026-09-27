# pm-forge · 代码地基工程

数据驱动 PM 的个人工程底座：数据分析 → AI 工具 → 作品集站点。

> 2026-09-27 起本仓库位于 `C:\dev\pm-forge`（NTFS）。原位置 `E:\homework\开发\pm-forge` 为 exFAT，
> 其 readlink 语义异常会导致 Next/Astro 构建失败，已整体迁移；E 盘仅留本说明的指针文件。

## 文件结构
- site/ 作品集站点（M3，Astro）
- toolkit/ AI PM 工具箱（M2，Next.js）
- analysis/ 数据分析（M1，uv + DuckDB + Quarto）
- vault-tools/ Obsidian 自动化（M4，只读巡检）
- shared/templates/ 共享模板
- docs/ 设计（specs）、任务卡（plans）、状态（STATUS.md）

## toolkit · AI PM 工具箱（M2）

Next.js 15 + React 19 Web 应用。三工具：**竞品分析**（证据链标注六章报告）、**用户反馈洞察**（主题聚类 + 优先级矩阵）、**PRD 草稿**（模板驱动 + 【待补充】标注）。

```bash
cd toolkit
npm install            # npmmirror 源
cp .env.example .env   # 填 LLM_API_KEY（默认 DeepSeek，国内直连；GLM 见 .env 注释）
npm run dev            # http://localhost:3000
npm test               # vitest 单测/组件测试
npm run test:e2e       # Playwright 端到端（自动以 MOCK_LLM=1 启动 dev server）
npm run smoke:real     # 真实 LLM 冒烟：三工具各产 1 份报告到 toolkit/artifacts/（需 .env 有 key）
```

- **演示模式**：未配 Key 或 `MOCK_LLM=1` 时自动启用（固定样例输出），用于开发/测试/无 Key 演示。
- **Token 守卫**：估算输入超上限（默认 8000）时服务端拒绝，需用户在页面显式确认才继续。
- **部署（Vercel）**：新建项目时 Root Directory 选 `toolkit`；环境变量配 `LLM_API_KEY` 等（见 .env.example）；`*.vercel.app` 国内被墙，需绑定自定义域名（用户操作项）。
- 浏览器安装（仅 e2e 首次）：`PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npx playwright install chromium`

## 更新日志
- 2026-09-27 v0.5: M2 启动——仓库迁移 exFAT→NTFS（C:\dev\pm-forge）；toolkit 脚手架（Next 15.5.26 + React 19 + vitest 5），字体改 geist 本地包规避 Google Fonts 被墙
- 2026-09-27 v0.4: 案例一真实数据跑通定稿——脏数据清洗+用户级采样+采样可复现修复（13 测试），报告含 4 条数据支撑结论
- 2026-09-27 v0.3: Quarto 1.10.18 免管理员安装（msiexec /a 提取）；案例一渲染验证通过（HTML 30KB）；sample_events 自动建父目录，10 测试全绿
- 2026-09-26 v0.2: M0 完成（准则/模板/交接协议/vault 门户口）；M1 analysis 模块 ingest/metrics/funnel/rfm 9 测试全绿；案例一报告骨架与复现脚本就绪
- 2026-09-26 v0.1: 仓库初始化，spec 与 M0+M1 计划入库
