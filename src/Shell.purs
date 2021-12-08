-- | PowerShell などの shell のコマンドを実行する
-- |
-- | Node.ChildProcess (https://pursuit.purescript.org/packages/purescript-node-child-process/7.0.0)
-- | で spawn のオプションの shell を指定できなかったため, 別につくった
-- | https://github.com/purescript-node/purescript-node-child-process から改変
-- | The MIT License (MIT) Copyright (c) 2014-2015 Hardy Jones
module Shell
  ( ChildProcess
  , Error
  , ExecResult
  , Exit(..)
  , Handle
  , connected
  , disconnect
  , execWithLog
  , kill
  , pid
  , send
  , spawn
  , stderr
  , stdin
  , stdout
  , toStandardError
  ) where

import Prelude
import Console as Console
import Data.Either as Either
import Data.Function.Uncurried as FunctionUncurried
import Data.Maybe as Maybe
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.Posix as Posix
import Data.Posix.Signal as Signal
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import Effect.Exception as Exception
import Effect.Uncurried as EffectUncurried
import Node.Platform as Platform
import Node.Process as Process
import Node.Stream as Stream
import Unsafe.Coerce as UnsafeCoerce

-- | A handle for inter-process communication (IPC).
foreign import data Handle :: Type

-- | Opaque type returned by `spawn`, `fork` and `exec`.
-- | Needed as input for most methods in this module.
newtype ChildProcess
  = ChildProcess ChildProcessRec

-- | Note: some of these types are lies, and so it is unsafe to access some of
-- | these record fields directly.
type ChildProcessRec
  = { stdin :: Nullable (Stream.Writable ())
    , stdout :: Nullable (Stream.Readable ())
    , stderr :: Nullable (Stream.Readable ())
    , pid :: Posix.Pid
    , connected :: Boolean
    , kill :: String -> Unit
    , send :: forall r. FunctionUncurried.Fn2 { | r } Handle Boolean
    , disconnect :: Effect.Effect Unit
    }

-- | The standard input stream of a child process. Note that this is only
-- | available if the process was spawned with the stdin option set to "pipe".
stdin :: ChildProcess -> Stream.Writable ()
stdin (ChildProcess rec) =
  FunctionUncurried.runFn2 unsafeFromNullable
    (missingStream "stdin")
    rec.stdin

-- | The standard output stream of a child process. Note that this is only
-- | available if the process was spawned with the stdout option set to "pipe".
stdout :: ChildProcess -> Stream.Readable ()
stdout (ChildProcess rec) =
  FunctionUncurried.runFn2 unsafeFromNullable
    (missingStream "stdout")
    rec.stdout

-- | The standard error stream of a child process. Note that this is only
-- | available if the process was spawned with the stderr option set to "pipe".
stderr :: ChildProcess -> Stream.Readable ()
stderr (ChildProcess rec) =
  FunctionUncurried.runFn2 unsafeFromNullable
    (missingStream "stderr")
    rec.stderr

missingStream :: String -> String
missingStream str =
  String.joinWith ""
    [ "Node.ChildProcess: stream not available: "
    , str
    , "\nThis is probably "
    , "because you passed something other than Pipe to the stdio option when "
    , "you spawned it."
    ]

foreign import unsafeFromNullable ::
  forall a.
  FunctionUncurried.Fn2 String (Nullable a) a

-- | The process ID of a child process. Note that if the process has already
-- | exited, another process may have taken the same ID, so be careful!
pid :: ChildProcess -> Posix.Pid
pid (ChildProcess rec) = rec.pid

-- | Indicates whether it is still possible to send and receive
-- | messages from the child process.
connected :: ChildProcess -> Effect.Effect Boolean
connected (ChildProcess cp) = mkEffect \_ -> cp.connected

-- | Send messages to the (`nodejs`) child process.
-- |
-- | See the [node documentation](https://nodejs.org/api/child_process.html#child_process_subprocess_send_message_sendhandle_options_callback)
-- | for in-depth documentation.
send ::
  forall props.
  { | props } ->
  Handle ->
  ChildProcess ->
  Effect.Effect Boolean
send msg handle (ChildProcess cp) = mkEffect \_ -> FunctionUncurried.runFn2 cp.send msg handle

-- | Closes the IPC channel between parent and child.
disconnect :: ChildProcess -> Effect.Effect Unit
disconnect (ChildProcess rec) = rec.disconnect

-- | Send a signal to a child process. In the same way as the
-- | [unix kill(2) system call](https://linux.die.net/man/2/kill),
-- | sending a signal to a child process won't necessarily kill it.
-- |
-- | The resulting effects of this function depend on the process
-- | and the signal. They can vary from system to system.
-- | The child process might emit an `"error"` event if the signal
-- | could not be delivered.
kill :: Signal.Signal -> ChildProcess -> Effect.Effect Unit
kill sig (ChildProcess cp) = mkEffect \_ -> cp.kill (Signal.toString sig)

mkEffect :: forall a. (Unit -> a) -> Effect.Effect a
mkEffect = UnsafeCoerce.unsafeCoerce

-- | Specifies how a child process exited; normally (with an exit code), or
-- | due to a signal.
data Exit
  = Normally Int
  | BySignal Signal.Signal

instance showExit :: Show Exit where
  show (Normally x) = append "Normally " (show x)
  show (BySignal sig) = append "BySignal " (show sig)

-- | Spawn a child process. Note that, in the event that a child process could
-- | not be spawned (for example, if the executable was not found) this will
-- | not throw an error. Instead, the `ChildProcess` will be created anyway,
-- | but it will immediately emit an 'error' event.
spawn ::
  NonEmptyString ->
  Effect.Effect ChildProcess
spawn cmd =
  EffectUncurried.runEffectFn3 spawnImpl (NonEmptyString.toString cmd) []
    { shell:
        case Process.platform of
          Maybe.Just Platform.Win32 -> "powershell"
          _ -> "/bin/sh"
    }

foreign import spawnImpl ::
  EffectUncurried.EffectFn3
    String
    (Array String)
    RawSpawnOption
    ChildProcess

type RawSpawnOption
  = { shell :: String }

-- | Similar to `spawn`, except that this variant will:
-- | * run the given command with the shell,
-- | * buffer output, and wait until the process has exited before calling the
-- |   callback.
-- |
-- | Note that the child process will be killed if the amount of output exceeds
-- | a certain threshold (the default is defined by Node.js).
exec ::
  NonEmptyString ->
  (ExecResult -> Effect.Effect Unit) ->
  Effect.Effect ChildProcess
exec cmd callback =
  EffectUncurried.runEffectFn2
    execImpl
    (NonEmptyString.toString cmd)
    ( \err stdoutAsString stderrAsString ->
        callback
          { error: Nullable.toMaybe err
          , stdout: stdoutAsString
          , stderr: stderrAsString
          }
    )

execWithLog :: NonEmptyString -> Aff.Aff Unit
execWithLog cmd =
  Aff.makeAff
    ( \callback ->
        map (\_ -> Aff.nonCanceler)
          ( exec
              cmd
              ( \result -> do
                  Console.logValue "error" result.error
                  Console.logValue "stdout" result.stdout
                  Console.logValue "stderr" result.stderr
                  callback (Either.Right unit)
              )
          )
    )

foreign import execImpl ::
  EffectUncurried.EffectFn2
    String
    (Nullable Exception.Error -> String -> String -> Effect.Effect Unit)
    ChildProcess

-- | The combined output of a process calld with `exec`.
type ExecResult
  = { stderr :: String
    , stdout :: String
    , error :: Maybe.Maybe Exception.Error
    }

-- | An error which occurred inside a child process.
type Error
  = { code :: String
    , errno :: String
    , syscall :: String
    }

-- | Convert a ChildProcess.Error to a standard Error, which can then be thrown
-- | inside an Effect or Aff computation (for example).
toStandardError :: Error -> Exception.Error
toStandardError = UnsafeCoerce.unsafeCoerce
