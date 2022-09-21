import {
  readAll,
  writeAll,
} from "https://deno.land/std@0.156.0/streams/conversion.ts";

/**
 * ```ps1
 * deno fmt -
 * ```
 *
 * を使って コードを整形する. `--allow-run` が必要
 */
export const formatCode = async (code: string): Promise<string> => {
  const process = Deno.run({
    cmd: [Deno.execPath(), "fmt", "-"],
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  await writeAll(process.stdin, new TextEncoder().encode(code));
  process.stdin.writable.close();

  return new TextDecoder().decode(await readAll(process.stdout));
};
