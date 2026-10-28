# site · 作品集站点（M3）

Astro 7 作品集站，基座为 [AstroPaper](https://github.com/satnaing/astro-paper) v6.1.0
（MIT，上游 commit `35cfa7fbe0b897306d27670d3819e55d5205f3dd`，复制于 2026-09-28，保留 LICENSE，未 fork 上游历史）。

## 改造清单（相对上游）

- 内容集合：posts → case-studies / analysis / dissections / dissection-records / toolkit-reports（见 `src/content.config.ts`）
- 路由：`/` `/case-studies/` `/analysis/` `/dissections/` `/data-stories/` `/toolbox/` `/interviewers/` `/about/` `/search/`；删除 tags/archives
- 字体：去 Google Fonts（国内构建必挂，见 40-经验教训 2026-09-27 Geist 教训），用系统 CJK 字体栈
- 搜索：**pagefind**（构建末尾 `pagefind --site dist` 建索引，`src/pages/search.astro` 懒加载，dev 无索引时优雅降级）
- OG：**逐页静态图** 1200×630，`npm run og` 生成 + `public/og/manifest.json` 登记指纹，`features.dynamicOgImage` 关闭
- UI 文案中文：`src/i18n/lang/zh.ts`
- 构建：`astro check && astro build` + **13 道构建期门禁** + pagefind 索引（下表）

## 命令

```bash
npm install        # npmmirror 源
npm run dev        # 本地开发 http://localhost:4321
npm run build      # astro check + 构建 + 13 道门禁 + pagefind 索引
npm run og         # 重生成逐页 OG 图（改了内容必须跑，否则 check-og 红）
npm run lh         # Lighthouse 移动端四类 ≥90（13 页 × 2 次取高分）
```

> Windows PowerShell 默认执行策略禁止 `npm.ps1`，用 `npm.cmd run build` 或 `cmd /c` 包一层。

## 构建期门禁

| 脚本 | 守什么 |
|---|---|
| `check-case-studies` | 案例四段式齐全 + 有量化结果 |
| `check-dissections` | 评测记录条数、失败数、报告数与 claims 字段一致 |
| `check-links` | dist 全产物死链 / `*.vercel.app` 残留 |
| `check-tokens` | `src/pages`、`src/components` 内 0 处颜色字面量（只许 token） |
| `check-typography` | 正文里不许用 `~` 做范围号（`26~102%` 会被读成 `26102%`） |
| `check-levels` | 案例详情页每节第一段必须是导读（20–80 字、无术语、数字与正文一致）——简明档只显示它 |
| `validate-rss` | RSS 全文 + 非绝对链接 |
| `check-ld` | JSON-LD WebSite/Person/BlogPosting 合规 |
| `check-headings` | 每页恰好 1 个 h1、标题不跳级 |
| `check-toc` | 目录每条锚点在页面里真实存在 |
| `check-home-metrics` | 首页证据面板数字与内容集合**独立重算**一致；「最近更新」核对 `data-evidence-updated` = max(内容最新, `src/data/release.ts`) |
| `check-og` | OG 五类失败模式（陈旧/缺文件/尺寸/404/缺 alt） |
| `check-story-budget` | 体积预算（duckdb 40MB、数据故事 3MB） |

## 浏览器级验收（不在 `build` 里，需要本机有 Edge/Chrome）

| 脚本 | 守什么 |
|---|---|
| `npm run lh` | 13 页 Lighthouse 四类 ≥90；**跑完会接着跑下面那条对齐门禁** |
| `npm run check:align` | 首页证据面板 6 格列对齐：行内数字顶 / 标签顶 / 数字块高度一致（1440 与 390 各量一次） |
| `npm run check:reduce` | reduced-motion：卡片不上浮、目录过渡关闭、**联系轨道停转且 4 个节点仍分居四方** |

为什么不进 `build`：对齐是 CSS 布局结果，HTML 里没有坐标，必须在浏览器里量 `getBoundingClientRect`，
而 Vercel 构建环境没有浏览器。代价是这类问题构建期拦不住 —— 2026-10-27 数字错位 15px 时，
11 道门禁全绿、四类 Lighthouse 分数全是 100，最后是用户看出来的。所以它挂在 `npm run lh` 里：跑验收就一定跑到它。

同一类教训 2026-10-27 又出现一次：第 6 格从「2026年10月7日」改成 `10.27` 时，check-home-metrics 照样绿 ——
因为它只 `includes()` 那个日期字符串，而首页「最新分析」卡片的日期正好也是这一天，断言在别处命中了。
现在改成核对 `data-evidence-updated` 属性。**断言必须钉在「这一处」，钉在「页面上有这句话」就是假绿。**

## 写一篇案例

在 `src/content/case-studies/` 新建 `.md`：frontmatter 含 title/description/pubDatetime/projectRole/stack/metrics（或 resultsNote），正文按四段式 H2（背景与问题 / 我的角色 / 过程与关键取舍 / 结果与量化），第五段「复盘与反思」可选。`npm run build` 会自动校验结构，缺四段式或无量化结果直接构建失败。
