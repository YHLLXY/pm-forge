import config from "@/config";

/**
 * 站点时区下的 "MM.DD"。两处在用：案例速览表、首页证据面板第 6 格。
 * 为什么不是 toLocaleDateString：默认 locale 的格式随浏览器语言变，构建期 Node 与
 * 浏览器可能不一致；en-CA 固定输出 YYYY-MM-DD，切片最稳。
 * 为什么不用 getMonth：跨月边界会按本地时区错一个月（2026-10-27 踩过）。
 */
export const monthDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    day: "2-digit",
    timeZone: config.site.timezone,
  })
    .format(d)
    .replace("-", ".");

/** 站点时区下的 "YYYY-MM-DD"。 */
export const isoDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: config.site.timezone,
  }).format(d);
