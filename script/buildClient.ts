import { ensureFile } from "https://deno.land/std@0.211.0/fs/mod.ts";
import { encodeHex } from "https://deno.land/std@0.211.0/encoding/hex.ts";
import { encodeBase64 } from "https://deno.land/std@0.211.0/encoding/base64.ts";
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";

export const writeTextFileWithLog = async (
  path: string,
  content: string,
): Promise<void> => {
  console.log(path.toString() + " に書き込み中... " + content.length + "文字");
  await ensureFile(path);
  await Deno.writeTextFile(path, content);
  console.log(path.toString() + " に書き込み完了!");
};

const [clientJs, icon, font] = await Promise.all([
  bundle(new URL("../client.ts", import.meta.url)).then(async (emit) => ({
    code: emit.code,
    hash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(emit.code),
      ),
    ),
  })),
  fetch(new URL("../assets/icon.png", import.meta.url)).then(
    (response) => response.arrayBuffer(),
  ).then(async (binary) => ({
    base64: encodeBase64(binary),
    hash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        binary,
      ),
    ),
  })),
  fetch(new URL("../assets/hack_regular_subset.woff2", import.meta.url)).then(
    (response) => response.arrayBuffer(),
  ).then(async (binary) => ({
    base64: encodeBase64(binary),
    hash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        binary,
      ),
    ),
  })),
]);

await writeTextFileWithLog(
  "./dist.json",
  JSON.stringify({ clientJs, icon, font }),
);
