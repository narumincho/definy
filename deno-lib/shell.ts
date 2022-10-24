/** os によって変わる shell */
export const shell = Deno.build.os === "windows" ? "powershell" : "bash";
