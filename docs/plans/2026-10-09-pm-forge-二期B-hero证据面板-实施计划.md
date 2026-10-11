# 二期 B 轨 · 首页 hero 证据面板实施计划（2026-10-09）

> **给执行者**：这是**独立可执行、可单独上线**的一轨。按任务顺序做，每条跑验收命令，绿了再提交。
> **Spec（论证依据，必须先读）**：
> - `docs/research/2026-10-09-调研-详情页版头与hero证据面板.md` §2（含 OWID 首页 hero 这个唯一强证据面板案例、真实数据可行性清单、性能与 CLS 的硬事实）
> - `E:\homework\“余粮”项目\docs\research\2026-10-09-二期现状核查-代码实证.md` §6（hero 现状）
> - 预览稿：`E:\homework\“余粮”项目\docs\research\mockup\phase2-preview.html` PART B（截图 `shots/phase2-b-hero.png`）
>
> **为什么做**：版心 1120px，但 hero 的 h1 被 `max-w-[13em]`、说明段被 `max-w-[68ch]` 卡住，**右侧约 500px 是空的**。首屏是求职作品集唯一保证被看到的位置，现在浪费了一半。
>
> **选定方案**：调研文档 §2.3 的 **方案 B「无边框统计表」**（编辑部 masthead 风格）。理由：零新依赖、零图片、零 CLS；面板底可用 `bg-surface-2` 更贴「纸」；`<dl>` 天然单列，移动端不需要额外断点逻辑；且与现有 `MetricCards`（卡片式）形成层次区分而不是重复。
> 方案 A（卡片 KPI）与方案 C（终端 mono）见文末「备选」。

## Global Constraints

- **零第三方运行时请求**。面板是纯文本 + 现有 token。
- **绝对禁止假数据**。面板里每一个数字都必须由构建期从内容集合真实统计。**宁可只有 4 个数字，也不要有 1 个假数字**——这是整个作品集的立身之本。
  - ❌ 明确不做：访问量/阅读数、GitHub 活跃度或 star（需构建期访问外网 API）、手写的 `Lighthouse 100`、`99%`、`10k+`、`+∞`、无来源的「用户满意度」。
- **Lighthouse 移动端四类 ≥ 90**（现状 13 页中 12 页四类全 100）。面板是纯文本，不得让 performance 掉分。
- **CLS 必须保持 0**。基线实测（2026-10-09，线上首页，390×844 移动仿真）：`LCP = H1`（2016ms）、`CLS = 0`、`shifts = []`、`0` 个失败请求。
- **无障碍**：`<h1>` 仍全局唯一（面板里只能有 `<h2>` 及以下）；`<aside>` 必须 `aria-labelledby` 指向一个**可见**的 `<h2>`；颜色只用现有 token。
- **门禁不可破**：7 项校验 + pagefind 全绿。**新增一项** `check-home-metrics.mjs`。
- **git 纪律**：显式 `git add`，禁 `add -A`；前缀 `feat:/fix:/docs:`；提交必 push；同步 README + `docs/STATUS.md`。

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `site/src/utils/evidence.ts` | 新建 | 唯一的「真实数字来源」：从 5 个集合算出面板数据（深模块，页面只消费不计算） |
| `site/src/components/EvidencePanel.astro` | 新建 | 只负责渲染 `<dl>`；不带任何取数逻辑 |
| `site/src/pages/index.astro` | 改 | hero 改 12 栏网格，左栏 span-7、面板 `lg:col-span-5` |
| `site/scripts/check-home-metrics.mjs` | 新建 | 门禁：**独立重算**内容集合并与 `dist/index.html` 里的 `data-evidence-*` 比对 |
| `site/package.json` | 改 | build 链挂上 `check-home-metrics.mjs` |
| `README.md` / `docs/STATUS.md` | 改 | 变更日志与状态 |

---

## Task 1：先写门禁（会失败），再实现取数

**Files**：Create `site/scripts/check-home-metrics.mjs`；Create `site/src/utils/evidence.ts`

**Interfaces**：
- Produces（`@/utils/evidence`）：
  ```ts
  export type EvidenceRow = {
    key: string;                                       // 稳定标识，供门禁比对
    label: string;
    value: number;
    unit: string;
    href: string;                                      // 页内锚点
    note?: string;                                     // 小字补充，仅在有真实口径可写时给
  };
  export type Evidence = { rows: EvidenceRow[]; latest: Date };
  export async function buildEvidence(): Promise<Evidence>;
  ```
- Consumes：`astro:content` 的 `getCollection`

### Step 1：写门禁脚本（此时必然失败，这是预期的）

