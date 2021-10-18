/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-env node*/

exports.unsafeFromNullable = function unsafeFromNullable(msg) {
  return (x) => {
    if (x === null) throw new Error(msg);
    return x;
  };
};

exports.spawnImpl = function spawnImpl(command) {
  return (args) => {
    return (opts) => {
      console.log("spawnの実行準備!", command, args, opts);
      return () => {
        console.log("spawn を実行する!", command, args, opts);
        try {
          const a = require("child_process").spawn(command, args, opts);
          return a;
        } catch (e) {
          console.log("えらー", e);
        }
      };
    };
  };
};

exports.execImpl = function execImpl(command) {
  return (opts) => {
    return (callback) => {
      return () => {
        return require("child_process").exec(
          command,
          opts,
          (err, stdout, stderr) => {
            callback(err)(stdout)(stderr)();
          }
        );
      };
    };
  };
};

exports.fork = function fork(cmd) {
  return (args) => {
    return () => {
      return require("child_process").fork(cmd, args);
    };
  };
};

exports.mkOnExit = function mkOnExit(mkChildExit) {
  return function onExit(cp) {
    return (cb) => {
      return () => {
        cp.on("exit", (code, signal) => {
          cb(mkChildExit(code)(signal))();
        });
      };
    };
  };
};

exports.mkOnClose = function mkOnClose(mkChildExit) {
  return function onClose(cp) {
    return (cb) => {
      return () => {
        cp.on("close", (code, signal) => {
          cb(mkChildExit(code)(signal))();
        });
      };
    };
  };
};

exports.onDisconnect = function onDisconnect(cp) {
  return (cb) => {
    return () => {
      cp.on("disconnect", cb);
    };
  };
};

exports.mkOnMessage = function mkOnMessage(nothing) {
  return (just) => {
    return function onMessage(cp) {
      return (cb) => {
        return () => {
          cp.on("message", (mess, sendHandle) => {
            cb(mess, sendHandle ? just(sendHandle) : nothing)();
          });
        };
      };
    };
  };
};

exports.onError = function onError(cp) {
  return (cb) => {
    return () => {
      cp.on("error", (err) => {
        cb(err)();
      });
    };
  };
};

exports.undefined = undefined;
exports.process = process;
