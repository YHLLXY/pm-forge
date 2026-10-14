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

Astro 7 + Tailwind 4（AstroPaper v6.1.0 基座，上游 35cfa7f）。七板块：**首页**（定位语+精选）、**案例研究**（四篇四段式案例，构建期强制结构检查）、**数据分析**（M1 报告 + Quarto 全文内嵌）、**AI 产品拆解**（40 条实测 + 四篇报告，判定分布由门禁机械核对）、**数据故事**（浏览器内 DuckDB 复算）、**工具箱**（M2 介绍 + 六份报告）、**关于**；另设[面试官指南](https://www.yuhailinlxy.com/interviewers/)。

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

Next.js 16 + React 19 Web 应用。三工具：**竞品分析**（证据链标注六章报告）、**用户反馈洞察**（主题聚类 + 优先级矩阵）、**PRD 草稿**（模板驱动 + 【待补充】标注）。

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
- 2026-10-14 v0.20: **外链域名落地 + 门禁补做**——13 天未收口的那条外链修好了，顺带补上一个「文档里写了、代码里没有」的门禁。
①**用户绑 `workbench.yuhailinlxy.com`**（Vercel 给 `personal-workbench` 项目加域名 + 阿里云两条 A 记录 `76.76.21.21` / `64.29.17.65`，**不用 CNAME**）；本机复测 DNS 正确、HTTPS **10/10 = 200**、SPA 深路由全 200、`/api/check-reminders` 401 符合预期、`www`/`toolbox` 未受影响。
②**根因实锤**：`*.vercel.app` 不是「偶尔连不上」而是**整片域被 DNS 污染**（`pm-forge-rose` 解析到 `31.13.94.23` = Facebook 网段、`vercel.app` 根域 → `128.242.240.189`、目标域 SERVFAIL），**唯一解法就是绑自定义域名**。
③案例页 `links.live` 与正文换链，**删掉已不成立的「国内直连需代理」标注**。
④**补做 `check-links.mjs` 的 `*.vercel.app` 禁令**（49 → 70 行）：另开一趟**不套 `SKIP`** 的扫描——原正则把一切外链显式跳过，这正是缺陷 13 天没被抓到的原因；**用改动前的真实旧 `dist` 验证能红**（2 条命中、退出码 1），重建转绿。
⑤更正 `docs/门禁体检.md` / `docs/lessons-learned.md` 里「已折进 check-links」的**假声明**（与 D1 指针文件是同一失效模式、同轮犯了两次），补完实施计划 §6 的 Task 3/4/5 并新增 §7。全量构建 **0 错 / 28 页 / 10 门禁全绿**。
- 2026-10-13 v0.19: **外部评审核实与修正**——外部 AI 对项目提出 5 条建议，逐条核实后：**4 条已过时**（它读到的是调研文档、没读到代码，因为它被「仓库不在工作区」绊倒），**1 条部分属实**；核实过程另发现 2 个真实缺陷。①**兑现一个 16 天前就该兑现的承诺**：迁移 commit `47dc1b9` 的 README 写明「E 盘仅留本说明的指针文件」，实测从未创建——这正是外部读者把「找不到仓库」误判成「代码丢了」的直接原因，已在旧位置补上指针 README（首行即声明此处无代码）。②**工作区指路**：`E:\homework\“余粮”项目` 不是仓库，其 `docs/` 里 **15 个 md / 151 处** `site/src/...` 是**仓库相对**路径；该工作区此前无任何 README 说明这点，也没人知道它还存着一份**已过期**的计划副本（本地 19119B vs 仓库 19726B）。③**调研文档归档入库**：仓库此前没有 `docs/research/`，631KB 调研（含右栏 7 篇系列）只存在于 exFAT 的 E 盘、**无 git 无备份**；现收入 35 个文件 / 985KB，含**可复现的测量脚本**（`measure*.mjs`/`probe*.mjs`）与原始 JSON 证据；6.3MB 截图不入库（实测 0 份文档引用）。④**门禁体检**（`docs/门禁体检.md`）：用实测回答「门禁太多」——10 个门禁共 **775 行、串行 3114ms**（约构建的 3%），并如实标注**只有 3 个有「红过」的记录**；顺带发现 `check-dissections` 的隐私人名词表子项在本机**降级运行**（词表缺失只 `warn` 不 `fail`，而 `site/.gitignore:5` 对 `out/` 的忽略是正确的、从未误跟踪）。⑤**明确记录「哪些建议不做」**：不把代码「恢复」回 E 盘（exFAT 会让构建必然失败）、不停止调研（右栏代码早已上线）、不重复部署（已 200）、不为 `debug.log` 做「排查」（是本机无头探测残渣）。
- 2026-10-12 v0.18: **详情页桌面右栏 + 正文长度单位修正**——18 个详情页（案例研究 5 / 数据分析 2 / AI 拆解 4 + 章程 1 / 工具箱报告 6）原本是「正文左对齐锁在 638px，右侧恒定空出 466px（占容器 42%，1280/1440/1600/1920 四个视口分毫不差）」，现在改为 `DetailColumns` 两栏：**左侧正文列 + 右侧 384px 粘性栏**（1024–1279 为 320px）。右栏只搬既有内容、不新增任何数据：案例研究放目录 + 角色/技术栈 + 在线访问/源码 + 指标卡；拆解放目录 + 被测产品/评测口径 + 版本口径；数据分析放目录 + 数据集；工具报告只有目录；正文后 4 个手写小节（任务实测/失败案例库/边界能力清单/四维均分）加了 id 并进目录。
  ①**正文长度单位 ch 改 em**：`max-w-readable` 由 `68ch` 改 `40em`。`ch` 是西文数字 "0" 的前进宽度，实测同一份 68ch 在 10 种字体栈间摆动 **586.5–638.0px（8.8%）**；`40em` = 每行**整 40 个汉字**，同时满足 W3C clreq 7.1.1.4「行长宜为字号整数倍」与日文 jlreq 2.4.2 的 40 字上限（1440 实测恰好 640px）。**刻意不加宽正文**——现状 638px 已是 39.9 字，clreq 参考区间上限与 jlreq 上限都在 40 字。
  ②**右栏目录**：数据来自构建期 `render(entry).headings`（**不在浏览器里读 `textContent`**——`addHeadingLinks()` 已给每个 h2 注入了含 `#` 的锚链，读文本会带上 `#`）；当前项用**颜色 + 字重 + 左侧竖条**三个通道（竖条走 `box-shadow`，不占布局、状态切换零重排），满足 WCAG 1.4.1「不能只靠颜色传达信息」；点击后 800ms 抑制位挡住平滑滚动途中的中间态闪烁；窄屏一行 DOM 查询都不做（matchMedia 守卫）。
  ③**新增 `check-toc.mjs` 构建门禁**：`check-links.mjs` 的 SKIP 正则把 `href="#..."` 整个跳过，站内锚点从来不校验，而目录是构建期生成的、改 Markdown 标题就会漂移。门禁双向断言（目录里每个锚点必须命中本页 id / 每个详情页必须有目录），当前 **18 个页面 / 122 条锚点**。**两次反向验证都实测跑过**：把组件 `href` 临时改成 `--mutated` → 25 行「找不到 id」（5 页 × 5 条）；还原后 → 0 行。门禁挂进 build 链的时机**推迟到最后一类页面接线之后**（正向断言要求 18 页全有目录，提前挂会让构建一路红）。
  ④**新增 `npm run check:rail` 手动验收**（不进构建链，同 `check:spa-revisit`/`check:reduce` 性质）：10 条断言覆盖五视口栅格数字、sticky（`aside.rect.top === 96`）、`[aria-current]` 全页唯一、当前项计算样式与默认项确有差异（防「类名空转」）、点击第 3 条后的唯一性、390 窄屏隔离、**窄屏几何与改动前基线逐项相等**、矮视口右栏不超视口；`--shots` 额外输出 5 张验收图。同期给 `check:reduce-motion.mjs` 补上目录过渡的复测（原来只探列表页，目录在详情页上，新动效根本没被覆盖）。
  ⑤**摘掉 `remarkToc`/`remarkCollapse`**：这两位会在正文里匹配 `## Contents` / `## TOC`（大小写不敏感）自动生成一份**正文内目录**并包进英文 `details/summary`（summary 文案 `Open Table of contents`），与右栏重复；实测 19 个内容文件 / 109 个标题命中 0，纯惰性，但本期正式引入目录正是它会咬人的时刻。
  ⑥**窄屏（<1024px）逐像素不变已实测**，不是推断：390 与 768 两个视口 × 7 条稳定选择器的几何四元组与「只改完第 ① 项、页面 DOM 还没动」时的基线逐项相等（唯一例外 `#btt-btn-container` 是 sticky+float，scrollY=0 时它 `opacity:0` 且受包含块钳制，已改测可见滚动位置下的视口坐标）。**桌面端会一并出现的三处次要变化是有意为之**：`<hr>`、底部标签、回到顶部按钮由容器宽（1088px）收进正文列（640px）——回到顶部按钮因此不再压在右栏上。
  ⑦留了两条**有意不改**的：`max-w-headline`（46ch）与 `max-w-deck`（52ch）同属 ch 单位的病但那是标题/导语（clreq 的行长整数倍规则不适用于标题），`dissections/charter` 的目录条数不会自动等于 h2 数。都记进了 `docs/ISSUES.md`。
- 2026-10-09 v0.17: **逐页 OG 分享图**——27 个页面原本共用同一张旧蓝 `#006cac` 的 `og-default.png`，现在每个详情页有自己的 1200×630 分享卡（板块色竖条 + kicker/日期 + 大标题 + 描述 + 底排统计 + 域名，视觉语言与站点封面同族）。路线是**本地生成 + 产物入库 + 陈旧门禁**（`npm run og` → `public/og/*.png` + `manifest.json`；**不把 satori/resvg 放进部署链**，那正是当初拆掉动态 OG 的原因）。新增 `check-og.mjs` 门禁：陈旧检测 / PNG 签名与 **IHDR 读回宽高** / 每页 `og:image` 恰好一个且指向存在的本地文件 / `og:image:alt` 非空。顺修 `config.ts` 的 `default-og.jpg` 死回退陷阱、补齐 `og:image:type/width/height/alt` 与 `twitter:image:alt`、修好文章页 JSON-LD 里被 `JSON.stringify` 丢掉的 `image` 键；删掉已被取代的 Playwright 模板 `scripts/og-template.html`。**改了任何标题/描述/metrics 都必须重跑 `npm run og`**（否则门禁红）。
- 2026-10-09 v0.16: **详情页版头 + 首页证据面板 + 克制微动效**——①新增 `EntryHeader`，四类详情页统一为「板块色 kicker → h1 → deck → 日期 → banner 封面」；`Cover` 增加 `banner` 变体（**独立 viewBox 1120×420，不做拉伸**；<640px 回落 card 几何——1120 宽缩到手机只剩 0.35 倍，kicker/日期/标签会糊）；正文阅读宽度口径归一 68ch。②首页 hero 改 12 栅格（左 7 / 右 5），右栏接**真实数据证据面板**：5 项数字 + 判定分布 + 最近更新，全部构建期从内容集合统计，新增 `check-home-metrics.mjs` 用**另一份独立实现**重算，对不上就让构建失败。③`Card` 的 hover 反馈补齐到键盘 `focus-visible`（2px 上浮 + 阴影 + 标题变色，`motion-safe` 门控）、标题全局 `text-wrap: balance`、prefetch 默认值显式化。**顺修 v0.14 一个真实缺陷**：`--shadow-*` 从未注册进 Tailwind 命名空间，`shadow-1`/`hover:shadow-2` 全是空类（产物里 `.shadow-1` 命中 0），卡片阴影从来没生效过；另修三篇工具报告正文多余的第二个 `<h1>`（被新增的 `check-headings.mjs` 抓出来）。
- 2026-10-09 v0.15: **修 P0：ClientRouter 脚本只执行一次，二次站内跳转静默失效**——`<ClientRouter />` 下「打包后的模块脚本只执行一次」（Astro 官方文档 Script re-execution；`astro@7.3.5` 的 `transitions/swap-functions.js:29-45` 用 `script.src`/`textContent` 做去重键，`router.js:82-98` 跳过带 `data-astro-exec` 的脚本），而搜索页与数据故事页的初始化逻辑都写在模块顶层 → **第二次**站内跳转进入时脚本整段被跳过：搜索框长得正常、也能打字，却一个字都搜不出来，且控制台零报错（线上实测首访 22 个 pagefind 请求 / 二访 0 请求 0 结果 0 报错）。修复=两页初始化包成 `initSearch()`/`initStory()` 并挂 `astro:page-load`，故事页另在 `before-swap` 里 `disconnect()`/`destroy()` 释放 IO 与 scrollama、`engineReady` 提到模块级复用 WASM；顺补两处 reduced-motion 缺口（`::view-transition-*` 关停 + `scroll-behavior` 的 reduce 门——实测 Astro 自带的 viewtransitions.css 没进本仓构建产物，跑的是 UA 默认根交叉淡入淡出）；新增 `scripts/check-spa-revisit.mjs` 手动验收脚本（真实浏览器：搜索页三访 + 故事页二访），修复前对线上跑出红、修复后本地跑出绿
- 2026-10-09 v0.14: **视觉美化（第一批 + 第二批）**——暖米白底 + 表面分层 token（`--surface-1/2`、柔和阴影）+ 五个板块识别色；版心 768 → 1120px，列表页改双列网格；全站数字等宽（`tabular-nums`）；**新增数据驱动封面卡片**：列表条目按各自真实数据生成内联 SVG 封面（案例取 metrics、拆解取 recordCount 与判定分布、工具报告取 promptName/promptVersion），随主题自适应、零网络请求、无新依赖；顺修两处既有缺陷：案例/数据列表页 `h1 → h3` 跳级（a11y），首屏标题在宽版心下的孤字换行
- 2026-10-07 v0.13: **B 线体验增强 + P2 清库**——数据故事七张图表 hover 提示（Plot tip 内建通道，暗色主题配色走 CSS 变量）；新增第七节「用户分层：RFM 在这份数据上只剩 R」（q11/q12 构建期预置 + pandas 交叉验证扩展覆盖，查询框顺延第八节）；工具箱三卡真截图（本地 mock 演示样例一次性脚本产物，/toolbox/ lh 保持满分）；反馈上传 GBK 自动解码（UTF-8 严格优先 + GBK 兜底，杜绝静默乱码，ISSUES #17）
- 2026-10-07 v0.12: **11 月窗口包**——B 线查询框扩 5 维度（新增商品/小时，Top-N 确定性平局裁决）+ 引擎加载字节级进度（duckdb-wasm 原生回调）；Vercel 钉 IP 双栈巡检脚本（#10，首跑发现 64.29.17.65 TLS 指纹级干扰，观察中）；toolkit 升级 Next 16（#13 原 postcss 链消除，Windows turbopack 默认构建通过 = #9 修复；顺修 e2e 同源白名单存量断裂）；judge v2（工具感知锚点 + 输入可见）基线重钉；DeepSeek 网页端补测（章程 v2.2 用户拍板，10 条记录 + 对照报告，判定分布与 API 口径 7/0/3 完全一致）；C 线方法论文库实施计划草案落盘
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
