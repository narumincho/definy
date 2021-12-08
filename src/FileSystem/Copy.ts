import type { EffectFnAff } from "../PureScriptType";
import { copyFile } from "fs-extra";

export const copyFileAsEffectFnAff =
  (option: { src: string; dist: string }): EffectFnAff<void, void> =>
  (onError, onSuccess) => {
    copyFile(option.src, option.dist).then(
      () => {
        onSuccess();
      },
      (error) => {
        onError(error);
      }
    );
    return (cancelError, cancelerError, cancelerSuccess) => {
      cancelerSuccess();
    };
  };
