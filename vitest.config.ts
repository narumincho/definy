import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      // Cloudflare Workers と同じく `*.wasm?module` を `WebAssembly.Module` として読み込む
      // (Node.js は実行時にバイト列から Wasm をコンパイルできるので, ファイルを読んでコンパイルする)
      name: "definy-wasm-module",
      load(id) {
        if (!id.endsWith(".wasm?module")) {
          return null;
        }
        const file = id.slice(0, -"?module".length);
        return `import { readFileSync } from "node:fs";
export default new WebAssembly.Module(readFileSync(${JSON.stringify(file)}));`;
      },
    },
  ],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
    globalSetup: ["src/test_global_setup.ts"],
  },
});
