import { z } from "zod";

export const SentimentEnum = z.enum(["positive", "negative", "mixed"]);

export const ThemeSchema = z.object({
  name: z.string().min(1).max(20),
  summary: z.string().min(1),
  sentiment: SentimentEnum,
  count: z.number().int().min(1),
  quotes: z.array(z.string()).max(3),
  impact: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(5),
  opportunities: z.array(z.string()),
});

export const InsightsReportSchema = z.object({
  // 1 下限：反馈高度同质（如 6 条完全相同的故障报告）时聚出 1 个主题是诚实的答案；
  // 12 上限：30 条量级的多元输入 8 类不够用（基线运行 fb-007 实测 9 类才是好分析）
  themes: z.array(ThemeSchema).min(1).max(12),
  overallSentiment: SentimentEnum,
  notableOutliers: z.array(z.string()),
});
export type InsightsReport = z.infer<typeof InsightsReportSchema>;

export function parseInsightsReport(
  text: string,
): { ok: true; report: InsightsReport } | { ok: false; error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return { ok: false, error: "模型输出中未找到 JSON" };
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: "JSON 解析失败（输出被截断或格式错误）" };
  }
  const parsed = InsightsReportSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `输出结构不符合约定：${first?.path.join(".")} ${first?.message}` };
  }
  return { ok: true, report: parsed.data };
}
