import type { LLMProvider } from "./types";

// 演示模式：按工具 fixture 流式吐出（同时是 e2e 的确定性基座，
// 对应 spec 风险表"工具箱演示模式用缓存样例输出"）。
export function createMockProvider(fixture: string): LLMProvider {
  return {
    id: "mock",
    async *chatStream() {
      const chunkSize = 24;
      for (let i = 0; i < fixture.length; i += chunkSize) {
        yield fixture.slice(i, i + chunkSize);
        await new Promise((r) => setTimeout(r, 10));
      }
    },
  };
}
