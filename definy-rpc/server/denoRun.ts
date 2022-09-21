export const denoRunByPowershellOrBash = (parameter: {
  readonly cwd?: string | undefined;
  readonly cmd: ReadonlyArray<string>;
}): Promise<Deno.ProcessStatus> => {
  return Deno.run({
    ...(typeof parameter.cwd === "string" ? { cwd: parameter.cwd } : {}),
    cmd: [
      Deno.build.os === "windows" ? "powershell" : "bash",
      ...parameter.cmd,
    ],
  }).status();
};
