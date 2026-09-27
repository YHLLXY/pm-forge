import { describe, expect, it, vi } from "vitest";
import { createMockProvider, getProvider } from "@/lib/llm";
import { createOpenAIProvider } from "@/lib/llm/openai-provider";

// openai SDK 打桩：验证配置透传与增量拼接，不打真网络
vi.mock("openai", () => {
  const create = vi.fn(async function* () {
    yield { choices: [{ delta: { content: "你好" } }] };
    yield { choices: [{ delta: { content: "，世界" } }] };
    yield { choices: [{ delta: {} }] };
  });
  class OpenAI {
    chat = { completions: { create } };
    constructor(public opts: { apiKey: string; baseURL: string }) {}
  }
  return { default: OpenAI };
});

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const c of gen) out += c;
  return out;
}

describe("mock provider", () => {
  it("按顺序分块吐出完整文本", async () => {
    const p = createMockProvider("ABCDEF");
    expect(p.id).toBe("mock");
    const text = await collect(p.chatStream({ messages: [] }));
    expect(text).toBe("ABCDEF");
  });
});

describe("openai provider", () => {
  it("拼接 delta.content 为全文", async () => {
    const p = createOpenAIProvider({
      apiKey: "sk-test",
      baseURL: "https://api.deepseek.com",
      model: "deepseek-chat",
    });
    const text = await collect(
      p.chatStream({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(text).toBe("你好，世界");
  });
});

describe("getProvider 工厂", () => {
  it("无 key 回落 mock", () => {
    const p = getProvider(
      { apiKey: "", baseURL: "", model: "", maxInputTokens: 0, maxOutputTokens: 0, forceMock: false },
      "样例",
    );
    expect(p.id).toBe("mock");
  });
  it("forceMock=1 强制 mock", () => {
    const p = getProvider(
      { apiKey: "sk-x", baseURL: "", model: "", maxInputTokens: 0, maxOutputTokens: 0, forceMock: true },
      "样例",
    );
    expect(p.id).toBe("mock");
  });
  it("有 key 且未 force 走 openai 兼容", () => {
    const p = getProvider(
      { apiKey: "sk-x", baseURL: "https://api.deepseek.com", model: "deepseek-chat", maxInputTokens: 0, maxOutputTokens: 0, forceMock: false },
      "样例",
    );
    expect(p.id).toBe("openai-compatible");
  });
});
