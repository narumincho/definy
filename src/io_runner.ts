/**
 * `definy.io` の値 (I/O をするプログラム) を, 木のまま動かす (docs/structured-concurrency.md).
 *
 * プログラムは純粋なままで, I/O の要求を値として返し, ホストがその I/O をして結果を `then` に渡す.
 * `done(value)` を返したら終わり. ここが受け持つのはホストに依らない 4 つのタグだけで,
 * それ以外のタグ (HTTP, ストアなど) は呼び出し元の `leaf` が 1 つずつ行う.
 *
 * - `all`: `tasks` を並行に動かし, 全部の結果を (渡した順に) `then` に渡す
 * - `race`: 最初に終わったタスクの結果を `then` に渡し, 他のタスクはキャンセルする
 * - `sleep`: `ms` ミリ秒待つ
 *
 * 構造化並行性: 子のタスクは親より長生きしない. `then` を呼ぶのは子が全て終わってから
 * (`race` ではキャンセルした子が止まるのを待ってから) で, ホストの Promise も投げっぱなしにしない.
 * キャンセルは I/O の 1 歩の境目で効き, definy の側に途中の状態は残らない. 実行中の I/O は
 * `leaf` に渡す `AbortSignal` で止めてよい (読むだけのもの). 書き込みは止めずに終わらせ, 結果を捨てる.
 */
import type { CompiledValueInstance, ValueRef } from "./stage1_compiler.ts";

/** キャンセルされたタスク (`race` で負けた, 親が失敗した) を止めるときに投げる */
export class IoCancelled extends Error {
  constructor() {
    super("the task was cancelled");
    this.name = "IoCancelled";
  }
}

/** ホストができない I/O を頼まれた */
export class IoUnsupported extends Error {
  readonly tag: string;
  constructor(tag: string) {
    super(`this host cannot do the I/O '${tag}'`);
    this.name = "IoUnsupported";
    this.tag = tag;
  }
}

export type IoRunOptions = {
  /**
   * `done` / `all` / `race` / `sleep` 以外のタグの I/O を 1 つ行い, `then` に渡す値を返す.
   * できないタグなら {@link IoUnsupported} を投げる. `signal` が中断されたら, 読むだけの I/O は止めてよい
   */
  readonly leaf: (
    tag: string,
    payload: ValueRef,
    signal: AbortSignal,
  ) => Promise<ValueRef>;
  /** これだけ I/O (全てのタスクの合計. `all` / `race` も 1 歩) をしても終わらなければ止める */
  readonly maxSteps: number;
  /** 止めたときの例外のメッセージ */
  readonly tooManyStepsMessage?: string;
  /** プログラム全体を止める (リクエストが終わったときなど) */
  readonly signal?: AbortSignal;
  /** `sleep` の待ち方 (テスト用). 省くと `setTimeout` */
  readonly sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
};

/** `definy.io` の値を動かし, `done` の値 (参照) を返す */
export async function runIo(
  instance: CompiledValueInstance,
  start: ValueRef,
  options: IoRunOptions,
): Promise<ValueRef> {
  const root = new AbortController();
  const unlink = linkAbort(options.signal, root);
  let steps = 0;
  const countStep = () => {
    steps += 1;
    if (steps > options.maxSteps) {
      throw new Error(
        options.tooManyStepsMessage ??
          `${options.maxSteps} 回 I/O をしても終わりませんでした`,
      );
    }
  };
  const sleep = options.sleep ?? defaultSleep;

  const then = (payload: ValueRef, argument: ValueRef): ValueRef =>
    instance.callClosure(instance.recordField(payload, "then"), [argument]);

  const run = async (
    pointer: ValueRef,
    signal: AbortSignal,
  ): Promise<ValueRef> => {
    for (;;) {
      if (signal.aborted) {
        throw new IoCancelled();
      }
      const { tag, payload } = instance.variant(pointer);
      if (tag === "done") {
        if (payload === null) {
          throw new Error("definy.io の done に値がありません");
        }
        return payload;
      }
      countStep();
      if (payload === null) {
        throw new Error(`definy.io の ${tag} にペイロードがありません`);
      }
      switch (tag) {
        case "all": {
          const tasks = instance.listItems(
            instance.recordField(payload, "tasks"),
          );
          const results = await runChildren(tasks, signal, "all");
          pointer = then(payload, instance.listOf(results));
          break;
        }
        case "race": {
          const tasks = instance.listItems(
            instance.recordField(payload, "tasks"),
          );
          if (tasks.length === 0) {
            throw new Error("definy.io の race にタスクがありません");
          }
          const [winner] = await runChildren(tasks, signal, "race");
          pointer = then(payload, winner as ValueRef);
          break;
        }
        case "sleep": {
          const ms = Number(instance.read(instance.recordField(payload, "ms")));
          await sleep(Math.max(0, ms), signal);
          if (signal.aborted) {
            throw new IoCancelled();
          }
          pointer = then(payload, instance.writeArgument(ms));
          break;
        }
        default: {
          const argument = await options.leaf(tag, payload, signal);
          // 書き込みは止めずに終わらせるので, 終わった後でキャンセルを確かめる (結果は捨てる)
          if (signal.aborted) {
            throw new IoCancelled();
          }
          pointer = then(payload, argument);
        }
      }
    }
  };

  /**
   * 子のタスクを並行に動かす. `all` は全部の結果を, `race` は最初に終わった 1 つを返す.
   * どちらも, 返す前に全ての子が止まるのを待つ (止まっていない子を残さない)
   */
  const runChildren = async (
    tasks: ReadonlyArray<ValueRef>,
    parent: AbortSignal,
    mode: "all" | "race",
  ): Promise<ReadonlyArray<ValueRef>> => {
    const group = new AbortController();
    const unlinkGroup = linkAbort(parent, group);
    const results: ValueRef[] = [];
    let winner: ValueRef | undefined;
    let failure: { readonly error: unknown } | undefined;
    const settled = tasks.map((task, index) =>
      run(task, group.signal).then(
        (value) => {
          if (mode === "all") {
            results[index] = value;
          } else if (winner === undefined && failure === undefined) {
            winner = value;
            group.abort();
          }
        },
        (error: unknown) => {
          if (failure === undefined && !(error instanceof IoCancelled)) {
            failure = { error };
          }
          group.abort();
        },
      ),
    );
    try {
      await Promise.all(settled);
    } finally {
      unlinkGroup();
    }
    if (failure !== undefined) {
      throw failure.error;
    }
    if (parent.aborted) {
      throw new IoCancelled();
    }
    if (mode === "race") {
      if (winner === undefined) {
        throw new IoCancelled();
      }
      return [winner];
    }
    return results;
  };

  try {
    return await run(start, root.signal);
  } finally {
    unlink();
  }
}

/** `from` が中断されたら `to` も中断する. 返す関数でつなぎを外す */
function linkAbort(
  from: AbortSignal | undefined,
  to: AbortController,
): () => void {
  if (from === undefined) {
    return () => {};
  }
  if (from.aborted) {
    to.abort();
    return () => {};
  }
  const onAbort = () => to.abort();
  from.addEventListener("abort", onAbort, { once: true });
  return () => from.removeEventListener("abort", onAbort);
}

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
