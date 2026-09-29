import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { serverLlmConfig, allowedOrigins } from "@/lib/config";
import { estimateMessagesTokens } from "@/lib/token-estimate";
import { getProvider, type ChatMessage } from "@/lib/llm";
import { buildRepairRequest } from "@/tools/contracts";
import { getTool } from "@/tools/registry";

const bodySchema = z.object({
  input: z.unknown(),
  force: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
) {
  const { tool: toolId } = await params;
  const def = getTool(toolId);
  if (!def) {
    return NextResponse.json({ code: "NOT_FOUND", message: `未知工具：${toolId}` }, { status: 404 });
  }

  // 安全审查 F1：浏览器侧跨站请求拒绝。无 Origin 的脚本请求（evals 等）放行，
  // 脚本滥用由平台限流（Vercel Firewall）与 LLM 余额上限兜底——代码层只是减速带。
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) {
    return NextResponse.json(
      { code: "FORBIDDEN_ORIGIN", message: "请求来源不被允许" },
      { status: 403 },
    );
  }

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ code: "INVALID_INPUT", message: "请求体格式不正确" }, { status: 400 });
  }
  const parsedInput = def.inputSchema.safeParse(body.data.input);
  if (!parsedInput.success) {
    return NextResponse.json(
      { code: "INVALID_INPUT", issues: parsedInput.error.issues },
      { status: 400 },
    );
  }

  const cfg = serverLlmConfig();
  const messages = def.buildMessages(parsedInput.data);
  const estimated = estimateMessagesTokens(messages);
  // force 旁路仅限非生产：无鉴权公网 API 上"用户显式确认"对脚本无意义
  const forceAllowed = process.env.VERCEL_ENV !== "production";
  if (estimated > cfg.maxInputTokens && !(forceAllowed && body.data.force)) {
    console.warn(`[token-budget] tool=${toolId} estimated=${estimated} max=${cfg.maxInputTokens}`);
    // 不回显 estimated/max：逐次回显测量值等于帮探测者校准攻击参数
    return NextResponse.json(
      { code: "TOKEN_BUDGET", message: "输入超过单次上限，请精简输入" },
      { status: 400 },
    );
  }

  const provider = getProvider(cfg, def.fixture);
  const responseHeaders = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-PMForge-Mode": provider.id,
  };

  // 输出契约校验（如 feedback-insights 的数量守恒/引用逐字）需要完整输出：
  // 缓冲生成结果，机械验收不通过时带着具体违例重试一次，两次都不过则按原样返回首次输出。
  // mock 是写死的演示 fixture，不参与校验。
  if (def.validateOutput && provider.id !== "mock") {
    let first = "";
    try {
      for await (const chunk of provider.chatStream({
        messages,
        maxOutputTokens: cfg.maxOutputTokens,
      })) {
        first += chunk;
      }
    } catch (e) {
      // 与流式路径同一约定：显式失败标记，客户端据此拦截保存与导出
      first += `\n\n[生成失败：${e instanceof Error ? e.message : String(e)}]`;
      return new Response(first, { headers: responseHeaders });
    }
    const violations = def.validateOutput(first, parsedInput.data);
    if (violations.length > 0) {
      console.warn(`[contract-retry] tool=${toolId} 违例 ${violations.length} 项，重试一次`);
      const retryMessages: ChatMessage[] = [
        ...messages,
        { role: "assistant", content: first },
        { role: "user", content: buildRepairRequest(violations) },
      ];
      try {
        let second = "";
        for await (const chunk of provider.chatStream({
          messages: retryMessages,
          maxOutputTokens: cfg.maxOutputTokens,
        })) {
          second += chunk;
        }
        if (
          !second.includes("[生成失败") &&
          def.validateOutput(second, parsedInput.data).length === 0
        ) {
          return new Response(second, { headers: responseHeaders });
        }
      } catch {
        // 重试失败：沿用首次输出
      }
    }
    return new Response(first, { headers: responseHeaders });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const chunk of provider.chatStream({
          messages,
          maxOutputTokens: cfg.maxOutputTokens,
        })) {
          controller.enqueue(enc.encode(chunk));
        }
      } catch (e) {
        // 已开流无法改状态码：追加显式失败标记，客户端据此拦截保存与导出
        controller.enqueue(enc.encode(`\n\n[生成失败：${e instanceof Error ? e.message : String(e)}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: responseHeaders });
}
