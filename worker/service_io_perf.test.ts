/**
 * パフォーマンス記録の集計 (`ServiceIoPerfCollector`) のテスト。
 *
 * wasm の時間は要求の境界で時計を読んで区間の経過から求める (境界差分方式)。
 * Cloudflare Workers の `performance.now()` は同期実行中は進まず、I/O の
 * 境界で実時間に追いつく仕様で、`callClosure` を同期的に挟む方式では
 * 本番で wasm の時間が常に 0 になった。そのため、時計を手で進める偽物に
 * 差し替えて、境界で追いつく時計でも wasm の時間が帰属されることと、
 * 追いつき方が粗い時計でも合計が崩れないことを確かめる
 */
import { describe, expect, it } from "vitest";
import {
  ServiceIoPerfCollector,
  type ServiceIoPerfRecord,
} from "./service_io.ts";

/** 手で進める時計と、記録を受け取る集計 */
function setup() {
  let t = 0;
  const records: Array<ServiceIoPerfRecord> = [];
  const perf = new ServiceIoPerfCollector(
    (record) => {
      records.push(record);
    },
    "POST",
    "/definy.v1.EventService/SubmitEvent",
    () => t,
  );
  return {
    records,
    perf,
    /** 時計を進める (実時間が経ったことにする) */
    advance: (ms: number): void => {
      t += ms;
    },
  };
}

describe("ServiceIoPerfCollector", () => {
  it("境界の差分から区間内のホスト時間を引いた残りが、前のタグの wasm 時間になる", () => {
    const { records, perf, advance } = setup();
    // entry の wasm が 120ms 動いて、最初の要求 (sql) が出る
    advance(120);
    perf.beginRequest("sql");
    // ホストが 30ms で応答し (ホスト時間は timedHost が区間内に足す)、
    // wasm が 200ms 動いて次の要求が出る
    advance(30);
    perf.addHost(30);
    advance(200);
    perf.beginRequest("read_cached_commits");
    advance(10);
    perf.addHost(10);
    advance(50);
    perf.beginRequest("respond");
    perf.finish(200);

    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.status).toBe(200);
    expect(record.segments).toEqual([
      { tag: "entry", count: 1, wasmMs: 120, hostMs: 0 },
      { tag: "sql", count: 1, wasmMs: 200, hostMs: 30 },
      { tag: "read_cached_commits", count: 1, wasmMs: 50, hostMs: 10 },
      { tag: "respond", count: 1, wasmMs: 0, hostMs: 0 },
    ]);
    expect(record.totalWasmMs).toBe(370);
    expect(record.totalHostMs).toBe(40);
  });

  it("同期実行中は進まず I/O の完了時にまとめて追いつく時計では、時間はホスト側に寄り、合計は保存される", () => {
    const { records, perf, advance } = setup();
    // entry の wasm が 120ms 動くが、時計はまだ追いつかない (読みは 0 のまま)
    perf.beginRequest("sql");
    // ホストの I/O が終わった時点で、時計は entry の 120ms とホストの 30ms を
    // まとめて追いつく。timedHost が挟んで測るホスト時間も同じ 150ms になる
    advance(150);
    perf.addHost(150);
    // wasm が 200ms 動くが、時計は追いつかない
    perf.beginRequest("read_cached_commits");
    // 次の I/O の完了で、wasm の 200ms とホストの 10ms がまとめて現れる
    advance(210);
    perf.addHost(210);
    perf.beginRequest("respond");
    perf.finish(200);

    const record = records[0]!;
    // この時計では wasm と次のホストは分離できないので、wasm は 0 のまま
    // 時間がホスト側に寄る。ただし二重計上はなく、合計は境界までに
    // 追いついた実時間 (360ms) と一致する
    expect(record.totalWasmMs).toBe(0);
    expect(record.totalHostMs).toBe(360);
    for (const segment of record.segments) {
      expect(segment.wasmMs).toBeGreaterThanOrEqual(0);
      expect(segment.hostMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("同じタグの繰り返しは区間ごとに閉じて集計し、finish は 1 回だけ記録する", () => {
    const { records, perf, advance } = setup();
    advance(10);
    perf.beginRequest("sql");
    advance(5);
    perf.addHost(5);
    advance(20);
    perf.beginRequest("sql");
    advance(7);
    perf.addHost(7);
    advance(30);
    // 例外で終わる経路 (finish(null)) でも最後の区間が閉じる
    perf.finish(null);
    perf.finish(200);

    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.status).toBeNull();
    expect(record.segments).toEqual([
      { tag: "entry", count: 1, wasmMs: 10, hostMs: 0 },
      { tag: "sql", count: 2, wasmMs: 50, hostMs: 12 },
    ]);
    expect(record.totalWasmMs).toBe(60);
    expect(record.totalHostMs).toBe(12);
  });

  it("ホスト時間の測定が区間の経過より大きくても、wasm 時間は負にならない", () => {
    const { records, perf, advance } = setup();
    perf.beginRequest("sql");
    // 時計の粒度の違いなどで、区間の経過 (10ms) よりホストの測定 (25ms) が
    // 大きくなることがあっても、記録が壊れないこと
    advance(10);
    perf.addHost(25);
    perf.finish(200);

    const record = records[0]!;
    const sql = record.segments.find((segment) => segment.tag === "sql")!;
    expect(sql.wasmMs).toBe(0);
    expect(sql.hostMs).toBe(25);
    expect(record.totalWasmMs).toBe(0);
  });
});
