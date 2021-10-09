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
          console.log("失敗と送る error", error);
          onError(error);
        }
      );

    return (cancelError, cancelerError, cancelerSuccess) => {
      // esBuild を停止する処理は書いていない
      console.log("停止処理を呼ばれた (なにもしていない)");
      cancelerSuccess();
      console.log("停止に成功したと送った");
    };
  };
};
