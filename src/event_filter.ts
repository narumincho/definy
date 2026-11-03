import type { EventRecord } from "./types.ts";

/**
 * イベントを種別で絞り込む. `eventTypeFilter` が `null` のときは絞り込まない (すべて出す).
 * トップページのタイムラインとサイドバーのイベント一覧で同じ絞り込みを使うため, ここに置く
 * (片方だけに適用すると, メインとサイドバーで件数や中身が食い違って見える)
 */
export function filterEventsByType(
  events: ReadonlyArray<EventRecord>,
  eventTypeFilter: string | null,
): ReadonlyArray<EventRecord> {
  if (eventTypeFilter === null) {
    return events;
  }
  return events.filter((ev) => ev.eventType === eventTypeFilter);
}
