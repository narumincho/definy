import { build } from "esbuild";

export const buildAsEffectFnAff = (option: {
  readonly entryPoint: string;
  readonly sourcemap: boolean;
  readonly target: ReadonlyArray<string>;
  readonly external: ReadonlyArray<string>;
  readonly outFile: string;
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
      entryPoints: [option.entryPoint],
      bundle: true,
      outfile: option.outFile,
      sourcemap: option.sourcemap,
      minify: true,
      target: [...option.target],
      external: [...option.external],
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
