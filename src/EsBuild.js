/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
exports.buildAsEffectFnAff = (option) => {
  return (onError, onSuccess) => {
    console.log("esbuildを呼んだ");
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
        (result) => {
          onSuccess(result);
        },
        (error) => {
          console.log("esbuild error", error);
          onError(error);
        }
      );
    return (cancelError, cancelerError, cancelerSuccess) => {
      // esBuild を停止する処理は書いていない
      cancelerSuccess();
    };
  };
};
