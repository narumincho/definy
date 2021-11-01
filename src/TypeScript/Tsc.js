// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * @param {{rootName: string, outDir: string }} option
 * @returns {(onError: (error: Error) => void, onSuccess: () => void) => (cancelError: () => void, cancelerError: () => void, cancelerSuccess: () => void) => void}
 */
exports.compileAsEffectFnAff = (option) => {
  const typeScript = require("typescript");
  return (onError, onSuccess) => {
    typeScript
      .createProgram({
        rootNames: [option.rootName],
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
          outDir: option.outDir,
          exactOptionalPropertyTypes: true,
          declaration: true,
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
