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
  ) => (buffer: Buffer) => (buffer2: Buffer) => () => void
): childProcess.ChildProcess => {
  return childProcess.exec(command, {}, (err, stdout, stderr) => {
    callback(err)(stdout as unknown as Buffer)(stderr as unknown as Buffer)();
  });
};

export const mkOnClose = (mkChildExit: any) => {
  return function onClose(cp: any) {
    return (cb: any) => {
      return () => {
        cp.on("close", (code: any, signal: any) => {
          cb(mkChildExit(code)(signal))();
        });
      };
    };
  };
};

export const onDisconnect = (cp: any) => {
  return (cb: any) => {
    return () => {
      cp.on("disconnect", cb);
    };
  };
};

export const mkOnMessage = (nothing: any) => {
  return (just: any) => {
    return function onMessage(cp: any) {
      return (cb: any) => {
        return () => {
          cp.on("message", (mess: any, sendHandle: any) => {
            cb(mess, sendHandle ? just(sendHandle) : nothing)();
          });
        };
      };
    };
  };
};

export const onError = (cp: any) => {
  return (cb: any) => {
    return () => {
      cp.on("error", (err: any) => {
        cb(err)();
      });
    };
  };
};

export const nodeProcess = process;