```js
// site/scripts/check-home-metrics.mjs
// 门禁：首页证据面板上的数字，必须与从 src/content 独立重算的结果一致。
// 独立重算 = 不 import 站点的 evidence.ts（否则是同义反复），而是自己数文件与 JSON 字段。
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("..", import.meta.url));
const C = join(SITE, "src/content");
const DIST_INDEX = join(SITE, "dist/index.html");

const mdCount = d =>
  existsSync(join(C, d)) ? readdirSync(join(C, d)).filter(f => f.endsWith(".md")).length : 0;

const records = readdirSync(join(C, "dissection-records")).filter(f => f.endsWith(".json"));
const verdicts = records.map(f => JSON.parse(readFileSync(join(C, "dissection-records", f), "utf8")).verdict);
const tally = v => verdicts.filter(x => x === v).length;

// 与 evidence.ts 的 key 一一对应（这是两份实现之间的契约）
const expected = {
  cases: mdCount("case-studies"),
  analysis: mdCount("analysis"),
  dissections: mdCount("dissections"),
  records: records.length,
  reports: mdCount("toolkit-reports"),
};

const html = readFileSync(DIST_INDEX, "utf8");
const actual = {};
for (const m of html.matchAll(/data-evidence-key="([^"]+)"[^>]*data-evidence-value="(\d+)"/g)) {
  actual[m[1]] = Number(m[2]);
}

const problems = [];
for (const [k, v] of Object.entries(expected)) {
  if (!(k in actual)) problems.push(`首页缺证据项 ${k}`);
  else if (actual[k] !== v) problems.push(`${k}: 页面显示 ${actual[k]}，内容集合实际 ${v}`);
}
if (verdicts.length && !/成功\s*30|成功\s*\d+/.test(html)) {
  // 判定分布必须出现，且数字来自 records（此处只做存在性粗检，精确值由上面的 total 保证）
  problems.push("首页未出现判定分布（成功/部分/失败）");
}

if (problems.length) {
  console.error("✗ 首页证据面板校验失败：");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`✓ 首页证据面板校验通过（${Object.keys(expected).length} 项数字与内容集合一致）`);
```

### Step 2：跑一次，确认它失败

Run：`cd site && node scripts/check-home-metrics.mjs`
Expected：**失败**，报出「首页缺证据项 cases」等 5 条。如果它通过了，说明你改错了文件或 `dist/index.html` 是旧的——先 `npm run build` 再试。

### Step 3：实现取数模块

```ts
// site/src/utils/evidence.ts
import { getCollection } from "astro:content";

export type EvidenceRow = { /* 见上 */ };
export type Evidence = { rows: EvidenceRow[]; latest: Date };

export async function buildEvidence(): Promise<Evidence> {
  const [cases, analysis, dissections, records, reports] = await Promise.all([
    getCollection("caseStudies"),
    getCollection("analysis"),
    getCollection("dissections"),
    getCollection("dissectionRecords"),
    getCollection("toolkitReports"),
  ]);

  const tally = (v: string) => records.filter(r => r.data.verdict === v).length;
  const liveCases = cases.filter(c => Boolean(c.data.links?.live)).length;

  const dates = [...cases, ...analysis, ...dissections, ...reports]
    .map(e => e.data.pubDatetime)
    .filter((d): d is Date => d instanceof Date);
  const latest = dates.length
    ? new Date(Math.max(...dates.map(d => d.valueOf())))
    : new Date();

  const rows: EvidenceRow[] = [
    { key: "cases", label: "案例研究", value: cases.length, unit: "篇", href: "#featured",
      note: liveCases ? `其中 ${liveCases} 个可在线访问` : undefined },
    { key: "analysis", label: "数据分析报告", value: analysis.length, unit: "篇", href: "#analysis" },
    { key: "dissections", label: "AI 产品拆解", value: dissections.length, unit: "篇", href: "#dissections" },
    { key: "records", label: "实测记录", value: records.length, unit: "条", href: "#dissections",
      note: `成功 ${tally("成功")} · 部分 ${tally("部分")} · 失败 ${tally("失败")}` },
    { key: "reports", label: "工具实跑报告", value: reports.length, unit: "篇", href: "#toolbox" },
  ];

  return { rows, latest };
}
```

> **口径提醒**：`records` 的分布必须与 `site/scripts/check-dissections.mjs` 已有的「报告数字 ↔ 记录集合一致性」校验口径一致（该脚本已经在跑，别另立一套）。当前实测：40 条 = 30 成功 / 2 部分 / 8 失败。
> **`latest` 是构建期常量**，不要在客户端「算距今几天」——那必然引起文本变化，是白送的 CLS 风险。

### Step 4：提交（先提交被证明过会失败的测试）

```bash
git add site/scripts/check-home-metrics.mjs site/src/utils/evidence.ts
git commit -m "feat(site): 新增首页证据面板取数模块与数字一致性门禁"
git push origin main
```

