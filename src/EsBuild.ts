import { build } from "esbuild";

export const buildAsEffectFnAff = (option: {
  readonly entryPoints: string;
  readonly outDir: string;
  readonly sourcemap: boolean;
  readonly target: string;
}): ((
  onError: (error: Error) => void,
  onSuccess: () => void
) => (
  cancelError: () => void,
  cancelerError: () => void,
  cancelerSuccess: () => void
) => void) => {
  return (onError, onSuccess) => {
    build({
      entryPoints: [option.entryPoints],
      bundle: true,
      outdir: option.outDir,
      sourcemap: option.sourcemap,
      minify: true,
      target: option.target,
    }).then(
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
