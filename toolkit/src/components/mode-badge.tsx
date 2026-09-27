"use client";

import { useEffect, useState } from "react";

export function ModeBadge() {
  const [state, setState] = useState<{
    mode: "loading" | "mock" | "live" | "error";
    model: string | null;
  }>({ mode: "loading", model: null });

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setState({ mode: d.mode, model: d.model ?? null }))
      .catch(() => setState({ mode: "error", model: null }));
  }, []);

  if (state.mode === "loading") return null;
  if (state.mode === "error") {
    return (
      <span data-testid="mode-badge" className="inline-block rounded-full bg-neutral-200 px-3 py-1 text-xs">
        服务状态未知
      </span>
    );
  }
  if (state.mode === "mock") {
    return (
      <span
        data-testid="mode-badge"
        className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800"
      >
        演示模式：未配置 API Key，输出为固定样例
      </span>
    );
  }
  return (
    <span
      data-testid="mode-badge"
      className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs text-green-800"
    >
      已连接 · {state.model}
    </span>
  );
}
