import { shell } from "../definy-rpc/build/shell.ts";

const tscResult = await Deno.run({
  cwd: "../",
  cmd: [shell, "pnpm", "exec", "tsc", "--project", "./nodeRedPackage"],
}).status();

console.log(tscResult);
