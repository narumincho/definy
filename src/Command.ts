import type { EffectFnAff } from "./PureScriptType";
import { execFile } from "node:child_process";

export const childProcessExecFile = (option: {
  readonly filePath: string;
  readonly parameters: ReadonlyArray<string>;
}): EffectFnAff<
  { readonly stdout: string; readonly stderr: string },
  Error
> => {
  return (onError, onSuccess) => {
    const childProcess = execFile(
      option.filePath,
      option.parameters,
      (error, stdout, stderr) => {
        if (error) {
          onError(error);
          return;
        }
        onSuccess({ stderr, stdout });
      }
    );
    const cleanup = (): void => {
      if (childProcess.pid !== undefined) {
        process.kill(childProcess.pid);
      }
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("SIGQUIT", cleanup);

    return (cancelError, cancelerError, cancelerSuccess) => {
      cleanup();
      cancelerSuccess();
    };
  };
};
