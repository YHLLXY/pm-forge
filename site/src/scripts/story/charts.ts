// site/src/scripts/story/charts.ts —— Observable Plot 渲染层（Task 6 补全各 preset 分派）
// 职责边界：本文件不碰 DuckDB，输入永远是 JSON 数组（预生成 preset 或查询框结果）。
import * as Plot from "@observablehq/plot";

export type BarRow = { dim: string | number; value: number };

export function renderBar(rows: BarRow[], host: Element, opts?: { xLabel?: string }): void {
  const plot = Plot.plot({
    marginLeft: 64,
    marginRight: 40,
    marginTop: 8,
    marginBottom: 28,
    x: { label: opts?.xLabel ?? null },
    y: { domain: rows.map(r => String(r.dim)), label: null },
    marks: [
      Plot.barX(rows, { y: r => String(r.dim), x: "value", fill: "var(--accent)" }),
      Plot.text(rows, { y: r => String(r.dim), x: "value", textAnchor: "start", dx: 3, text: r => String(r.value) }),
    ],
    width: host.clientWidth,
    height: Math.min(260, 24 * rows.length + 36),
    style: { font: "inherit" },
  });
  host.append(plot);
}
