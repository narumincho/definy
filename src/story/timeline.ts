/**
 * 紹介スライドの時間軸. スライドの各ステップを, 動画のように開始時刻と長さを持つ区間として並べる.
 * 再生位置 (秒) から, どのスライドのどのステップを表示するかが決まる
 */

export type TimelineEntry = {
  readonly slide: number;
  readonly step: number;
  /** 開始時刻 (秒) */
  readonly start: number;
  /** 長さ (秒) */
  readonly length: number;
};

export type Timeline = {
  readonly entries: readonly TimelineEntry[];
  /** 全体の長さ (秒) */
  readonly total: number;
  /** スライドごとの開始時刻 (秒) */
  readonly slideStarts: readonly number[];
  /** スライドごとの長さ (秒). 解説音声で `duration` より長くなることがある */
  readonly slideLengths: readonly number[];
};

/**
 * スライドを, 開始時刻と長さを持つステップの列にする.
 * 既定では 1 枚の `duration` 秒を `steps + 1` 個のステップで等分する.
 * `stepLength` を渡すと各ステップの長さを決め直せる (等分した長さが渡される. 解説音声の長さに合わせるため)
 */
export function buildTimeline(
  slides: ReadonlyArray<{ readonly duration: number; readonly steps: number }>,
  stepLength: (slide: number, step: number, evenLength: number) => number = (
    _slide,
    _step,
    evenLength,
  ) => evenLength,
): Timeline {
  const entries: TimelineEntry[] = [];
  const slideStarts: number[] = [];
  let start = 0;
  slides.forEach((slide, slideIndex) => {
    slideStarts.push(start);
    const evenLength = slide.duration / (slide.steps + 1);
    for (let step = 0; step <= slide.steps; step++) {
      const length = stepLength(slideIndex, step, evenLength);
      entries.push({ slide: slideIndex, step, start, length });
      start += length;
    }
  });
  const slideLengths = slideStarts.map(
    (slideStart, index) => (slideStarts[index + 1] ?? start) - slideStart,
  );
  return { entries, total: start, slideStarts, slideLengths };
}

/** その時刻に表示する区間の添字. 範囲外は端に寄せる */
export function entryIndexAt(timeline: Timeline, time: number): number {
  const { entries } = timeline;
  let low = 0;
  let high = entries.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const entry = entries[middle];
    if (entry !== undefined && entry.start <= time + 1e-9) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

/** 秒を `3:21` の形にする */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
