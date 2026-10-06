// site/src/scripts/story/allowed-queries.ts —— 全站唯一 SQL 拼装点；纯函数、零 DOM、可单测
// 输入只接受白名单枚举与受检字面量：behavior=枚举、limit=整数域 1-50、日期=YYYY-MM-DD 正则。
// 任何自由文本都不进 SQL（查询框 UI 也只产这些类型）。
export const BEHAVIORS = ["pv", "cart", "fav", "buy"] as const;
export const DIMS = ["behavior_type", "category_id", "day"] as const;

export type Behavior = (typeof BEHAVIORS)[number];
export type Dim = (typeof DIMS)[number];
export type Metric = "event_count" | "user_count";

export type QuerySpec = {
  behavior?: Behavior;
  dim: Dim;
  metric: Metric;
  limit: number;
  dayFrom?: string;
  dayTo?: string;
};

// 墙钟口径与 precompute_story.py 一致：UTC+8 = Unix 秒 + 28800，DATE 基准纯整数运算
const DAY_EXPR = "strftime(DATE '1970-01-01' + CAST((ts + 28800) // 86400 AS INTEGER), '%Y-%m-%d')";
const DIM_EXPR: Record<Dim, string> = {
  behavior_type: "behavior_type",
  category_id: "category_id",
  day: DAY_EXPR,
};

export function buildQuery(spec: QuerySpec): string {
  if (!(Number.isInteger(spec.limit) && spec.limit >= 1 && spec.limit <= 50)) {
    throw new Error("limit 须为 1-50 的整数");
  }
  const conds: string[] = [];
  if (spec.behavior) conds.push(`behavior_type = '${spec.behavior}'`);
  for (const [key, value] of [["dayFrom", spec.dayFrom], ["dayTo", spec.dayTo]] as const) {
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key} 须为 YYYY-MM-DD`);
    conds.push(`${DAY_EXPR} ${key === "dayFrom" ? ">=" : "<="} '${value}'`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const dimExpr = DIM_EXPR[spec.dim];
  const groupCol = spec.dim === "day" ? DAY_EXPR : spec.dim;
  return `SELECT ${dimExpr} AS dim, count(*) AS event_count, count(DISTINCT user_id) AS user_count FROM events ${where} GROUP BY ${groupCol} ORDER BY ${spec.metric} DESC LIMIT ${spec.limit}`;
}
