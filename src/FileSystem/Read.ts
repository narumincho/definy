import type { EffectFnAff } from "../PureScriptType";
import { readdir } from "fs";

export const readdirWithFileTypesAsEffectFnAff =
  (
    path: string
  ): EffectFnAff<
    ReadonlyArray<{ readonly isFile: boolean; readonly name: string }>,
    Error
  > =>
  (onError, onSuccess) => {
    readdir(
      path,
      {
        withFileTypes: true,
      },
      (error, direntList) => {
        if (error) {
          onError(error);
          return;
        }
        onSuccess(
          direntList.map((dirent) => ({
            isFile: dirent.isFile(),
            name: dirent.name,
          }))
        );
      }
    );
    return (cancelError, cancelerError, cancelerSuccess) => {
      cancelerSuccess();
    };
  };
