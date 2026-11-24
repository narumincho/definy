import { expect, test } from "vitest";
import { buildTimeline, entryIndexAt, formatTime } from "./timeline.ts";

const timeline = buildTimeline([
  { duration: 10, steps: 0 },
  { duration: 30, steps: 2 },
]);

test("スライドの長さをステップで等分して並べる", () => {
  expect(timeline.total).toBe(40);
  expect(timeline.slideStarts).toEqual([0, 10]);
  expect(timeline.entries.map((e) => [e.slide, e.step, e.start])).toEqual([
    [0, 0, 0],
    [1, 0, 10],
    [1, 1, 20],
    [1, 2, 30],
  ]);
});

test("時刻から表示する区間を求める", () => {
  expect(entryIndexAt(timeline, -1)).toBe(0);
  expect(entryIndexAt(timeline, 9.99)).toBe(0);
  expect(entryIndexAt(timeline, 10)).toBe(1);
  expect(entryIndexAt(timeline, 35)).toBe(3);
  expect(entryIndexAt(timeline, 100)).toBe(3);
});

test("時刻を m:ss で表す", () => {
  expect(formatTime(0)).toBe("0:00");
  expect(formatTime(201.7)).toBe("3:21");
  expect(formatTime(290)).toBe("4:50");
});

test("ステップの長さを決め直せる", () => {
  const withVoice = buildTimeline(
    [
      { duration: 10, steps: 0 },
      { duration: 30, steps: 2 },
    ],
    (slide, step, evenLength) =>
      slide === 1 ? (step === 2 ? 12.5 : 1) : evenLength,
  );
  expect(withVoice.entries.map((e) => e.start)).toEqual([0, 10, 11, 12]);
  expect(withVoice.total).toBe(24.5);
  expect(withVoice.slideStarts).toEqual([0, 10]);
  expect(withVoice.slideLengths).toEqual([10, 14.5]);
});
