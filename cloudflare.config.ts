import { bindings, defineConfig } from "cf/config";

/**
 * Cloudflare Workers の設定。
 * 以前は wrangler.toml を @cloudflare/vite-plugin が読んでいたが、
 * プラグインが v2 で TOML の読み取りをやめたため、こちらに移行した。
 * compatibilityDate は移行前 (Void が自動設定していた値) のまま固定し、
 * ランタイムの意味を変えないようにしている。
 * wrangler.toml はデプロイ (wrangler-action) 用に残してある。
 */
export default defineConfig({
  worker: {
    name: "definy",
    compatibilityDate: "2026-02-24",
    compatibilityFlags: ["nodejs_compat"],
    env: {
      DB: bindings.d1({
        name: "definy-db",
        id: "d4c3a982-558e-4d58-95f8-bbc3ca391818",
      }),
    },
  },
});
