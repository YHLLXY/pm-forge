import { getCollection } from "astro:content";

export type EvidenceRow = {
  key: string; // 稳定标识，供 check-home-metrics.mjs 比对
  label: string;
  value: number;
  unit: string;
  href: string; // 页内锚点
  note?: string; // 小字补充，只在有真实口径可写时给
};

export type Evidence = { rows: EvidenceRow[]; latest: Date };

/**
 * 首页证据面板的**唯一**取数来源：全部来自内容集合的真实统计，不手写任何数字。
 * 页面只消费不计算（深模块）；门禁 check-home-metrics.mjs 会用另一份独立实现重算同一批数字，
 * 两边对不上就让构建失败 —— 这是"面板上没有假数字"的机械保证。
 *
 * 明确不取：访问量/阅读数、GitHub star 或活跃度（需构建期访问外网）、手写的 Lighthouse 分数。
 */
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

  // 最近更新 = 构建期常量。不要在客户端算"距今几天"：那必然引起文本变化，是白送的 CLS 风险。
  const dates = [...cases, ...analysis, ...dissections, ...reports]
    .map(e => e.data.pubDatetime)
    .filter((d): d is Date => d instanceof Date);
  const latest = dates.length ? new Date(Math.max(...dates.map(d => d.valueOf()))) : new Date();

  const rows: EvidenceRow[] = [
    {
      key: "cases",
      label: "案例研究",
      value: cases.length,
      unit: "篇",
      href: "#featured",
      note: liveCases ? `其中 ${liveCases} 个可在线访问` : undefined,
    },
    { key: "analysis", label: "数据分析报告", value: analysis.length, unit: "篇", href: "#analysis" },
    { key: "dissections", label: "AI 产品拆解", value: dissections.length, unit: "篇", href: "#dissections" },
    {
      key: "records",
      label: "实测记录",
      value: records.length,
      unit: "条",
      href: "#dissections",
      // 口径与 check-dissections.mjs 的"报告数字 ↔ 记录集合一致性"校验一致，不另立一套
      note: `成功 ${tally("成功")} · 部分 ${tally("部分")} · 失败 ${tally("失败")}`,
    },
    { key: "reports", label: "工具实跑报告", value: reports.length, unit: "篇", href: "#toolbox" },
  ];

  return { rows, latest };
}
