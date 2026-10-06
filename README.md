# pm-forge · 代码地基工程

[![CI](https://github.com/YHLLXY/pm-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/YHLLXY/pm-forge/actions/workflows/ci.yml)

数据驱动 PM 的个人工程底座：数据分析 → AI 工具 → 作品集站点。

## 这是什么

面向 **AI 产品经理求职**的作品集工程（2027 秋招主线）：不是「作品集页面」这一个静态物，而是一条把真实工作方式展示出来的流水线——数据可复算、结论可溯源、质量有门禁、发布走流程。板块对应面试五考点：

| 板块 | 考点 | 入口 |
|---|---|---|
| M1 分析线 | 数据分析能力 | [数据分析](https://www.yuhailinlxy.com/analysis/) |
| A2 工具箱 | AI 落地与评测 | [toolbox.yuhailinlxy.com](https://toolbox.yuhailinlxy.com) |
| A1 拆解 | 模型评估与伦理风险 | [AI 产品拆解](https://www.yuhailinlxy.com/dissections/) |
| B 数据故事 | 数据叙事 + 前端工程 | [浏览器内复算](https://www.yuhailinlxy.com/data-stories/userbehavior/) |
| C 写作（2027-01 启动） | 工程判断与合规 | 待启动 |

面试官快速入口：[面试官指南](https://www.yuhailinlxy.com/interviewers/)（五考点映射 + 核验方式，15 分钟版）。

> 2026-09-27 起本仓库位于 `C:\dev\pm-forge`（NTFS）。原位置 `E:\homework\开发\pm-forge` 为 exFAT，
> 其 readlink 语义异常会导致 Next/Astro 构建失败，已整体迁移；E 盘仅留本说明的指针文件。

## 文件结构
- site/ 作品集站点（M3，Astro 7 · AstroPaper 基座）
- toolkit/ AI PM 工具箱（M2，Next.js）
- analysis/ 数据分析（M1，uv + DuckDB + Quarto）
- vault-tools/ Obsidian 自动化（M4，只读巡检）
- evals/ toolkit 评测门禁（二期 A2，uv + pytest，零依赖核心）
- shared/templates/ 共享模板
- docs/ 设计（specs）、任务卡（plans）、状态（STATUS.md）
- .github/workflows/ci.yml CI 矩阵：site（astro build + 内容/死链检查）· toolkit（vitest + next build）· python 三模块 pytest（evals 只跑 fixture 测试，不花钱）

## site · 作品集站点（M3）

Astro 7 + Tailwind 4（AstroPaper v6.1.0 基座，上游 35cfa7f）。七板块：**首页**（定位语+精选）、**案例研究**（四篇四段式案例，构建期强制结构检查）、**数据分析**（M1 报告 + Quarto 全文内嵌）、**AI 产品拆解**（30 条实测 + 三篇报告，判定分布由门禁机械核对）、**数据故事**（浏览器内 DuckDB 复算）、**工具箱**（M2 介绍 + 六份报告）、**关于**；另设[面试官指南](https://www.yuhailinlxy.com/interviewers/)。

```bash
cd site
npm install        # npmmirror 源
npm run dev        # http://localhost:4321
npm run build      # astro check + 构建 + 四段式检查 + 死链检查
npm run lh         # Lighthouse 移动端验收（四类 ≥90）
```

- **写一篇案例**：在 `site/src/content/case-studies/` 新建 md，frontmatter 带 projectRole/stack/metrics（或 resultsNote），正文四段式 H2；结构不合规构建直接失败。
- **全文 RSS**：`/rss.xml` 聚合三集合输出全文（content:encoded，根相对链接自动绝对化）；构建链含 `check:rss` 校验（结构/全文/非绝对链接断言）。
- **结构化数据**：全站注入 WebSite/Person JSON-LD，文章页叠加 BlogPosting；构建链含 `check:ld` 校验（合法性 + 必需属性断言）。
- **站内搜索**：Pagefind 1.5.2 构建期索引（`pagefind --site dist`），header 放大镜图标 → `/search/`，检索全浏览器本地、零第三方请求；中文验收词「幻觉 / RFM / 个人工作台」实测命中。
- **国内适配**：无 Google Fonts（系统 CJK 栈）、无动态 OG（静态 og-default.png）。
- **部署**：Vercel Root Directory = site，域名 `yuhailinlxy.com`（A 记录钉 IP，同 toolkit 方案）。
- 改造清单见 `site/README.md`。

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
- **已上线**：https://toolbox.yuhailinlxy.com （Vercel 部署，Root Directory = toolkit；环境变量 LLM_API_KEY）。国内直连要点：CNAME 会被随机解析到被 GFW 封锁的 Vercel IP，故解析层用**两条 A 记录**钉死可用 IP（76.76.21.21 + 64.29.17.65）；若这批 IP 也被封，后手是 Cloudflare 代理。Vercel 面板可能因非 CNAME 接法显示 Invalid Configuration，功能无影响。
- 浏览器安装（仅 e2e 首次）：`PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/ npx playwright install chromium`

## 更新日志
- 2026-10-06 v0.11: **二期 A1+B 双线上线**——AI 产品拆解板块（章程 v2.1 + 30 条实测记录 + 三篇报告，判定分布由构建门禁机械核对）；数据故事《九日谈》（DuckDB-WASM 浏览器内复算 + 受限查询框 + 移动端降级，Playwright 双门禁 + 体积门禁）；check-dissections 第七条门禁（报告数字 ↔ 记录集合一致性）；面试官指南页 + 求职素材库（docs/interview/）
- 2026-10-02 v0.10: **二期 E 基建小包完成**——GitHub Actions CI 三 job 矩阵（site/toolkit/python，evals 只跑 fixture 不花钱）全绿；站内搜索复活（Pagefind 1.5.2 构建期索引 + 自研 /search 页 + header 图标入口，中文验收词实测命中，检索零第三方请求）；RSS 升级全文输出（content:encoded + 链接绝对化 + 构建期校验）；WebSite/Person/BlogPosting JSON-LD 全站注入 + 构建期校验；Lighthouse 七页全过。npm audit 全仓盘点（site 0，toolkit 2 = next 内嵌 postcss，Next 16 专项调研入 ISSUES #13）
- 2026-09-29 v0.9: **二期 A2 完成：evals 门禁**——evals 模块建成（零依赖 Python + uv，95 pytest 全绿）：66 条真实任务评测集（基础/复杂/边界三档）+ 确定性结构检查（JSON 契约/quotes 逐字/六章结构）+ LLM-as-judge 四维评分（温度 0、model 字符串留痕、畸形响应重试）+ 人工盲评校准（32 对，±1 一致 84%）+ 基线回归 CLI（validate/run/regress/calibrate/report/mark-baseline）；基线 66/66 ok（judge 成本约 2-3 元）；《evals 计划》与基线报告发布进 site（toolkitReports 扩 evals 枚举）；同期二期 spec（评测线/交互报告/基建/方法论文库）落盘
- 2026-09-28 v0.8: **M3 完成**——作品集站建成（AstroPaper 基座 + 三内容集合 + 五板块），四篇案例（工作台/情侣 App/AgriAgent/红岩群面复盘）、M1 报告接入、三份工具精选报告发布（验收②收尾）；Lighthouse 移动端性能全 100、四类 ≥95；四段式与死链检查入构建
- 2026-09-27 v0.7: **M2 验收全部达成**——三份真实 LLM 报告产出（DeepSeek）；工具箱上线 https://toolbox.yuhailinlxy.com（GFW 排障：CNAME 随机命中被墙 IP → 改 A 记录钉死可用 IP，实测 20/20 全通）
- 2026-09-27 v0.6: **M2 v1 完成**——三工具全链路（竞品分析/反馈洞察/PRD 草稿），52 vitest + 3 Playwright e2e 全绿；token 守卫、演示模式、证据链标注、优先级矩阵；真实 LLM 冒烟脚本就绪（等 key）
- 2026-09-27 v0.5: M2 启动——仓库迁移 exFAT→NTFS（C:\dev\pm-forge）；toolkit 脚手架（Next 15.5.26 + React 19 + vitest 5），字体改 geist 本地包规避 Google Fonts 被墙
- 2026-09-27 v0.4: 案例一真实数据跑通定稿——脏数据清洗+用户级采样+采样可复现修复（13 测试），报告含 4 条数据支撑结论
- 2026-09-27 v0.3: Quarto 1.10.18 免管理员安装（msiexec /a 提取）；案例一渲染验证通过（HTML 30KB）；sample_events 自动建父目录，10 测试全绿
- 2026-09-26 v0.2: M0 完成（准则/模板/交接协议/vault 门户口）；M1 analysis 模块 ingest/metrics/funnel/rfm 9 测试全绿；案例一报告骨架与复现脚本就绪
- 2026-09-26 v0.1: 仓库初始化，spec 与 M0+M1 计划入库
