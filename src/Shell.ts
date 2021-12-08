import * as childProcess from "child_process";
import type { Readable, Writable } from "stream";

export const spawnImpl = (
  command: string,
  args: ReadonlyArray<string>,
  opts: childProcess.SpawnOptionsWithoutStdio
): {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
} => {
  console.log("spawn を実行する!", command, args, opts);
  try {
    const childProcessWithoutNullStreams = childProcess.spawn(
      command,
      args,
      opts
    );
    return {
      stdin: childProcessWithoutNullStreams.stdin,
      stdout: childProcessWithoutNullStreams.stdout,
      stderr: childProcessWithoutNullStreams.stderr,
    };
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
