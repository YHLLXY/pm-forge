"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_MAX_INPUT_TOKENS } from "@/lib/config";
import { estimateMessagesTokens } from "@/lib/token-estimate";
import { streamToolRun, ToolRunError } from "@/lib/stream-client";
import {
  clearRuns,
  deleteRun,
  listRuns,
  saveRun,
  type HistoryEntry,
} from "@/lib/history";
import { parseInsightsReport } from "@/lib/insights";
import { getTool } from "@/tools/registry";
import { StreamingOutput } from "./streaming-output";
import { InsightsView } from "./insights-view";
import { HistoryPanel } from "./history-panel";
import { ModeBadge } from "./mode-badge";
import { CompetitorForm } from "./forms/competitor-form";
import { FeedbackForm } from "./forms/feedback-form";
import { PrdForm } from "./forms/prd-form";

const FORMS = {
  "competitor-analysis": CompetitorForm,
  "feedback-insights": FeedbackForm,
  "prd-draft": PrdForm,
} as const;

type Status = "idle" | "streaming" | "done" | "error";

export function ToolWorkbench({ toolId }: { toolId: string }) {
  const def = getTool(toolId)!;
  const Form = FORMS[def.id];

  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    input: unknown;
    estimated: number;
    max: number;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewing, setViewing] = useState<HistoryEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // 流式 chunk 累积器：React 状态更新异步，完成时的保存/导出需要同步读到全文
  const latestOutputRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(listRuns(toolId));
  }, [toolId]);

  function pushChunk(t: string) {
    latestOutputRef.current += t;
    setOutput(latestOutputRef.current);
  }

  async function run(input: unknown, force: boolean) {
    latestOutputRef.current = "";
    setStatus("streaming");
    setError(null);
    setOutput("");
    setViewing(null);
    setPending(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const { mode } = await streamToolRun(
        toolId,
        { input, force },
        pushChunk,
        ac.signal,
      );
      const finalText = latestOutputRef.current;
      if (finalText.includes("[生成失败：")) {
        setError("生成中途失败，结果不完整，已阻止保存与导出。");
        setStatus("error");
        return;
      }
      if (def.outputKind === "json" && !parseInsightsReport(finalText).ok) {
        setError("输出无法解析为约定的 JSON 结构（可能被截断），可重试一次。");
        setStatus("error");
        return;
      }
      saveRun(toolId, { mode, input, output: finalText });
      setHistory(listRuns(toolId));
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(e instanceof ToolRunError ? e.message : "网络错误，请重试。");
      setStatus("error");
    }
  }

  function handleSubmit(input: unknown) {
    const estimated = estimateMessagesTokens(def.buildMessages(input));
    if (estimated > DEFAULT_MAX_INPUT_TOKENS) {
      setPending({ input, estimated, max: DEFAULT_MAX_INPUT_TOKENS });
      return;
    }
    void run(input, false);
  }

  function handleCopy() {
    const text = viewing ? viewing.output : latestOutputRef.current;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError("复制失败，请手动选择文本复制。"));
  }

  function handleDownload() {
    const text = viewing ? viewing.output : latestOutputRef.current;
    const ext = def.outputKind === "json" ? "json" : "md";
    const blob = new Blob([text], {
      type: `text/${ext === "json" ? "json" : "markdown"};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${toolId}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayText = viewing ? viewing.output : output;
  const parsedReport =
    def.outputKind === "json" && displayText !== ""
      ? parseInsightsReport(displayText)
      : null;
  const showInsights = parsedReport?.ok === true;
  const showMarkdown = displayText !== "" && !showInsights && def.outputKind === "markdown";
  const canExport = (status === "done" || viewing !== null) && !error;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{def.name}</h1>
          <ModeBadge />
        </div>
        <p className="text-sm text-neutral-600">{def.tagline}</p>
      </header>

      {pending && (
        <div
          className="rounded border border-amber-300 bg-amber-50 p-4 text-sm"
          data-testid="token-confirm"
        >
          <p className="font-medium">
            输入较大：约 {pending.estimated} tokens，超过单次上限 {pending.max}。
          </p>
          <p className="mt-1 text-neutral-600">
            建议先精简输入（删掉不重要的段落）；确认继续可能产生更多费用。
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setPending(null)} className="rounded border px-3 py-1.5 text-sm">
              返回修改
            </button>
            <button
              onClick={() => void run(pending.input, true)}
              className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              确认继续
            </button>
          </div>
        </div>
      )}

      {status !== "streaming" && <Form onSubmit={handleSubmit} disabled={pending !== null} />}

      {status === "streaming" && (
        <div className="flex items-center justify-between rounded border p-3 text-sm">
          <span>
            {def.outputKind === "json" ? `分析中…已接收 ${output.length} 字` : "生成中…"}
          </span>
          <button onClick={() => abortRef.current?.abort()} className="text-neutral-500 hover:text-red-600">
            取消
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {(viewing !== null || showMarkdown || showInsights) && (
        <section className="flex flex-col gap-3">
          {viewing !== null && (
            <p className="rounded bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600">
              正在查看 {new Date(viewing.ts).toLocaleString("zh-CN")} 的历史记录
              <button onClick={() => setViewing(null)} className="ml-2 text-blue-700 hover:underline">
                返回
              </button>
            </p>
          )}
          {showMarkdown && <StreamingOutput text={displayText} />}
          {showInsights && parsedReport?.ok && <InsightsView report={parsedReport.report} />}
          {canExport && (
            <div className="flex gap-2">
              <button onClick={handleCopy} className="rounded border px-3 py-1.5 text-sm">
                {copied ? "已复制" : "复制全文"}
              </button>
              <button onClick={handleDownload} className="rounded border px-3 py-1.5 text-sm">
                下载 .{def.outputKind === "json" ? "json" : "md"}
              </button>
            </div>
          )}
        </section>
      )}

      <HistoryPanel
        entries={history}
        onView={(e) => {
          setViewing(e);
          setError(null);
        }}
        onDelete={(id) => {
          deleteRun(toolId, id);
          setHistory(listRuns(toolId));
        }}
        onClear={() => {
          clearRuns(toolId);
          setHistory(listRuns(toolId));
          setViewing(null);
        }}
      />
    </main>
  );
}
