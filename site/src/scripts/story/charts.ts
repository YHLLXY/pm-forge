// site/src/scripts/story/charts.ts —— Observable Plot 渲染层
// 职责边界：本文件不碰 DuckDB，输入永远是 JSON 数组（预生成 preset 或查询框结果）。
// 主题：fill/stroke 走站内 CSS 变量（明暗主题切换时 SVG 实时跟随）。
import * as Plot from "@observablehq/plot";

const fmt = new Intl.NumberFormat("zh-CN");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

type Row = Record<string, string | number>;

const ACCENT = "var(--accent)";
// tip 配色走站内 CSS 变量：Plot 默认白底 + 继承页面文字色，暗色主题下浅字白底不可读
const TIP = { fill: "var(--background)", stroke: "var(--border)" };
// tip 文本走 title channel（默认通道名是英文列名 user_count / y，对访客不友好）
const METRIC_LABEL: Record<string, string> = { event_count: "行为数", user_count: "用户数" };

function insert(host: Element, node: Node): void {
  // 口径行（figcaption）固定在图下方；查询框宿主没有 figcaption 时直接 append
  const caption = host.querySelector("figcaption");
  if (caption) host.insertBefore(node, caption);
  else host.append(node);
}

function width(host: Element): number {
  return host.clientWidth || 640;
}

// 大数字卡：单值指标不硬造图表
function bigNumbers(
  entries: { label: string; value: string; sub?: string }[],
  host: Element,
  cols = "sm:grid-cols-4",
): void {
  const wrap = document.createElement("div");
  wrap.className = `grid grid-cols-1 gap-3 ${cols}`;
  for (const e of entries) {
    const card = document.createElement("div");
    card.className = "bg-muted border-border rounded-lg border p-3";
    const strong = document.createElement("strong");
    strong.className = cols === "sm:grid-cols-1" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl";
    strong.textContent = e.value;
    const label = document.createElement("span");
    label.className = "text-foreground/75 block text-xs";
    label.textContent = e.label;
    card.append(strong, label);
    wrap.append(card);
  }
  insert(host, wrap);
}

function barX(rows: Row[], host: Element, xKey: string, xLabel?: string): void {
  insert(
    host,
    Plot.plot({
      marginLeft: 72,
      marginRight: 48,
      marginTop: 8,
      marginBottom: 28,
      x: { label: xLabel ?? null },
      y: { domain: rows.map(r => String(r.dim)), label: null },
      marks: [
        Plot.barX(rows, { y: r => String(r.dim), x: xKey, fill: ACCENT, tip: TIP, title: r => `${String(r.dim)}\n${METRIC_LABEL[xKey] ?? xKey} ${fmt.format(Number(r[xKey]))}` }),
        Plot.text(rows, { y: r => String(r.dim), x: xKey, textAnchor: "start", dx: 3, text: r => fmt.format(Number(r[xKey])) }),
      ],
      width: width(host),
      height: Math.min(260, 28 * rows.length + 36),
      style: { font: "inherit" },
    }),
  );
}

function columnHour(rows: Row[], host: Element): void {
  // 小时用数值通道 + interval:1（补零字符串会触发 Plot 的「疑似数字字符串」警告）
  insert(
    host,
    Plot.plot({
      marginLeft: 48,
      marginRight: 8,
      marginTop: 8,
      marginBottom: 28,
      y: { label: null, grid: true },
      x: { interval: 1, label: "小时", ticks: rows.map(r => Number(r.dim)).filter(n => n % 2 === 0) },
      marks: [Plot.barY(rows, { x: r => Number(r.dim), y: "event_count", fill: ACCENT, tip: TIP, title: r => `${String(r.dim)} 时\n行为数 ${fmt.format(Number(r.event_count))}` })],
      width: width(host),
      height: 220,
      style: { font: "inherit" },
    }),
  );
}

function areaDay(rows: Row[], host: Element): void {
  const x = (r: Row) => new Date(String(r.dim));
  insert(
    host,
    Plot.plot({
      marginLeft: 48,
      marginRight: 12,
      marginTop: 8,
      marginBottom: 28,
      y: { label: null, grid: true },
      x: { type: "time", tickFormat: "%m-%d" },
      marks: [
        Plot.areaY(rows, { x, y: "user_count", fill: ACCENT, fillOpacity: 0.15, curve: "monotone-x" }),
        Plot.line(rows, { x, y: "user_count", stroke: ACCENT, strokeWidth: 2, curve: "monotone-x", tip: TIP, title: r => `${String(r.dim)}\n用户数 ${fmt.format(Number(r.user_count))}` }),
      ],
      width: width(host),
      height: 220,
      style: { font: "inherit" },
    }),
  );
}

