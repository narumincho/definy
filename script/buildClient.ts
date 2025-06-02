import { encodeHex } from "@std/encoding/hex";
import * as esbuild from "npm:esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const buildResult = await esbuild.build({
  entryPoints: ["./client/start.tsx"],
  bundle: true,
  plugins: [...denoPlugins()],
  write: false,
  jsx: "automatic",
  jsxFactory: "jsx",
  jsxImportSource: "hono/jsx/dom",
});

const code = buildResult.outputFiles[0]?.text ?? "";

await Deno.writeTextFile(
  new URL("../dist.json", import.meta.url),
  JSON.stringify({
    clientJavaScript: code,
    clientJavaScriptHash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(code),
      ),
    ),
  }),
);

await esbuild.stop();
