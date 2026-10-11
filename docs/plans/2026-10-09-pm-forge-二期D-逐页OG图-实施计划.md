# 二期 D 轨 · 逐页 OG 分享图实施计划（2026-10-09）

> **给执行者**：**独立可执行、可单独上线**的一轨。按任务顺序做，每条跑验收命令，绿了再提交。
> **Spec（论证依据，必须先读）**：
> - `docs/research/2026-10-09-调研-逐页OG图生成方案.md`（1199 行；两条路线**都真跑过**，含实测耗时、字体子集实测、`astro:build:done` 源码级签名、ogp.me 原文核实、以及分平台的「未核实」标注）
> - `E:\homework\“余粮”项目\docs\research\2026-10-09-二期现状核查-代码实证.md` §3（OG 现状）
>
> **为什么做**：现在 **27 个页面共用同一张 `og-default.png`**，分享到微信/飞书/X 都长一样。且那张图还是**旧品牌色 `#006cac` + 旧文案**，与 v0.14 的暖色 token 不一致。
>
> **选定路线**：**本地生成 + 产物入库 + 陈旧门禁**（调研的「方案 C」）。理由有三：
> 1. 与仓库既有做法一致——`public/assets/dissections/*.png`（40 张）与 `public/assets/toolbox/*.png` 就是"本地脚本生成 + 入库 + `manifest.json`"。
> 2. **不让部署链依赖任何原生/浏览器依赖**。这正是当初拆掉动态 OG 的原因（`docs/STATUS.md:51`：satori 依赖 Google Fonts 构建期拉取 + CJK 缺字）；Playwright 路线在本机可行，但有公开证据显示 Vercel 构建里 `playwright install --with-deps` 会因 `apt-get: command not found` 失败（exit 127）。
> 3. 生成的图进 git，**可以在 PR 里直接肉眼审**，出问题不会等到线上才发现。
> **代价**：仓库 +约 0.7 MB（30 张 × 平均 27 KB，实测）+ 一个 `manifest.json`；以及"改了标题必须重跑生成脚本"的纪律——**这条由门禁强制**。

## Global Constraints

- **零第三方运行时请求**。OG 图只在 `<meta>` 里，页面不加载它（所以对 Lighthouse 影响为 0）；**不要给它加 `<link rel="preload">`，不要把它塞进页面**。
- **字体授权**：只用 OFL-1.1 的字体（推荐 **Noto Sans SC**）。**禁止把 `C:\Windows\Fonts` 下的 simhei/msyh/Deng 提交进 git 或随站点分发。**
- **ogp.me 原文要求**（已核实）：「If the page specifies an `og:image` it should specify `og:image:alt`」——所以 **`og:image:alt` 必须有**；且**多个 `og:image` 时第一个优先**；结构化属性必须紧跟 root 标签。
- **门禁不可破**：现有 7 项 + pagefind 全绿。**新增一项** `check-og.mjs`。
- **git 纪律**：显式 `git add`，禁 `add -A`；前缀 `feat:/fix:/docs:`；提交必 push；同步 README + `docs/STATUS.md`。
- **不许编造**：调研已明确标注 **X/Twitter、Facebook 的尺寸格式要求本机完全无法核实**（官方文档 4 个域名全部 fetch failed），微信/飞书无官方文档。**方案里不写这些数字**，按下面的"尺寸选择"执行即可。

## 尺寸与格式选择（依据 + 判断）