function barRate(rows: Row[], host: Element): void {
  insert(
    host,
    Plot.plot({
      marginLeft: 72,
      marginRight: 64,
      marginTop: 8,
      marginBottom: 28,
      x: { domain: [0, Math.max(...rows.map(r => Number(r.rate))) * 1.2], label: null },
      y: { domain: rows.map(r => String(r.dim)), label: null },
      marks: [
        Plot.barX(rows, { y: r => String(r.dim), x: r => Number(r.rate), fill: ACCENT, tip: TIP, title: r => `${String(r.dim)}\n转化率 ${pct(Number(r.rate))}` }),
        Plot.text(rows, {
          y: r => String(r.dim),
          x: r => Number(r.rate),
          textAnchor: "start",
          dx: 3,
          text: r => pct(Number(r.rate)),
        }),
      ],
      width: width(host),
      height: Math.min(260, 28 * rows.length + 36),
      style: { font: "inherit" },
    }),
  );
}

function compare(rows: Row[], host: Element): void {
  insert(
    host,
    Plot.plot({
      marginLeft: 64,
      marginRight: 56,
      marginTop: 8,
      marginBottom: 28,
      x: { label: null },
      y: { domain: rows.map(r => String(r.dim)), label: null },
      marks: [
        Plot.barX(rows, { y: r => String(r.dim), x: r => Number(r.events_per_user), fill: ACCENT, tip: TIP, title: r => `${String(r.dim)}\n人均行为数 ${Number(r.events_per_user).toFixed(2)}` }),
        Plot.text(rows, {
          y: r => String(r.dim),
          x: r => Number(r.events_per_user),
          textAnchor: "start",
          dx: 3,
          text: r => Number(r.events_per_user).toFixed(2),
        }),
      ],
      width: width(host),
      height: 140,
      style: { font: "inherit" },
    }),
  );
}

export async function renderPreset(qid: string, host: Element): Promise<void> {
  const res = await fetch(`/assets/data-stories/userbehavior/presets/${qid}.json`);
  if (!res.ok) throw new Error(`preset ${qid} 加载失败：${res.status}`);
  const preset = (await res.json()) as { rows: Row[] };
  const rows = preset.rows;
  switch (qid) {
    case "q01":
      bigNumbers(
        [
          { label: "行为", value: fmt.format(Number(rows[0].events)) },
          { label: "用户", value: fmt.format(Number(rows[0].users)) },
          { label: "商品", value: fmt.format(Number(rows[0].items)) },
          { label: "类目", value: fmt.format(Number(rows[0].categories)) },
        ],
        host,
      );
      break;
    case "q02":
      barX(rows, host, "event_count");
      break;
    case "q03":
      areaDay(rows, host);
      break;
    case "q04":
      columnHour(rows, host);
      break;
    case "q05":
      barX(rows, host, "event_count");
      break;
    case "q06":
      barRate(rows, host);
      break;
    case "q07":
      bigNumbers(
        [
          { label: `加购未买用户（共 ${fmt.format(Number(rows[0].users))} 人）`, value: `${Number(rows[0].pct_cart_no_buy).toFixed(2)}%` },
        ],
        host,
        "sm:grid-cols-1",
      );
      break;
    case "q08":
      bigNumbers([{ label: "复购用户（buy≥2）", value: `${Number(rows[0].pct_repurchase).toFixed(2)}%` }], host);
      break;
    case "q09":
      barX(rows, host, "user_count");
      break;
    case "q10":
      compare(rows, host);
      break;
    case "q11":
      bigNumbers(
        [
          { label: "购买用户", value: fmt.format(Number(rows[0].buyers)) },
          { label: "仅一次购买（占购买用户）", value: `${Number(rows[0].pct_once).toFixed(2)}%` },
          { label: "复购用户（buy≥2）", value: fmt.format(Number(rows[0].repeat_buyers)) },
          { label: "活跃仅一天用户（占全体）", value: `${Number(rows[0].pct_one_day_active).toFixed(2)}%` },
        ],
        host,
      );
      break;
    case "q12":
      barX(rows, host, "user_count");
      break;
    default:
      throw new Error(`未知 preset ${qid}`);
  }
}

// 查询框结果：与预置图同款的条形 + 小表（metric 决定排序键与条形取值）。
// 图截前 20 行（可读性）、表列全量（limit 上限 50）——展示口径差异有意为之。
export function renderRows(rows: Row[], host: Element, metric: "event_count" | "user_count"): void {
  host.replaceChildren();
  const shown = rows.slice(0, 20);
  if (!shown.length) {
    const p = document.createElement("p");
    p.className = "text-foreground/75 text-sm";
    p.textContent = "查询结果为空（区间或筛选条件下没有数据）。";
    host.append(p);
    return;
  }
  barX(shown, host, metric);
  const table = document.createElement("table");
  table.className = "text-sm mt-3 w-full";
  const head = table.insertRow();
  for (const h of ["维度值", "行为数", "用户数"]) {
    const th = document.createElement("th");
    th.className = "border-border border-b px-2 py-1 text-start";
    th.textContent = h;
    head.append(th);
  }
  for (const r of rows) {
    const tr = table.insertRow();
    for (const v of [String(r.dim), fmt.format(Number(r.event_count)), fmt.format(Number(r.user_count))]) {
      const td = tr.insertCell();
      td.className = "border-border/60 border-b px-2 py-1";
      td.textContent = v;
    }
  }
  host.append(table);
}