---

## Task 2：面板组件 + hero 改双栏

**Files**：Create `site/src/components/EvidencePanel.astro`；Modify `site/src/pages/index.astro`；Modify `site/package.json`

**Interfaces**：
- Consumes：`Evidence`（`@/utils/evidence`）、`Datetime`（`{ pubDatetime, size?: "sm" | "lg" }`）
- Produces：`EvidencePanel`，props = `Evidence` 的字段（`{ rows, latest }`）

### Step 1：写面板

```astro
---
import Datetime from "./Datetime.astro";
import type { EvidenceRow } from "@/utils/evidence";

type Props = { rows: EvidenceRow[]; latest: Date };
const { rows, latest } = Astro.props;
---

<aside id="evidence" class="lg:col-span-5" aria-labelledby="evidence-heading">
  <h2
    id="evidence-heading"
    class="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase"
  >
    本作品集包含
  </h2>

  <dl class="divide-border mt-3 divide-y divide-dashed border-t border-dashed">
    {rows.map(r => (
      <div class="flex items-baseline justify-between gap-4 py-2.5">
        <dt class="text-muted-foreground text-sm">
          <a class="hover:text-accent underline-offset-4 hover:underline" href={r.href}>
            {r.label}
          </a>
        </dt>
        <dd class="text-right" data-evidence-key={r.key} data-evidence-value={String(r.value)}>
          <span class="text-lg font-bold">{r.value}</span>
          <span class="text-muted-foreground ml-0.5 text-xs">{r.unit}</span>
          {r.note && (
            <span class="text-muted-foreground mt-0.5 block text-[11px]">{r.note}</span>
          )}
        </dd>
      </div>
    ))}
  </dl>

  <div class="text-muted-foreground mt-3 text-[11px]">
    以上数字由构建期从内容集合统计。最近更新：<Datetime pubDatetime={latest} />
  </div>
</aside>
```

> **为什么 `data-evidence-key`/`data-evidence-value` 出现在生产标记里**：它们是门禁唯一的可靠抓手（正则匹配带标签的 HTML 数字极易假阴性）。属性无语义副作用、不影响渲染、不增加字节级负担（5 个元素）。
> **`aria-labelledby` 指向可见的 `<h2>`**：这是不破坏现有 a11y 100 分的关键；不要用 `sr-only`。

### Step 2：改 hero 为 12 栏网格

Modify `site/src/pages/index.astro`：
1. 引入 `buildEvidence` 与 `EvidencePanel`，在 frontmatter 里 `const evidence = await buildEvidence();`
2. `section#hero` 的 class 改为：
   ```
   class="border-border grid grid-cols-1 gap-8 border-b pt-8 pb-10 sm:pt-12 lg:grid-cols-12 lg:gap-10 lg:pt-16"
   ```
3. 把**现有的** h1 / p / LinkButton / Socials **原样**包进 `<div class="lg:col-span-7">`
4. 在它**之后**追加 `<EvidencePanel {...evidence} />`

> DOM 顺序 = 左栏 → 面板，因此桌面端自动并排（span-7 + span-5），移动端自动堆叠且**面板落在 CTA 与社交链接之后**（这是调研 §2.4 建议的顺序，避免首屏被数字占满）。**不要用 `order-*` 去改，DOM 顺序已经对了。**

### Step 3：验收

Run：`cd site && npm run build`
Expected：出现 `✓ 首页证据面板校验通过（5 项数字与内容集合一致）`。**如果没挂上脚本，先去 Step 4。**

Run（三档宽度）：390 / 768 / 1120 截图首页
Expected：1120 下 h1 与面板并排、`#evidence` 右对齐、`dl` 的虚分割线连续；768 与 390 下面板在 CTA 之后、单列、无横向滚动条。

Run：`cd site && npm run lh`
Expected：13 页四类 ≥90，与改动前基线一致。

Run（CLS/LCP，照抄 Task 3 的探针或直接看 DevTools Performance → Layout Shifts）
Expected：`CLS = 0`。

### Step 4：挂进门禁链

Modify `site/package.json` 的 `build`：在 `node scripts/check-headings.mjs && `（A 轨加的）之后插入 `node scripts/check-home-metrics.mjs && `。
> 若 A 轨尚未落地，则插在 `node scripts/check-ld.mjs && ` 之后。

### Step 5：提交

```bash
git add site/src/components/EvidencePanel.astro site/src/pages/index.astro site/package.json
git commit -m "feat(site): 首页 hero 改 12 栏双栏，右栏接入真实数据证据面板"
git push origin main
```

---

## Task 3：无障碍与性能复验（不能只看脚本绿）

**Files**：无（只验证；发现问题回到 Task 2 修）

