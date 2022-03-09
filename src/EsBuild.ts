import type { EffectFnAff } from "./PureScriptType";
import { build } from "esbuild";

export const buildAsEffectFnAff = (option: {
  readonly entryPoints: string;
  readonly outDir: string;
  readonly sourcemap: boolean;
  readonly target: string;
}): EffectFnAff<void, Error> => {
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
