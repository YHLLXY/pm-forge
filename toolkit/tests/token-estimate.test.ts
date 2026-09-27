import { describe, expect, it } from "vitest";
import {
  checkBudget,
  estimateMessagesTokens,
  estimateTextTokens,
} from "@/lib/token-estimate";

describe("token 估算", () => {
  it("空字符串为 0", () => {
    expect(estimateTextTokens("")).toBe(0);
  });

  it("按 0.7 token/字符向上取整（中文为主，偏保守）", () => {
    expect(estimateTextTokens("a")).toBe(1); // ceil(0.7)
    expect(estimateTextTokens("一二三")).toBe(3); // ceil(2.1)
    expect(estimateTextTokens("一".repeat(10))).toBe(7); // ceil(7.0)
  });

  it("每条消息额外计 24 token 开销", () => {
    const messages = [
      { role: "system", content: "一".repeat(100) },
      { role: "user", content: "一".repeat(100) },
    ];
    expect(estimateMessagesTokens(messages)).toBe(140 + 48);
  });
});

describe("预算守卫", () => {
  it("未超限返回 over=false", () => {
    expect(checkBudget(100, 8000)).toEqual({
      over: false,
      estimated: 100,
      max: 8000,
    });
  });
  it("超限返回 over=true，附估值与上限", () => {
    expect(checkBudget(8001, 8000).over).toBe(true);
  });
});
