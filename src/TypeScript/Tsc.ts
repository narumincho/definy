import * as typeScript from "typescript";

export const compileAsEffectFnAff = (option: {
  rootNames: ReadonlyArray<string>;
  outDir: string | null;
  declaration: boolean;
}): ((
  onError: (error: Error) => void,
  onSuccess: () => void
) => (
  cancelError: () => void,
  cancelerError: () => void,
  cancelerSuccess: () => void
) => void) => {
  return (onError, onSuccess) => {
    typeScript
      .createProgram({
        rootNames: option.rootNames,
        options: {
          target: typeScript.ScriptTarget.ES2020,
          lib: ["ES2020", "DOM"],
          esModuleInterop: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          module: typeScript.ModuleKind.CommonJS,
          moduleResolution: typeScript.ModuleResolutionKind.NodeJs,
          isolatedModules: true,
          skipLibCheck: true,
          outDir:
            typeof option.outDir === "string"
              ? option.outDir
              : (undefined as unknown as string),
          noUncheckedIndexedAccess: true,
          newLine: typeScript.NewLineKind.LineFeed,
          exactOptionalPropertyTypes: true,
          declaration: option.declaration,
        },
      })
      .emit();
    onSuccess();

    return (cancelError, cancelerError, cancelerSuccess) => {
      console.log("Tsc の停止処理は未実装です");
      cancelerSuccess();
    };
  };
};
