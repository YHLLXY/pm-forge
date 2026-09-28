type SortableData = {
  modDatetime?: Date | null | undefined;
  pubDatetime: Date;
  draft?: boolean;
};

/** 15 分钟定时发布余量（沿用上游语义，config 不再承载 posts 配置） */
const SCHEDULED_MARGIN_MS = 15 * 60 * 1000;

export function entryFilter<T extends { data: SortableData }>(entries: T[]): T[] {
  const isPublishTimePassed = (e: T) =>
    Date.now() > new Date(e.data.pubDatetime).getTime() - SCHEDULED_MARGIN_MS;
  return entries.filter(
    e => !e.data.draft && (import.meta.env.DEV || isPublishTimePassed(e))
  );
}

export function sortEntries<T extends { data: SortableData }>(entries: T[]): T[] {
  return entryFilter(entries).sort(
    (a, b) =>
      Math.floor(new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000) -
      Math.floor(new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000)
  );
}
