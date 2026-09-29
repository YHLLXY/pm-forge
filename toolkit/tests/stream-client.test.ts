// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { streamToolRun, ToolRunError } from "@/lib/stream-client";

function streamResponse(chunks: string[], headers: Record<string, string> = {}) {
  const stream = new ReadableStream({
    start(c) {
      const enc = new TextEncoder();
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      c.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
  });
}

describe("streamToolRun", () => {
  it("按块回调并返回 mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamResponse(["你好", "世界"], { "X-PMForge-Mode": "mock" }),
      ),
    );
    const parts: string[] = [];
    const { mode } = await streamToolRun("prd-draft", { input: {} }, (t) => parts.push(t));
    expect(mode).toBe("mock");
    expect(parts.join("")).toBe("你好世界");
    vi.unstubAllGlobals();
  });

  it("JSON 错误响应抛 ToolRunError 并带 code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "TOKEN_BUDGET", estimated: 9000, max: 8000 }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(streamToolRun("prd-draft", { input: {} }, () => {})).rejects.toBeInstanceOf(
      ToolRunError,
    );
    vi.unstubAllGlobals();
  });

  it("TOKEN_BUDGET 文案不含内部测量值（服务端不回显 estimated/max）", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "TOKEN_BUDGET", estimated: 9000, max: 8000 }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    try {
      await streamToolRun("prd-draft", { input: {} }, () => {});
      expect.unreachable("应当抛错");
    } catch (e) {
      expect((e as ToolRunError).message).toContain("超过单次上限");
      expect((e as ToolRunError).message).not.toContain("9000");
      expect((e as ToolRunError).message).not.toContain("8000");
    }
    vi.unstubAllGlobals();
  });
});
