import { defineConfig } from "vite";

/**
 * 紹介スライド (/about/) の静的なページのビルド (docs/story.md).
 * 出力は public/about/ (Worker の静的なファイル. コミットしない). 音声と画像は public/story/ にあり /story/... で読む
 */
export default defineConfig(({ command }) => ({
  root: import.meta.dirname,
  base: "/about/",
  // 開発サーバーでは public/ (/story/... の音声と画像) も配る. ビルドでは public/ の中に出すのでコピーしない
  publicDir: command === "serve" ? "../public" : false,
  build: {
    outDir: "../public/about",
    emptyOutDir: true,
  },
}));
