/**
 * `import mod from "./x.wasm?module"` はバンドル時にコンパイル済みの `WebAssembly.Module` になる
 * (Cloudflare Workers の CompiledWasm モジュール. Vitest では `vitest.config.ts` のプラグインで同じ形にする)
 */
declare module "*.wasm?module" {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
