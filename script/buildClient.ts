import { bundle } from "jsr:@deno/emit";
import { encodeHex } from "jsr:@std/encoding/hex";

const { code } = await bundle(
  new URL("../client/start.tsx", import.meta.url),
  {
    compilerOptions: { jsxFactory: "h" },
  },
);

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