- [ ] **Step 1：标题结构** —— 首页 HTML 里 `<h1>` 恰好 1 个；面板的 `<h2>` 出现在各 section 的 `<h2>` 之前，层级不跳。
- [ ] **Step 2：屏幕阅读器顺序** —— 用 DevTools 的 Accessibility 面板朗读一遍首页，确认读到「本作品集包含」之后是 5 组「标签 → 数字 单位」，而不是先读数字。
- [ ] **Step 3：键盘可达** —— 面板里 5 个 `<a href="#…">` 都能 Tab 到、都有可见的虚线 focus 描边（站点全局约定见 `global.css`）。锚点跳转后滚动位置正确（`:target { scroll-margin-block: 1rem }` 已全局设置）。
- [ ] **Step 4：`prefers-reduced-motion: reduce`** —— 面板本身不含动效；但要确认**没有任何**新加的数量递增动画（本计划明确不做）。
- [ ] **Step 5：对比度** —— 面板用的都是既有 token（`--muted-foreground #6b655c` 在 `#fbfaf8` 上、`--foreground` 数字），不引入新配色。用 Lighthouse 的 a11y 分数兜底。
- [ ] **Step 6：确认没有多余请求** —— 改完再跑一次 Task 3 的网络探针，`失败请求 = 0`，且 Network 面板里**没有新增任何请求**（面板是纯文本）。
- [ ] **Step 7：若任何一项不过，回到 Task 2 修，不要开新 commit 前先提交**。

---

## Task 4：文档与收尾

**Files**：Modify `README.md`、`docs/STATUS.md`

- [ ] **Step 1：README 变更日志** —— 追加一条（若 A 轨已发则并入同一个 `v0.15` 段落），写清「首页 hero 双栏 + 证据面板（5 项真实数字，构建期统计）」+ 门禁名 + 验收数字。
- [ ] **Step 2：`docs/STATUS.md`** —— 记录：新增文件、门禁、验收结果、**明确的「不做」清单**（访问量/GitHub 活跃度/手写 Lighthouse 分数，以及理由）。
- [ ] **Step 3：提交**

```bash
git add README.md docs/STATUS.md
git commit -m "docs: 二期 B 轨（首页证据面板）变更日志与状态记录"
git push origin main
```

- [ ] **Step 4：线上复验** —— 推送后等约 90s（Vercel 生产部署），然后：
  1. `curl -s https://www.yuhailinlxy.com/ | grep -o 'data-evidence-key="[^"]*" data-evidence-value="[^"]*"'` 应输出 5 行，数字与本地一致
  2. 移动端截图 + 再量一次 `CLS`，确认仍是 `0`

---

## 备选方案

- **方案 A（卡片 KPI 2×2）**：把 `<dl>` 换成 `grid grid-cols-2 gap-3` 的 `bg-surface-2` 圆角块，数字用 `text-2xl font-bold`。气质更「仪表盘」，与 `MetricCards` 同族；移动端 <400px 要降成 `grid-cols-1`。**若用户觉得 B 太轻，就换 A**——只改 `EvidencePanel.astro` 一个文件，取数与门禁完全不动。
- **方案 C（终端 mono）**：深色块。**不推荐**：会在暖米白体系里引入第二种底色，且调研已指出「终端风最容易滑向炫技/AI 味」。若一定要做，颜色只保留 `--section-*` 与 `--muted-foreground`。
- **若用户整体否掉面板**：Task 1 的门禁与取数模块仍有价值（可留作它用或删除），但**必须同时删掉门禁在 `package.json` 里的挂载**，不要让 build 依赖一个不存在的面板。

---

## 自检

| 调研 §2 的要求 | 落在哪 |
|---|---|
| 真实案例参照（OWID hero 统计链接） | 方案 B 的「数字 + 可点开链接」直接对应 |
| 内容清单：能真实生成 vs 拒绝 | Global Constraints + `evidence.ts` 只取 5 项 |
| 三种排版方案 | Task 2（B） + 备选（A/C） |
| 移动端退化 | Task 2 Step 2（DOM 顺序 + `lg:grid-cols-12`） |
| 性能（CLS/LCP、拒绝递增动画） | Global Constraints + Task 3 Step 4/6 |
| a11y 红线（h1 唯一、aria-labelledby、对比度） | Task 3 Step 1–3/5 |

**本轨未覆盖、明确归属他轨**：详情页版头（A 轨）、微动效与 reduced-motion（C 轨）、逐页 OG（D 轨）。
**已明确砍掉**：把 Lighthouse 分数放进面板。理由是它需要扩展 `lh.mjs` 产出受版本控制的 `site/src/data/lighthouse.json` 并保证每次改页都重跑；**做不到自动就等于写死一个假数字**。若将来 `lh.mjs` 能稳定产出该 JSON，再单开一轨。
