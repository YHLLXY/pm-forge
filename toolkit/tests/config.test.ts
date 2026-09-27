import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_BASE_URL,
  DEFAULT_LLM_MODEL,
  DEFAULT_MAX_INPUT_TOKENS,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from "@/lib/config";

describe("lib/config 常量", () => {
  it("默认值与计划一致", () => {
    expect(DEFAULT_MAX_INPUT_TOKENS).toBe(8000);
    expect(DEFAULT_MAX_OUTPUT_TOKENS).toBe(4096);
    expect(DEFAULT_LLM_BASE_URL).toBe("https://api.deepseek.com");
    expect(DEFAULT_LLM_MODEL).toBe("deepseek-chat");
  });

  it("serverLlmConfig 读取环境变量并可回落默认值", async () => {
    const { serverLlmConfig } = await import("@/lib/config");
    const cfg = serverLlmConfig();
    expect(cfg.apiKey).toBe(""); // 测试环境无 key
    expect(cfg.baseURL).toBe(DEFAULT_LLM_BASE_URL);
    expect(cfg.forceMock).toBe(false);
  });
});