- **1200×630**，PNG。ogp.me **不规定尺寸与格式**（已核实原文）；PNG 是调研里唯一有跨平台实测佐证的选择（第三方 12 平台实测：JPEG+PNG 全支持；SVG **根本不在被测集合**）。**不要用 SVG**（现有内联 SVG 封面 `Cover.astro` 不能直接当 OG 图：satori 不解析 CSS 变量、不自动回退系统字体、viewBox 比例也不对）。
- 单张体积实测平均 **27 KB**（19.8–45.2 KB）。
- **不加 `og:image:width/height` 之前先想清楚**：加了就必须保证与实际文件一致，否则平台可能裁错 → 本计划让门禁从 PNG 头部**读回真实宽高**再比对，所以可以安全地加。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `site/src/config.ts` | 改 | 修掉 `DEFAULT_OG_IMAGE = "default-og.jpg"` 这个死回退陷阱 |
| `site/src/layouts/Layout.astro` | 改 | 补 `og:image:type/width/height/alt`；`ogImage` prop 支持带上 alt |
| `site/src/layouts/PostLayout.astro` | 改 | 透传 alt（顺带修好 JSON-LD 的 `image`——它现在因为 `ogImage` 为 `undefined` 被 `JSON.stringify` 丢掉了） |
| `site/scripts/og/tokens.mjs` | 新建 | 色值常量，**逐条从 `site/src/styles/theme.css` 抄**（不要用文档里的转述值） |
| `site/scripts/og/card.mjs` | 新建 | 单张卡的 satori 元素树；移植 `Cover.astro` 的 `clip/`fitSize` |
| `site/scripts/build-og.mjs` | 新建 | 读内容 frontmatter → 生成 `public/og/*.png` + `public/og/manifest.json` |
| `site/scripts/check-og.mjs` | 新建 | 门禁：陈旧检测 / PNG 有效性 / 宽高 / 每页 og:image 存在且唯一 / alt 非空 |
| `site/public/og/` | 新建 | 产物目录（PNG + manifest.json） |
| `site/package.json` | 改 | 加 `"og": "node scripts/build-og.mjs"`；build 链挂 `check-og.mjs` |
| 四个 `[slug]/index.astro` | 改 | 传 `ogImage` |
| `README.md` / `docs/STATUS.md` | 改 | 变更日志与状态 |

> **【关键，别踩】** `site/src/utils/resolveDefaultOgImagePath.ts:4` 用的是 `import.meta.glob("/public/*")`（**只有一层**）。所以把图放进 `public/og/` 子目录不会被它扫到，也不会在 `dist` 里产生重复副本（实测现状：`public/og-default.png` 会在 dist 里变成两份，同 SHA256、共 ~37.6 KB）。**千万不要把那个 glob 改成 `/public/**`**，否则 30 张 OG 图会全部翻倍。

---

## Task 1：修 trap + 补 OG 元数据（零风险，先做）

**Files**：Modify `site/src/config.ts`、`site/src/layouts/Layout.astro`、`site/src/layouts/PostLayout.astro`

**背景（源码实测）**：`site/src/config.ts:11` 是 `const DEFAULT_OG_IMAGE = "default-og.jpg";`，`:16` 是 `userConfig.site.ogImage ?? DEFAULT_OG_IMAGE`。因为 `astro-paper.config.ts:11` 已显式写了 `og-default.png`，**这个回退值是死代码、不是线上 bug**。但它是个陷阱：谁把配置里那行删掉，构建就会去找 `public/default-og.jpg` ——`public/` 下**只有** `favicon.svg` 与 `og-default.png`，于是 `resolveDefaultOgImagePath.ts:41-45` 直接 throw。

- [ ] **Step 1：修回退值**

```ts
const DEFAULT_OG_IMAGE = "og-default.png";
```
（`site/src/config.ts:11` 一行改动。）

- [ ] **Step 2：补 4 个 OG 属性**

Modify `site/src/layouts/Layout.astro`：`ogImage` prop 改成可接受 `{ src: string; alt?: string; width?: number; height?: number }` 或纯字符串（向后兼容）。在 `:69` 的 `og:image` 之后补：

```astro
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content={String(ogWidth)} />
<meta property="og:image:height" content={String(ogHeight)} />
<meta property="og:image:alt" content={ogAlt ?? title} />
```

`ogWidth/ogHeight` 默认 **1200/630**；`ogAlt` 默认用页面 title。
**同时给 `twitter:image:alt` 也补一个**（与 `og:image:alt` 同值）。

- [ ] **Step 3：修 JSON-LD 的丢键**

`site/src/layouts/PostLayout.astro:23` 是 `image: ogImage,`，当 `ogImage` 为 `undefined` 时 `JSON.stringify` **直接把键丢掉**（实测现状：文章页结构化数据现在没有 image）。改成只在有值时展开：
```ts
...(ogImage && { image: new URL(ogImage, Astro.site ?? Astro.url).href }),
```

- [ ] **Step 4：验收**

Run：`cd site && npm run build && node scripts/check-ld.mjs`
Expected：全绿；随便挑一个详情页 HTML，确认出现 `og:image:alt`。

- [ ] **Step 5：提交**

```bash
git add site/src/config.ts site/src/layouts/Layout.astro site/src/layouts/PostLayout.astro
git commit -m "fix(site): 修 OG 默认图死回退陷阱，补 og:image 尺寸/类型/alt 与 JSON-LD image"
git push origin main
```

---

## Task 2：字体与色板准备

**Files**：Create `site/scripts/og/tokens.mjs`

**依赖**（写进 `site/package.json` 的 `devDependencies`，**先在 npmmirror 验在架性**）：
`satori@0.47.1`、`@resvg/resvg-js@2.6.2`、`subset-font@2.9.0`（harfbuzzjs wasm，**纯 npm，不需要 Python**）。

- [ ] **Step 1：取字体（OFL-1.1）**

用 **Noto Sans SC**（OFL-1.1）。放到 `site/scripts/og-assets/` 下的一个**不被提交**的路径（加进 `.gitignore`）；或通过环境变量 `OG_FONT` 指定绝对路径。

> **【实测坑，必读】** satori **会被变量字体直接打崩**：喂 `NotoSansSC-VF.ttf` 会报
> `TypeError: Cannot read properties of undefined (reading '265') at parseFvarAxis`（来自 `@shuding/opentype.js`）。
> Google Fonts 现在的 Noto Sans SC **默认就是 VF**。**已验证的绕法**：用 `subset-font` 的 `variationAxes: { wght: 400 }` 先实例化成静态 sfnt，再交给 satori。
> 另外：satori 官方 README 明确 **只支持 TTF/OTF/WOFF，"WOFF2 is not supported at the moment"** —— 网页端自托管的 woff2 **不能复用**。

- [ ] **Step 2：抄 token**

Modify/Create `site/scripts/og/tokens.mjs`：**逐条打开 `site/src/styles/theme.css` 复制**，不要用任何文档里的转述值。至少需要：
`background #fbfaf8`、`foreground #1c1b1a`、`accent #0b6bcb`、`surface-1 #ffffff`、`surface-2 #f5f2ed`、`border #e6e2db`、`muted-foreground #6b655c`，以及 5 个板块色 `section-case/analysis/dissection/story/toolbox`。

- [ ] **Step 3：验收**

Run：`cd site && node -e "import('./scripts/og/tokens.mjs').then(m => console.log(m.default ?? m))"`
Expected：打印出 token 对象。

> **不要在这一步顺手改 `scripts/og-template.html`**（旧的 Playwright 模板）。它会被 Task 3 的生成器取代；在 Task 6 单独删除或改写，别混在一个 commit 里。

---

## Task 3：生成器

**Files**：Create `site/scripts/og/card.mjs`、`site/scripts/build-og.mjs`；Create `site/public/og/`

**Interfaces**：
- `card.mjs` 导出 `buildCard({ section, title, description, dateText, facts }) → satoriElement`
- `build-og.mjs` 产出：`public/og/<collection>-<id>.png` 与 `public/og/manifest.json`

- [ ] **Step 1：颜色写死，**不要**依赖 CSS 变量**

satori **不解析 CSS 变量**。`Cover.astro` 里全是 `var(--section-case)` 这类，**不能直接搬**。必须把 Task 2 的 token 作为字面量传进样式。

- [ ] **Step 2：用"纯对象"写 satori 元素树（免 JSX）**

satori 接受 `{ type, props }` 形式的 React-like 元素，**不需要 JSX、不需要构建步骤**：

```js
// site/scripts/og/card.mjs（骨架）
import { T } from "./tokens.mjs";

const h = (type, style, children) => ({ type, props: { style, children } });

// 直接从 Cover.astro 移植这两个函数（中文 1em / 拉丁 0.56em 估宽）
const isCJK = ch => /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
const widthOf = ch => (isCJK(ch) ? 1 : 0.56);
export function clip(text, maxEm) { /* 与 Cover.astro 同逻辑 */ }
export function fitSize(text, maxWidth, max, min) { /* 与 Cover.astro 同逻辑 */ }

