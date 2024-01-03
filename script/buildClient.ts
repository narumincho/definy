import { ensureFile } from "https://deno.land/std@0.210.0/fs/mod.ts";
import { encodeHex } from "https://deno.land/std@0.210.0/encoding/hex.ts";
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

const clientJsCode = (
  await bundle("./client.ts")
).code;

await writeTextFileWithLog(
  "./dist.json",
  JSON.stringify({
    clientJsCode,
    clientJsHash: encodeHex(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(clientJsCode),
      ),
    ),
  }),
);
