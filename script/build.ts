import { emptyDir } from "@std/fs";
import { join } from "@std/path/posix";

const generatedDir = join("./generated");

async function clientScriptBuild(): Promise<void> {
  await emptyDir(generatedDir);

  const output = await Deno.bundle({
    entrypoints: ["./client/start.tsx"],
  });

  for (const error of output.errors) {
    console.error(error.text);
  }

  for (const warning of output.warnings) {
    console.error(warning.text);
  }

  const clientScript = output.outputFiles?.find(
    ({ path }) => path === "<stdout>",
  )?.contents;

  if (!clientScript) {
    throw new Error("Client script not found in bundle output");
  }

  await Deno.writeTextFile(
    join(generatedDir, "hash.json"),
    JSON.stringify({
      clientScriptHash: new Uint8Array(
        await crypto.subtle.digest("SHA-256", clientScript),
      ).toBase64({ alphabet: "base64url" }),
    }),
  );

  await Deno.writeTextFile(
    join(generatedDir, "clientScript.js"),
    new TextDecoder().decode(clientScript),
  );
}

await clientScriptBuild();
