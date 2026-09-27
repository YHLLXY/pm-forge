export interface RunBody {
  input: unknown;
  force?: boolean;
}

export class ToolRunError extends Error {
  constructor(
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

function humanize(data: {
  code?: string;
  message?: string;
  estimated?: number;
  max?: number;
}): string {
  switch (data.code) {
    case "TOKEN_BUDGET":
      return `输入约 ${data.estimated} tokens，超过单次上限 ${data.max}。请精简输入，或在确认后强制继续。`;
    case "INVALID_INPUT":
      return "输入格式不正确，请检查表单后重试。";
    case "NOT_FOUND":
      return "未知工具。";
    default:
      return data.message ?? "请求失败，请重试。";
  }
}

export async function streamToolRun(
  toolId: string,
  body: RunBody,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ mode: string }> {
  const res = await fetch(`/api/tools/${toolId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const mode = res.headers.get("X-PMForge-Mode") ?? "unknown";
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!res.ok || contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({ code: "UNKNOWN" }));
    throw new ToolRunError(data.code ?? "UNKNOWN", humanize(data), data);
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
  return { mode };
}
