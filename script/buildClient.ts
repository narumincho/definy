import { encodeHex } from "jsr:@std/encoding/hex";
import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";

const buildResult = await esbuild.build({
  entryPoints: ["./client/start.tsx"],
  bundle: true,
  plugins: [...denoPlugins()],
  write: false,
  jsxFactory: "h",
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
