// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * @param {{rootNames: ReadonlyArray<string>, outDir: string | null, declaration: boolean }} option
 * @returns {(onError: (error: Error) => void, onSuccess: () => void) => (cancelError: () => void, cancelerError: () => void, cancelerSuccess: () => void) => void}
 */
exports.compileAsEffectFnAff = (option) => {
  const typeScript = require("typescript");
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
          noUncheckedIndexedAccess: true,
          newLine: typeScript.NewLineKind.LineFeed,
          outDir: typeof option.outDir === "string" ? option.outDir : undefined,
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
