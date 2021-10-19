// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 *
 * @param {{entryPoints: string, outdir:string, sourcemap: boolean, target: string }} option
 * @returns {(onError: (error: Error) => void, onSuccess: () => void) => (cancelError: () => void, cancelerError: () => void, cancelerSuccess: () => void) => void}
 */
exports.buildAsEffectFnAff = (option) => {
  return (onError, onSuccess) => {
    require("esbuild")
      .build({
        entryPoints: [option.entryPoints],
        bundle: true,
        outdir: option.outdir,
        sourcemap: option.sourcemap,
        minify: true,
        target: option.target,
      })
      .then(
        () => {
          onSuccess();
        },
        (error) => {
          console.log("esbuild でエラーが発生", error);
          onError(error);
        }
      );

    return (cancelError, cancelerError, cancelerSuccess) => {
      console.log("ESBuild の停止処理は未実装です");
      cancelerSuccess();
    };
  };
};
