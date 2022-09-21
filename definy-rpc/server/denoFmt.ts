import {
  readAll,
  writeAll,
} from "https://deno.land/std@0.156.0/streams/conversion.ts";
import { shell } from "./shell.ts";

/**
 * ```ps1
 * deno fmt -
 * ```
 *
 * を使って コードを整形する. `--allow-run` が必要
 */
export const formatCode = async (code: string): Promise<string> => {
  const process = Deno.run({
    cmd: [shell, "deno", "fmt", "-"],
    stdin: "piped",
  });

  await writeAll(process.stdin, new TextEncoder().encode(code));

  console.log("status", await process.status());

  // const formattedCode = await readAll(process.stdout);
  // console.log("コードをフォーマットできた?", formattedCode);
  // return new TextDecoder().decode(formattedCode);
  return new Date().toISOString();
};
