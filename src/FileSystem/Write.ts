import type { EffectFnAff } from "../PureScriptType";
import { ensureDir } from "fs-extra";
import { writeFile } from "fs/promises";

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

export const writeTextFilePathFileProtocolImpl =
  (path: string) =>
  (content: string): EffectFnAff<void, void> =>
  (onError, onSuccess) => {
    writeFile(new URL(path), content).then(
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