export function buildCard({ section, title, description, dateText, facts = [] }) {
  const accent = T["section-" + section];
  return h("div", {
    width: "1200px", height: "630px", display: "flex", flexDirection: "column",
    backgroundColor: T.background, fontFamily: "Noto Sans SC",
  }, [
    h("div", { display: "flex", height: "100%", width: "100%" }, [
      h("div", { width: "14px", height: "100%", backgroundColor: accent }, []),
      h("div", { display: "flex", flexDirection: "column", justifyContent: "space-between",
                flex: 1, padding: "72px 80px" }, [
        h("div", { display: "flex", justifyContent: "space-between", fontSize: "24px",
                  color: accent, letterSpacing: "4px" }, [section.toUpperCase(), dateText]),
        h("div", { display: "flex", flexDirection: "column" }, [
          h("div", { fontSize: String(fitSize(title, 980, 72, 40)) + "px", fontWeight: 700,
                    color: T.foreground, lineHeight: 1.2 }, title),
          h("div", { fontSize: "28px", color: T["muted-foreground"], marginTop: "20px" }, description),
        ]),
        h("div", { display: "flex", justifyContent: "space-between", fontSize: "24px",
                  color: T["muted-foreground"] }, ["yuhailinlxy.com", facts.map(f => f.value + " " + f.label).join("   ")])
      ])
    ])
  ]);
}
```

> satori 的硬约束：布局是 flexbox 子集，**每个多子节点容器必须显式写 `display: "flex"`**；不支持 grid。所有文字必须落在真正的文本节点里（`children` 直接是字符串）。

- [ ] **Step 3：写生成器**

```js
// site/scripts/build-og.mjs
// 本地生成逐页 OG 图；产物与 manifest 入库；不需要网络、不需要浏览器。
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import subsetFont from "subset-font";
import { buildCard } from "./og/card.mjs";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const C = join(SITE, "src/content");
const OUT = join(SITE, "public/og");
const FONT_SRC = process.env.OG_FONT; // 必需的 OFL 字体路径（ttf/otf/woff）

