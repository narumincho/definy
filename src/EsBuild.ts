import type { EffectFnAff } from "./PureScriptType";
import { build } from "esbuild";

export const buildAsEffectFnAff = (option: {
  readonly entryPoints: string;
  readonly target: ReadonlyArray<string>;
  readonly external: ReadonlyArray<string>;
}): EffectFnAff<Uint8Array, Error> => {
  return (onError, onSuccess) => {
    build({
      entryPoints: [option.entryPoints],
      bundle: true,
      minify: true,
      target: [...option.target],
      external: [...option.external],
      write: false,
      format: "cjs",
    }).then(
      (e) => {
        const contents = e.outputFiles[0]?.contents;
        if (contents === undefined) {
          onError(new Error("esbuild outputFiles contents is undefined"));
          return;
        }
        onSuccess(contents);
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
