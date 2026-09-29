import { describe, expect, it } from "vitest";
import { buildRepairRequest, feedbackContractViolations } from "@/tools/contracts";
import { feedbackInputSchema } from "@/tools/schemas";

const FEEDBACKS = [
  "等了十分钟没人接单",
  "高峰期根本叫不到车",
  "司机爽约了",
  "界面很好看",
  "支付总是失败",
  "客服不理人",
];
const input = feedbackInputSchema.parse({ feedbacks: FEEDBACKS });

function theme(over: Record<string, unknown> = {}) {
  return {
    name: "叫车匹配慢",
    summary: "高峰期发单后长时间无人接单",
    sentiment: "negative",
    count: 1,
    quotes: ["等了十分钟没人接单"],
    impact: 4,
    severity: 5,
    opportunities: ["等待超时自动改派"],
    ...over,
  };
}

describe("feedbackContractViolations", () => {
  it("count 守恒 + 引用逐字 → 无违例", () => {
    const out = JSON.stringify({
      themes: [
        theme({ count: 3 }),
        theme({ name: "履约差", quotes: ["司机爽约了"], count: 2 }),
        theme({ name: "支付", quotes: ["支付总是失败"], count: 1 }),
      ],
      overallSentiment: "negative",
      notableOutliers: [],
    });
    expect(feedbackContractViolations(out, input)).toEqual([]);
  });
  it("count 之和小于条数但有 outliers → 通过", () => {
    const out = JSON.stringify({
      themes: [theme({ count: 4 })],
      overallSentiment: "negative",
      notableOutliers: ["F05 支付总是失败"],
    });
    expect(feedbackContractViolations(out, input)).toEqual([]);
  });
  it("count 不守恒 → 报出总数与条数", () => {
    const out = JSON.stringify({
      themes: [theme({ count: 2 }), theme({ count: 1 })],
      overallSentiment: "negative",
      notableOutliers: [],
    });
    const v = feedbackContractViolations(out, input);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("3");
    expect(v[0]).toContain("6");
  });
  it("同一条反馈计入两个主题（总数对不上）→ 违例", () => {
    // 基线 fb-011 的真实形态：5 楼既出现在主题 1 又出现在主题 4
    const out = JSON.stringify({
      themes: [
        theme({ name: "楼层引用", count: 4 }),
        theme({ name: "小窗期待", quotes: ["高峰期根本叫不到车"], count: 3 }),
      ],
      overallSentiment: "negative",
      notableOutliers: [],
    });
    const v = feedbackContractViolations(out, input);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("只能归入一个主题");
  });
  it("非逐字引用 → 违例并给出预览", () => {
    const out = JSON.stringify({
      themes: [theme({ count: 6, quotes: ["等了十分钟没人接单啊"] })],
      overallSentiment: "negative",
      notableOutliers: [],
    });
    const v = feedbackContractViolations(out, input);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("非逐字");
  });
  it("JSON 格式滑丝（键名缺引号）→ 报 JSON 违例", () => {
    const bad = '{"themes":[{"name": "主题", count": 1}]}';
    const v = feedbackContractViolations(bad, input);
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("JSON");
  });
  it("容忍围栏与前后缀话", () => {
    const wrapped = `好的，以下是结果：\n\`\`\`json\n${JSON.stringify({
      themes: [theme({ count: 6 })],
      overallSentiment: "negative",
      notableOutliers: [],
    })}\n\`\`\``;
    expect(feedbackContractViolations(wrapped, input)).toEqual([]);
  });
});

describe("buildRepairRequest", () => {
  it("逐条编号并要求只输出 JSON", () => {
    const msg = buildRepairRequest(["违例一", "违例二"]);
    expect(msg).toContain("1. 违例一");
    expect(msg).toContain("2. 违例二");
    expect(msg).toContain("只输出");
  });
});