// 1) 收集条目：复用 check-case-studies.mjs 的做法——自己切 frontmatter，不依赖 astro:content
const COLLECTIONS = {
  "case-studies": { key: "case", section: "case" },
  analysis: { key: "analysis", section: "analysis" },
  dissections: { key: "dissection", section: "dissection" },
  "toolkit-reports": { key: "toolbox", section: "toolbox" },
};

function readEntries() {
  const out = [];
  for (const [dir, meta] of Object.entries(COLLECTIONS)) {
    const abs = join(C, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter(x => x.endsWith(".md"))) {
      const text = readFileSync(join(abs, f), "utf8");
      const fmRaw = text.split(/^---$/m)[1] ?? "";
      const fm = parseYaml(fmRaw) ?? {};
      if (!fm.title) continue;
      out.push({ id: f.replace(/\.md$/, ""), dir, ...meta, ...fm });
    }
  }
  return out;
}

// 2) 按"用到的字符"做动态子集（实测：9.7MB → 单页约 12KB）
//    先实例化变量轴（Noto Sans SC 默认是 VF，直接喂 satori 会崩），再按 charset 子集
async function fontFor(charset) {
  const src = readFileSync(FONT_SRC);
  const woff = await subsetFont(src, charset, { targetFormat: "woff", variationAxes: { wght: 400 } });
  return woff;
}

