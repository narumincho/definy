import type { EffectFnAff } from "../PureScriptType";
import pkg from "fs-extra";
const { copyFile } = pkg;

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
