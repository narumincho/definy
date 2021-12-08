import * as childProcess from "child_process";

export const unsafeFromNullable = <T>(msg: string, x: null | T): T => {
  if (x === null) throw new Error(msg);
  return x;
};

export const spawnImpl = (
  command: string,
  args: ReadonlyArray<string>,
  opts: childProcess.SpawnOptionsWithoutStdio
): childProcess.ChildProcessWithoutNullStreams => {
  console.log("spawn を実行する!", command, args, opts);
  try {
    return childProcess.spawn(command, args, opts);
  } catch (e) {
    console.error(e);
    throw new Error(
      "PureScript 内の child_process の spawn でエラーが発生した"
    );
  }
};

export const execImpl = (
  command: string,
  callback: (
    nullableError: Error | null
  ) => (stdout: string) => (stderr: string) => () => void
): childProcess.ChildProcess => {
  return childProcess.exec(command, {}, (err, stdout, stderr) => {
    callback(err)(stdout)(stderr)();
  });
};
