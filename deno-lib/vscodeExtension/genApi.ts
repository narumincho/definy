export const generate = async (): Promise<string> => {
  const code = await (await fetch(
    "https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/vscode/index.d.ts",
  )).text();
  return "wip";
  // ast を組み立てる?
  // return code.replace("declare module 'vscode' {", "");
};
