import { parseInsightsReport } from "@/lib/insights";
import type { FeedbackInput } from "./schemas";

// feedback-insights 输出契约的服务端机械校验（evals 基线实测两类真实违例：
// fb-003 JSON 格式滑丝、fb-011 同条反馈被计入两个主题）。返回违例清单，空数组 = 通过。
// 只做代码可判定项；语义质量（摘要是否到位、机会点是否可行）不在此层。
export function feedbackContractViolations(output: string, input: FeedbackInput): string[] {
  const parsed = parseInsightsReport(output);
  if (!parsed.ok) return [`输出不是符合契约的 JSON：${parsed.error}`];
  const report = parsed.report;
  const violations: string[] = [];

  const total = report.themes.reduce((sum, t) => sum + t.count, 0);
  const n = input.feedbacks.length;
  const partitioned = total === n || (total < n && report.notableOutliers.length > 0);
  if (!partitioned) {
    violations.push(
      `所有 themes 的 count 之和为 ${total}，但反馈共 ${n} 条：每条反馈必须且只能归入一个主题，禁止同一反馈计入两个主题（无法归类的反馈改放 notableOutliers）`,
    );
  }

  const joined = input.feedbacks.join("");
  for (const t of report.themes) {
    for (const q of t.quotes) {
      if (!joined.includes(q)) {
        const preview = q.length > 24 ? `${q.slice(0, 24)}…` : q;
        violations.push(`主题「${t.name}」存在非逐字引用："${preview}"——quotes 必须是输入反馈正文的逐字子串`);
      }
    }
  }
  return violations;
}

export function buildRepairRequest(violations: string[]): string {
  return [
    "你上一次的输出违反了输出契约，具体如下：",
    ...violations.map((v, i) => `${i + 1}. ${v}`),
    "请修正后重新输出完整结果：只输出符合契约的 JSON 对象，不要任何解释文字，不要代码围栏。",
  ].join("\n");
}
