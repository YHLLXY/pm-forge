/** 集合 → OG 图文件名前缀（与 scripts/og/card.mjs 的 COLLECTIONS 一一对应） */
const KEYS = {
  caseStudies: "case",
  analysis: "analysis",
  dissections: "dissection",
  toolkitReports: "toolbox",
} as const;

export type OgCollection = keyof typeof KEYS;

/** 逐页 OG 图路径（纯函数，页面不手拼字符串） */
export function ogImageFor(collection: OgCollection, id: string): string {
  return `/og/${KEYS[collection]}-${id}.png`;
}
