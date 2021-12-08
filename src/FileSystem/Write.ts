import type { EffectFnAff } from "../PureScriptType";
import { ensureDir } from "fs-extra";

export const ensureDirAsEffectFnAff =
  (path: string): EffectFnAff<void, void> =>
  (onError, onSuccess) => {
    ensureDir(path).then(
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
