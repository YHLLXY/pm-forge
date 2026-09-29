import { describe, expect, it } from "vitest";
import { parseInsightsReport } from "@/lib/insights";
import { buildFeedbackMessages } from "@/prompts/feedback-insights";
import { feedbackInputSchema } from "@/tools/schemas";

const VALID_JSON = JSON.stringify({
  themes: [
    {
      name: "叫车匹配慢",
      summary: "高峰期发单后长时间无人接单",
      sentiment: "negative",
      count: 2,
      quotes: ["等了十分钟没人接单"],
      impact: 4,
      severity: 5,
      opportunities: ["上线等待超时自动加价/改派"],
    },
  ],
  overallSentiment: "negative",
  notableOutliers: [],
});

describe("parseInsightsReport", () => {
  it("解析合法 JSON", () => {
    const r = parseInsightsReport(VALID_JSON);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.report.themes[0].name).toBe("叫车匹配慢");
  });
  it("容忍 ```json 围栏与前后废话", () => {
    expect(parseInsightsReport(`好的，以下是结果：\n\`\`\`json\n${VALID_JSON}\n\`\`\``).ok).toBe(true);
  });
  it("拒绝缺字段与坏枚举", () => {
    expect(parseInsightsReport('{"themes":[]}').ok).toBe(false);
    expect(
      parseInsightsReport(
        '{"themes":[{"name":"a","summary":"b","sentiment":" angry","count":1,"quotes":[],"impact":1,"severity":1,"opportunities":[]}],"overallSentiment":"negative","notableOutliers":[]}',
      ).ok,
    ).toBe(false);
    expect(parseInsightsReport("完全没有 JSON").ok).toBe(false);
  });
});

describe("反馈洞察提示词", () => {
  const input = feedbackInputSchema.parse({
    productContext: "校园拼车小程序",
    feedbacks: ["等了十分钟没人接单", "司机爽约了", "界面很好看", "支付总是失败", "想要包月套餐", "客服不理人"],
  });
  it("system 含 JSON 契约与引用铁律", () => {
    const sys = buildFeedbackMessages(input)[0].content;
    expect(sys).toContain('"themes"');
    expect(sys).toContain("逐字");
    expect(sys).toContain("3-8");
    // v1.1：反双计与输出前自查（基线 fb-011 双计、fb-003 JSON 滑丝的针对性约束）
    expect(sys).toContain("禁止同一条反馈计入两个主题");
    expect(sys).toContain("输出前自查");
  });
  it("user 含编号反馈与产品背景", () => {
    const user = buildFeedbackMessages(input)[1].content;
    expect(user).toContain("F01");
    expect(user).toContain("校园拼车小程序");
    expect(user).toContain("客服不理人");
  });
});
