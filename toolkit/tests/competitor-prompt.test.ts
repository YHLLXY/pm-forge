import { describe, expect, it } from "vitest";
import { buildCompetitorMessages, PROMPT_VERSION } from "@/prompts/competitor-analysis";
import { competitorInputSchema } from "@/tools/schemas";

const sample = competitorInputSchema.parse({
  purpose: "为记账 App Q4 迭代选择差异化方向",
  myProduct: "随手记账：面向大学生的极简记账小程序，主打 10 秒记一笔",
  competitors: [{ name: "钱迹", notes: "无广告、资产管理强" }],
  materials: "应用商店评分 4.6，主要差评是报表太简单。",
});

describe("竞品分析提示词", () => {
  it("结构为 [system, user] 两条消息", () => {
    const msgs = buildCompetitorMessages(sample);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("system 含证据链三标注铁律与禁编数字规则", () => {
    const sys = buildCompetitorMessages(sample)[0].content;
    for (const mark of ["【依据输入】", "【行业常识】", "【推断】", "待验证"]) {
      expect(sys).toContain(mark);
    }
    expect(sys).toContain("0-4");
  });

  it("user 含输入插值与六章模板骨架", () => {
    const user = buildCompetitorMessages(sample)[1].content;
    expect(user).toContain("为记账 App Q4 迭代选择差异化方向");
    expect(user).toContain("钱迹");
    for (const h of ["一、分析目的", "三、竞品画像", "五、差异化与机会点", "六、信息来源"]) {
      expect(user).toContain(h);
    }
  });

  it("schema 拒绝空竞品并限制 1-5 个", () => {
    expect(
      competitorInputSchema.safeParse({ purpose: "x".repeat(10), myProduct: "y".repeat(20), competitors: [] }).success,
    ).toBe(false);
    expect(
      competitorInputSchema.safeParse({
        purpose: "x".repeat(10), myProduct: "y".repeat(20),
        competitors: Array.from({ length: 6 }, (_, i) => ({ name: `竞品${i}` })),
      }).success,
    ).toBe(false);
  });

  it("提示词版本号已声明", () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
