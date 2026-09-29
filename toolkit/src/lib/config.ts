// 全局默认值与服务器侧 LLM 配置。客户端只 import 常量，禁止在客户端调用 serverLlmConfig。
export const DEFAULT_MAX_INPUT_TOKENS = 8000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
export const DEFAULT_LLM_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_LLM_MODEL = "deepseek-chat";

export interface ServerLlmConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  forceMock: boolean;
}

export function serverLlmConfig(): ServerLlmConfig {
  return {
    apiKey: process.env.LLM_API_KEY ?? "",
    baseURL: process.env.LLM_BASE_URL || DEFAULT_LLM_BASE_URL,
    model: process.env.LLM_MODEL || DEFAULT_LLM_MODEL,
    maxInputTokens:
      Number.parseInt(process.env.LLM_MAX_INPUT_TOKENS ?? "", 10) ||
      DEFAULT_MAX_INPUT_TOKENS,
    maxOutputTokens:
      Number.parseInt(process.env.LLM_MAX_OUTPUT_TOKENS ?? "", 10) ||
      DEFAULT_MAX_OUTPUT_TOKENS,
    forceMock: process.env.MOCK_LLM === "1",
  };
}

// 安全审查 F1：API 同源白名单。默认生产域 + 本地开发域，可用 ALLOWED_ORIGINS 覆盖
// （Vercel 预览域名等）。无 Origin 的脚本请求（evals 等）不在浏览器威胁模型内，另行放行。
export function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.ALLOWED_ORIGINS ?? "https://toolbox.yuhailinlxy.com,http://localhost:3000")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
