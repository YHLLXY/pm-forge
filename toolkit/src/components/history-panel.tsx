import type { HistoryEntry } from "@/lib/history";

export function HistoryPanel({
  entries,
  onView,
  onDelete,
  onClear,
}: {
  entries: HistoryEntry[];
  onView(entry: HistoryEntry): void;
  onDelete(id: string): void;
  onClear(): void;
}) {
  if (entries.length === 0) {
    return (
      <p data-testid="history-panel" className="text-xs text-neutral-500">
        暂无历史记录（最近 10 次运行自动保存在本机浏览器）
      </p>
    );
  }
  return (
    <div data-testid="history-panel" className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">历史记录（本机，最近 10 次）</h3>
        <button onClick={onClear} className="text-xs text-neutral-500 hover:text-red-600">
          清空
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border px-2 py-1">
            <button
              onClick={() => onView(e)}
              className="text-left text-xs text-blue-700 hover:underline"
            >
              {new Date(e.ts).toLocaleString("zh-CN")} ·{" "}
              {e.mode === "mock" ? "演示" : e.mode === "openai-compatible" ? "真实" : e.mode}
            </button>
            <button
              onClick={() => onDelete(e.id)}
              className="text-xs text-neutral-400 hover:text-red-600"
              aria-label="删除这条历史"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
