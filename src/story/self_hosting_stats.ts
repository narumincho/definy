/**
 * definy のコードのうち definy 自身で書いている割合 (語の数). scripts/measure_self_hosting.ts が作るので手で直さない.
 * 2026-11-04 時点
 */
export const SELF_HOSTING_STATS = {
  measuredAt: "2026-11-04",
  definy: 49218,
  definyModules: {
    core: 34289,
    std: 1544,
    wasi: 114,
    wasm: 414,
    definy: 12857,
  },
  typescriptHost: 37190,
  typescriptUi: 65455,
} as const;
