// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { feedbackInputSchema } from "@/tools/schemas";

// getProvider 打桩：按脚本依次吐出预设输出，记录每次收到的 messages
const calls: { role: string; content: string }[][] = [];
let script: string[] = [];
let providerId = "openai-compatible";

vi.mock("@/lib/llm", () => ({
  getProvider: () => ({
    id: providerId,
    async *chatStream(req: { messages: { role: string; content: string }[] }) {
      calls.push(req.messages);
      yield script.shift() ?? "";
    },
  }),
}));

const { POST } = await import("@/app/api/tools/[tool]/route");

// Next 16 收紧路由 handler 类型（NextRequest 必选），测试构造与运行时同形的请求对象
function req(body: unknown) {
  return new NextRequest("http://localhost/api/tools/feedback-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ tool: "feedback-insights" }) };

const input = feedbackInputSchema.parse({
  feedbacks: ["等了十分钟没人接单", "高峰期根本叫不到车", "司机爽约了", "界面很好看", "支付总是失败", "客服不理人"],
});

const validOutput = JSON.stringify({
  themes: [
    { name: "叫车匹配慢", summary: "高峰期无人接单", sentiment: "negative", count: 3, quotes: ["等了十分钟没人接单"], impact: 4, severity: 5, opportunities: ["超时改派"] },
    { name: "履约与支付", summary: "爽约与支付失败", sentiment: "negative", count: 2, quotes: ["司机爽约了"], impact: 4, severity: 5, opportunities: ["信用分"] },
    { name: "正面与客服", summary: "界面受认可", sentiment: "mixed", count: 1, quotes: ["界面很好看"], impact: 2, severity: 1, opportunities: ["保持设计"] },
  ],
  overallSentiment: "negative",
  notableOutliers: [],
});
const invalidOutput = JSON.stringify({
  themes: [
    { name: "叫车匹配慢", summary: "高峰期无人接单", sentiment: "negative", count: 3, quotes: ["等了十分钟没人接单"], impact: 4, severity: 5, opportunities: ["超时改派"] },
  ],
  overallSentiment: "negative",
  notableOutliers: [],
});

beforeEach(() => {
  calls.length = 0;
  providerId = "openai-compatible";
});

describe("route 输出契约校验与重试", () => {
  it("首次输出通过契约 → 不重试，原样返回", async () => {
    script = [validOutput];
    const res = await POST(req({ input }), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(validOutput);
    expect(calls).toHaveLength(1);
  });
  it("首次违例 → 带具体违例重试，采用通过校验的第二次输出", async () => {
    script = [invalidOutput, validOutput];
    const res = await POST(req({ input }), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(validOutput);
    expect(calls).toHaveLength(2);
    // 重试请求应包含首次输出与修复指令
    const retryMessages = calls[1]!;
    expect(retryMessages.some((m) => m.role === "assistant" && m.content === invalidOutput)).toBe(true);
    expect(retryMessages.some((m) => m.role === "user" && m.content.includes("只能归入一个主题"))).toBe(true);
  });
  it("重试后仍违例 → 回退返回首次输出", async () => {
    script = [invalidOutput, invalidOutput];
    const res = await POST(req({ input }), ctx);
    expect(await res.text()).toBe(invalidOutput);
    expect(calls).toHaveLength(2);
  });
  it("mock 模式跳过契约校验", async () => {
    providerId = "mock";
    script = [invalidOutput];
    const res = await POST(req({ input }), ctx);
    expect(await res.text()).toBe(invalidOutput);
    expect(calls).toHaveLength(1);
  });
});
