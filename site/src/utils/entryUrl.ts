/** 集合内容为平铺单文件（id 即 slug）。/toolbox/reports/ 归工具箱板块。 */
export function entryUrl(
  collection: "case-studies" | "analysis",
  id: string
): string {
  return `/${collection}/${id}/`;
}

export function toolkitReportUrl(id: string): string {
  return `/toolbox/reports/${id}/`;
}
