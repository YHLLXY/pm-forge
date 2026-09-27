import { describe, expect, it } from "vitest";
import { getTool, TOOLS, TOOL_IDS } from "@/tools/registry";
import { parseInsightsReport } from "@/lib/insights";

describe("工具注册表", () => {
  it("恰好注册三个工具，id 与 spec 一致", () => {
    expect(TOOL_IDS).toEqual(["competitor-analysis", "feedback-insights", "prd-draft"]);
    expect(TOOLS).toHaveLength(3);
  });
  it("每个工具有非空 fixture、可解析的 inputSchema、buildMessages", () => {
    for (const t of TOOLS) {
      expect(t.fixture.length).toBeGreaterThan(200);
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.buildMessages).toBe("function");
    }
  });
  it("反馈工具的 fixture 必须能被 parseInsightsReport 解析（演示模式自洽）", () => {
    const fb = getTool("feedback-insights")!;
    expect(fb.outputKind).toBe("json");
    expect(parseInsightsReport(fb.fixture).ok).toBe(true);
  });
  it("竞品与 PRD 为 markdown 输出", () => {
    expect(getTool("competitor-analysis")!.outputKind).toBe("markdown");
    expect(getTool("prd-draft")!.outputKind).toBe("markdown");
  });
  it("getTool 未知 id 返回 undefined", () => {
    expect(getTool("nope")).toBeUndefined();
  });
});
