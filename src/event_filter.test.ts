import { expect, test } from "vitest";
import { filterEventsByType } from "./event_filter.ts";
import type { EventRecord } from "./types.ts";

function event(eventHash: string, eventType: string): EventRecord {
  return {
    eventHash,
    signedEventBytes: "",
    accountId: "account",
    eventType,
    createdAtRfc3339: "2026-11-03T00:00:00.000Z",
    timeMs: 0,
    verification: { status: "valid" },
  };
}

const events: ReadonlyArray<EventRecord> = [
  event("a", "project_commit"),
  event("b", "create_account"),
  event("c", "project_commit"),
];

test("種別が null のときはすべてのイベントを返す", () => {
  expect(filterEventsByType(events, null)).toEqual(events);
});

test("種別を指定するとその種別のイベントだけを順序を保って返す", () => {
  expect(
    filterEventsByType(events, "project_commit").map((ev) => ev.eventHash),
  ).toEqual(["a", "c"]);
  expect(
    filterEventsByType(events, "create_account").map((ev) => ev.eventHash),
  ).toEqual(["b"]);
});

test("一致するイベントが無ければ空になる", () => {
  expect(filterEventsByType(events, "unknown_type")).toEqual([]);
});
