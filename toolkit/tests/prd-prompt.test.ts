import { describe, expect, it } from "vitest";
import { buildPrdMessages, PROMPT_VERSION } from "@/prompts/prd-draft";
import { prdInputSchema } from "@/tools/schemas";

const input = prdInputSchema.parse({
  moduleName: "随手记账",
  requirementName: "月度报告导出 PDF",
  background: "用户想保存/分享月度消费报告，当前只能截图，排版差。",
  users: "大学生用户，月底查看并分享消费报告给家人。",
  constraints: "小程序环境，不支持原生分享之外的弹窗。",
});

describe("PRD 提示词", () => {
  it("system 含六章骨架与【待补充】铁律", () => {
    const sys = buildPrdMessages(input)[0].content;
    for (const h of ["一、背景与目标", "三、用户故事与功能需求", "五、非功能需求", "六、风险与开放问题"]) {
      expect(sys).toContain(h);
    }
    expect(sys).toContain("【待补充");
    expect(sys).toContain("P0/P1/P2");
  });
  it("user 含输入插值", () => {
    const user = buildPrdMessages(input)[1].content;
    expect(user).toContain("月度报告导出 PDF");
    expect(user).toContain("小程序环境");
  });
  it("版本号已声明", () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