const entries = readEntries();
const manifest = { generatedAt: new Date().toISOString(), images: {} };
mkdirSync(OUT, { recursive: true });

for (const e of entries) {
  const charset = [e.title, e.description ?? "", e.id].join("");
  const fontData = await fontFor(charset);
  const el = buildCard({
    section: e.section,
    title: e.title,
    description: e.description ?? "",
    dateText: String(e.pubDatetime ?? "").slice(0, 10),
    facts: (e.metrics ?? []).slice(0, 3).map(m => ({ label: m.label, value: m.value })),
  });
  const svg = await satori(el, {
    width: 1200, height: 630,
    fonts: [{ name: "Noto Sans SC", data: fontData, weight: 400, style: "normal" }],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  const file = `${e.key}-${e.id}.png`;
  writeFileSync(join(OUT, file), png);
  // 陈旧检测的抓手：内容指纹
  manifest.images[`${e.dir}/${e.id}`] = {
    file,
    hash: createHash("sha256").update([e.title, e.description ?? "", e.section, String(e.pubDatetime ?? "")].join("|")).digest("hex").slice(0, 16),
    bytes: png.length,
  };
}

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ 生成 ${Object.keys(manifest.images).length} 张 OG 图`);
```

- [ ] **Step 4：跑一次，并肉眼审图**

Run：`cd site && OG_FONT=<你的 Noto Sans SC ttf 路径> node scripts/build-og.mjs`
Expected：`public/og/` 下出现 N 张 PNG + manifest.json；**逐张打开看中文有没有豆腐块/缺字/溢出**（这是本任务唯一无法自动化的验收）。

Run：`cd site && OG_FONT=<...> node scripts/build-og.mjs && git status --short site/public/og`
Expected：**第二次运行零 diff**（幂等）。

- [ ] **Step 5：提交**

```bash
git add site/package.json site/scripts/og/tokens.mjs site/scripts/og/card.mjs site/scripts/build-og.mjs site/public/og
git commit -m "feat(site): 新增逐页 OG 图生成器与产物（satori + resvg，构建期零依赖）"
git push origin main
```

---

## Task 4：四个详情页接入 ogImage

**Files**：Modify 四个 `[slug]/index.astro`；Modify `site/src/utils/entryUrl.ts` 或新增 `site/src/utils/ogImage.ts`

**Interfaces**：
- Produces：`ogImageFor(collection: string, id: string): string` → `/og/<key>-<id>.png`

- [ ] **Step 1：写一个纯函数映射**（不要在每个页面手拼字符串）

```ts
// site/src/utils/ogImage.ts
const KEYS: Record<string, string> = {
  caseStudies: "case", analysis: "analysis", dissections: "dissection", toolkitReports: "toolbox",
};
export function ogImageFor(collection: keyof typeof KEYS, id: string): string {
  return `/og/${KEYS[collection]}-${id}.png`;
}
```

- [ ] **Step 2：四个页面各传一行**

```astro
<PostLayout
  title={...}
  description={...}
  pubDatetime={pubDatetime}
  modDatetime={modDatetime}
  ogImage={ogImageFor("caseStudies", entry.id)}
>
```

（`analysis` → `"analysis"`、`dissections` → `"dissections"`、`toolbox/reports` → `"toolkitReports"`。）

- [ ] **Step 3：验收**

Run：`cd site && npm run build`
Expected：新门禁还没挂（Task 5），先手动看：
`grep -o 'og:image[^>]*' dist/case-studies/student-union-platform/index.html`
Expected：`og:image` 指向 `https://yuhailinlxy.com/og/case-student-union-platform.png`，且 alt 非空、width/height 为 1200/630。

- [ ] **Step 4：提交**

```bash
git add "site/src/pages/case-studies/[slug]/index.astro" "site/src/pages/analysis/[slug]/index.astro" "site/src/pages/dissections/[slug]/index.astro" "site/src/pages/toolbox/reports/[slug]/index.astro" site/src/utils/ogImage.ts
git commit -m "feat(site): 四个详情页接入逐页 OG 图"
git push origin main
```

---

## Task 5：门禁 check-og.mjs

**Files**：Create `site/scripts/check-og.mjs`；Modify `site/package.json`

**它必须查出这五类问题**（每一类都是真实失败模式，不是凑数）：

1. **陈旧**：内容改了但没重跑生成器（比对 `manifest.json` 里的 hash 与当前 frontmatter 现算的 hash）
2. **文件缺失/损坏**：manifest 里登记了但 PNG 不在，或 PNG 签名/IHDR 非法
3. **尺寸不对**：PNG 实际宽高 ≠ 1200×630（**从 IHDR 读回**，不 trust 常量）
4. **og:image 指向不存在的本地文件**：能抓出「`dynamicOgImage: true` 回退到不存在的 `/og.png`」这类**构建成功但线上 404 的静默失败**
5. **og:image:alt 缺失或为空**（ogp.me 明确要求）

- [ ] **Step 1：零依赖 PNG 头校验**（调研文档 D1 已给实现并实测过正反用例，直接抄）

只需读前 24 字节：8 字节签名 `89 50 4E 47 0D 0A 1A 0A` + IHDR 长度/类型 + 宽（offset 16，大端 4 字节）+ 高（offset 20）。

- [ ] **Step 2：写脚本**

要点：
- 遍历 `dist/**/*.html`，抓 `<meta property="og:image" content="...">` 与 `og:image:alt`
- 只校验**本站绝对 URL 或站内相对路径**（外链跳过）
- 把 URL 映射回 `dist/` 下的真实文件；不存在 → 报错
- 顺带断言「27 个页面的 og:image 去重后数量」并把结果打印出来（**不要**硬断言必须全部唯一——首页/列表页共用默认图是合理的）
- 陈旧检测：读 `public/og/manifest.json`，对每个内容条目现算 hash 比对

- [ ] **Step 3：先跑一次看它能否抓到真问题**

Run：`cd site && npm run build`（先不带门禁），手动把某一篇的标题改一个字，再跑 `node scripts/check-og.mjs`
Expected：**报出陈旧**。然后改回标题，再跑，Expected：通过。

- [ ] **Step 4：挂进 build 链**

Modify `site/package.json` 的 `build`：在 `node scripts/check-home-metrics.mjs && `（B 轨）之后插入 `node scripts/check-og.mjs && `。

- [ ] **Step 5：验收**

Run：`cd site && npm run build`
Expected：出现 `✓ OG 检查通过（N 张图 / M 个页面）`。

Run：`cd site && npm run lh`
Expected：13 页四类 ≥90（**预期完全不变**：OG 图只在 meta 里，浏览器不下载）。

- [ ] **Step 6：提交**

```bash
git add site/scripts/check-og.mjs site/package.json
git commit -m "feat(site): 新增 OG 门禁（陈旧/PNG 宽高/文件存在性/alt 非空）"
git push origin main
```

---

## Task 6：清理旧模板 + 文档 + 平台人工复验

**Files**：Modify/Delete `site/scripts/og-template.html`、`site/public/og-default.png`；Modify `README.md`、`docs/STATUS.md`

- [ ] **Step 1：重做或废弃默认 OG 图**

`site/scripts/og-template.html` 与 `site/public/og-default.png` 现在是**旧蓝 `#006cac` + 旧文案**，与 v0.14 token 不一致（调研已实测：对它截图得到 37,318 B，与现产物字节完全一致，确认它就是来源）。
两个选择，**选一个并写进 commit message**：
- (a) 用新生成器顺便生成一张 `og-default.png`（推荐，彻底统一视觉语言）
- (b) 保留模板但把色值与文案改成新 token

**不要两个都留。** 若走 (a)，删掉 `og-template.html`（它已无消费者）。

- [ ] **Step 2：文档**

- `README.md`：追加变更日志；写清「逐页 OG 图 = 本地生成 + 入库 + 门禁」，以及**新增内容后必须跑 `npm run og`**。
- `docs/STATUS.md`：记录新增文件、门禁、产物数量与总体积、验收结果、以及**未核实清单**（X/Facebook 官方尺寸、微信/飞书抓取规则——照抄调研文档，不要自己补数字）。

- [ ] **Step 3：平台人工复验（**只做可用入口，不要为了不可达的文档编数字**）**

- **LinkedIn Post Inspector**：`https://www.linkedin.com/post-inspector/`（实测 HTTP 200 可达）→ 输入一个详情页 URL，确认抓到的是逐页图
- **Facebook Sharing Debugger**：`https://developers.facebook.com/tools/debug/`（本机不可达，**请用户在能访问的网络下手工过一遍**）→ 抓取并「再次抓取」
- 直接把链接发到**微信/飞书**各一次，肉眼看卡片（无官方文档，只能实测）

- [ ] **Step 4：提交**

```bash
git add README.md docs/STATUS.md site/public/og-default.png
git commit -m "docs: 二期 D 轨（逐页 OG 图）变更日志、状态与默认图更新"
git push origin main
```

- [ ] **Step 5：线上复验**

推送后等约 90s（Vercel 生产部署），然后：
```bash
curl -s https://www.yuhailinlxy.com/case-studies/student-union-platform/ | grep -o '<meta property="og:image[^>]*>'
curl -sI https://www.yuhailinlxy.com/og/case-student-union-platform.png | head -3
```
Expected：meta 指向逐页图；图片 URL 返回 200 且 `content-type: image/png`。

---

## 备选方案（若用户不想让产物入库）

调研给出了「方案 B：端路由 `src/pages/og/[...path].png.ts`」。**不推荐**的原因：它在 Vercel 构建期跑 satori+resvg，把原生依赖重新引入部署链——正是当初拆掉动态 OG 的原因。若用户坚持，把 Task 3 的生成逻辑原样搬进端路由即可，Task 1/2/4/5 仍然成立（Task 5 的陈旧检测要相应删掉）。

## 自检

| 调研建议的落地顺序 | 落在哪 |
|---|---|
| 1 修 `config.ts:11` + 补 og:image:type/width/height/alt | Task 1 |
| 2 抽 `tokens.mjs`（从 theme.css 逐条抄） | Task 2 Step 2 |
| 3 写 1200×630 satori 卡片（移植 clip/fitSize） | Task 3 Step 2 |
| 4 跑通生成器 + manifest | Task 3 Step 3/4 |
| 5 四个 `[slug]` 页传 ogImage | Task 4 |
| 6 接 check-og 门禁进 build | Task 5 |
| 7 build + lh + 人工过 Debugger/Post Inspector | Task 5 Step 5 + Task 6 Step 3 |

**本轨未覆盖、明确归属他轨**：详情页版头（A 轨）、首页证据面板（B 轨）、微动效（C 轨）。
**已明确砍掉的选项**：`@vercel/og`（需要服务端函数，违反红线）、`astro-og-canvas`（CanvasKit 不读系统字体，字体同样要入库；且其字体字段名与中文效果未核实）、`cn-font-split`（它是 Web 字体分包工具，OG 需要单文件字体）、`unicode-range`（是浏览器 webfont 机制，OG 是构建期 Node 光栅化，零作用）。
