export interface HistoryEntry {
  id: string;
  ts: number;
  mode: string;
  input: unknown;
  output: string;
}

const key = (toolId: string) => `pmforge:history:${toolId}`;
const MAX_ENTRIES = 10;

export function listRuns(toolId: string): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(key(toolId)) ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveRun(
  toolId: string,
  entry: Omit<HistoryEntry, "id" | "ts">,
): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  const next = [full, ...listRuns(toolId)].slice(0, MAX_ENTRIES);
  localStorage.setItem(key(toolId), JSON.stringify(next));
  return full;
}

export function deleteRun(toolId: string, id: string): void {
  localStorage.setItem(
    key(toolId),
    JSON.stringify(listRuns(toolId).filter((e) => e.id !== id)),
  );
}

export function clearRuns(toolId: string): void {
  localStorage.removeItem(key(toolId));
}
