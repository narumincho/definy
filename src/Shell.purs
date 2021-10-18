-- | PowerShell などの shell のコマンドを実行する
-- |
-- | Node.ChildProcess (https://pursuit.purescript.org/packages/purescript-node-child-process/7.0.0)
-- | で spawn のオプションの shell を指定できなかったため, 別につくった
-- | https://github.com/purescript-node/purescript-node-child-process から改変
-- | The MIT License (MIT) Copyright (c) 2014-2015 Hardy Jones
module Shell
  ( Handle
  , ChildProcess
  , stdin
  , stdout
  , stderr
  , pid
  , connected
  , kill
  , send
  , disconnect
  , Error
  , toStandardError
  , Exit(..)
  , onExit
  , onClose
  , onDisconnect
  , onMessage
  , onError
  , spawn
  , SpawnOptions
  , defaultSpawnOptions
  , exec
  , execFile
  , ExecOptions
  , ExecResult
  , defaultExecOptions
  , ExecSyncOptions
  , defaultExecSyncOptions
  , fork
  , StdIOBehaviour(..)
  , pipe
  , inherit
  , ignore
  ) where

import Prelude
import Control.Alt ((<|>))
import Data.Function.Uncurried (Fn2, runFn2)
import Data.Maybe as Maybe
import Data.Nullable (Nullable, toNullable, toMaybe)
import Data.Posix (Pid, Gid, Uid)
import Data.Posix.Signal as Signal
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Exception as Exception
import Effect.Exception.Unsafe as ExceptionUnsafe
import Foreign as Foreign
import Foreign.Object as Object
import Node.Buffer (Buffer)
import Node.Encoding as Encoding
import Node.FS as FS
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
    , pid :: Pid
    , connected :: Boolean
    , kill :: String -> Unit
    , send :: forall r. Fn2 { | r } Handle Boolean
    , disconnect :: Effect.Effect Unit
    }

-- | The standard input stream of a child process. Note that this is only
-- | available if the process was spawned with the stdin option set to "pipe".
stdin :: ChildProcess -> Stream.Writable ()
stdin (ChildProcess rec) = unsafeFromNullable (missingStream "stdin") rec.stdin

-- | The standard output stream of a child process. Note that this is only
-- | available if the process was spawned with the stdout option set to "pipe".
stdout :: ChildProcess -> Stream.Readable ()
stdout (ChildProcess rec) = unsafeFromNullable (missingStream "stdout") rec.stdout

-- | The standard error stream of a child process. Note that this is only
-- | available if the process was spawned with the stderr option set to "pipe".
stderr :: ChildProcess -> Stream.Readable ()
stderr (ChildProcess rec) = unsafeFromNullable (missingStream "stderr") rec.stderr

missingStream :: String -> String
missingStream str =
  "Node.ChildProcess: stream not available: " <> str <> "\nThis is probably "
    <> "because you passed something other than Pipe to the stdio option when "
    <> "you spawned it."

foreign import unsafeFromNullable :: forall a. String -> Nullable a -> a

-- | The process ID of a child process. Note that if the process has already
-- | exited, another process may have taken the same ID, so be careful!
pid :: ChildProcess -> Pid
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
send msg handle (ChildProcess cp) = mkEffect \_ -> runFn2 cp.send msg handle

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
  show (Normally x) = "Normally " <> show x
  show (BySignal sig) = "BySignal " <> show sig

mkExit :: Nullable Int -> Nullable String -> Exit
mkExit code signal = case fromCode code <|> fromSignal signal of
  Maybe.Just e -> e
  Maybe.Nothing -> ExceptionUnsafe.unsafeThrow "Node.ChildProcess.mkExit: Invalid arguments"
  where
  fromCode = toMaybe >>> map Normally

  fromSignal = toMaybe >=> Signal.fromString >>> map BySignal

-- | Handle the `"exit"` signal.
onExit ::
  ChildProcess ->
  (Exit -> Effect.Effect Unit) ->
  Effect.Effect Unit
onExit = mkOnExit mkExit

foreign import mkOnExit ::
  (Nullable Int -> Nullable String -> Exit) ->
  ChildProcess ->
  (Exit -> Effect.Effect Unit) ->
  Effect.Effect Unit

-- | Handle the `"close"` signal.
onClose ::
  ChildProcess ->
  (Exit -> Effect.Effect Unit) ->
  Effect.Effect Unit
onClose = mkOnClose mkExit

foreign import mkOnClose ::
  (Nullable Int -> Nullable String -> Exit) ->
  ChildProcess ->
  (Exit -> Effect.Effect Unit) ->
  Effect.Effect Unit

-- | Handle the `"message"` signal.
onMessage ::
  ChildProcess ->
  (Foreign.Foreign -> Maybe.Maybe Handle -> Effect.Effect Unit) ->
  Effect.Effect Unit
onMessage = mkOnMessage Maybe.Nothing Maybe.Just

foreign import mkOnMessage ::
  forall a.
  Maybe.Maybe a ->
  (a -> Maybe.Maybe a) ->
  ChildProcess ->
  (Foreign.Foreign -> Maybe.Maybe Handle -> Effect.Effect Unit) ->
  Effect.Effect Unit

-- | Handle the `"disconnect"` signal.
foreign import onDisconnect ::
  ChildProcess ->
  Effect.Effect Unit ->
  Effect.Effect Unit

-- | Handle the `"error"` signal.
foreign import onError ::
  ChildProcess ->
  (Error -> Effect.Effect Unit) ->
  Effect.Effect Unit

-- | Spawn a child process. Note that, in the event that a child process could
-- | not be spawned (for example, if the executable was not found) this will
-- | not throw an error. Instead, the `ChildProcess` will be created anyway,
-- | but it will immediately emit an 'error' event.
spawn ::
  NonEmptyString.NonEmptyString ->
  SpawnOptions ->
  Effect.Effect ChildProcess
spawn cmd options = spawnImpl (NonEmptyString.toString cmd) [] (convertOpts options)
  where
  convertOpts opts =
    { cwd: Maybe.fromMaybe undefined opts.cwd
    , stdio: toActualStdIOOptions opts.stdio
    , env: toNullable opts.env
    , detached: opts.detached
    , uid: Maybe.fromMaybe undefined opts.uid
    , gid: Maybe.fromMaybe undefined opts.gid
    , shell:
        case Process.platform of
          Maybe.Just Platform.Win32 -> "powershell"
          _ -> "/bin/sh"
    }

foreign import spawnImpl ::
  forall opts.
  String ->
  Array String ->
  { | opts } ->
  Effect.Effect ChildProcess

-- There's gotta be a better way.
foreign import undefined :: forall a. a

-- | Configuration of `spawn`. Fields set to `Nothing` will use
-- | the node defaults.
type SpawnOptions
  = { cwd :: Maybe.Maybe String
    , stdio :: Array (Maybe.Maybe StdIOBehaviour)
    , env :: Maybe.Maybe (Object.Object String)
    , detached :: Boolean
    , uid :: Maybe.Maybe Uid
    , gid :: Maybe.Maybe Gid
    }

-- | A default set of `SpawnOptions`. Everything is set to `Nothing`,
-- | `detached` is `false` and `stdio` is `ChildProcess.pipe`.
defaultSpawnOptions :: SpawnOptions
defaultSpawnOptions =
  { cwd: Maybe.Nothing
  , stdio: pipe
  , env: Maybe.Nothing
  , detached: false
  , uid: Maybe.Nothing
  , gid: Maybe.Nothing
  }

-- | Similar to `spawn`, except that this variant will:
-- | * run the given command with the shell,
-- | * buffer output, and wait until the process has exited before calling the
-- |   callback.
-- |
-- | Note that the child process will be killed if the amount of output exceeds
-- | a certain threshold (the default is defined by Node.js).
exec ::
  String ->
  ExecOptions ->
  (ExecResult -> Effect.Effect Unit) ->
  Effect.Effect ChildProcess
exec cmd opts callback =
  execImpl cmd (convertExecOptions opts) \err stdout' stderr' ->
    callback
      { error: toMaybe err
      , stdout: stdout'
      , stderr: stderr'
      }

foreign import execImpl ::
  String ->
  ActualExecOptions ->
  (Nullable Exception.Error -> Buffer -> Buffer -> Effect.Effect Unit) ->
  Effect.Effect ChildProcess

-- | Like `exec`, except instead of using a shell, it passes the arguments
-- | directly to the specified command.
execFile ::
  String ->
  Array String ->
  ExecOptions ->
  (ExecResult -> Effect.Effect Unit) ->
  Effect.Effect ChildProcess
execFile cmd args opts callback =
  execFileImpl cmd args (convertExecOptions opts) \err stdout' stderr' ->
    callback
      { error: toMaybe err
      , stdout: stdout'
      , stderr: stderr'
      }

foreign import execFileImpl ::
  String ->
  Array String ->
  ActualExecOptions ->
  (Nullable Exception.Error -> Buffer -> Buffer -> Effect.Effect Unit) ->
  Effect.Effect ChildProcess

foreign import data ActualExecOptions :: Type

convertExecOptions :: ExecOptions -> ActualExecOptions
convertExecOptions opts =
  UnsafeCoerce.unsafeCoerce
    { cwd: Maybe.fromMaybe undefined opts.cwd
    , env: Maybe.fromMaybe undefined opts.env
    , encoding: Maybe.maybe undefined Encoding.encodingToNode opts.encoding
    , shell: Maybe.fromMaybe undefined opts.shell
    , timeout: Maybe.fromMaybe undefined opts.timeout
    , maxBuffer: Maybe.fromMaybe undefined opts.maxBuffer
    , killSignal: Maybe.fromMaybe undefined opts.killSignal
    , uid: Maybe.fromMaybe undefined opts.uid
    , gid: Maybe.fromMaybe undefined opts.gid
    }

-- | Configuration of `exec`. Fields set to `Nothing`
-- | will use the node defaults.
type ExecOptions
  = { cwd :: Maybe.Maybe String
    , env :: Maybe.Maybe (Object.Object String)
    , encoding :: Maybe.Maybe Encoding.Encoding
    , shell :: Maybe.Maybe String
    , timeout :: Maybe.Maybe Number
    , maxBuffer :: Maybe.Maybe Int
    , killSignal :: Maybe.Maybe Signal.Signal
    , uid :: Maybe.Maybe Uid
    , gid :: Maybe.Maybe Gid
    }

-- | A default set of `ExecOptions`. Everything is set to `Nothing`.
defaultExecOptions :: ExecOptions
defaultExecOptions =
  { cwd: Maybe.Nothing
  , env: Maybe.Nothing
  , encoding: Maybe.Nothing
  , shell: Maybe.Nothing
  , timeout: Maybe.Nothing
  , maxBuffer: Maybe.Nothing
  , killSignal: Maybe.Nothing
  , uid: Maybe.Nothing
  , gid: Maybe.Nothing
  }

-- | The combined output of a process calld with `exec`.
type ExecResult
  = { stderr :: Buffer
    , stdout :: Buffer
    , error :: Maybe.Maybe Exception.Error
    }

foreign import execSyncImpl ::
  String ->
  ActualExecSyncOptions ->
  Effect.Effect Buffer

foreign import execFileSyncImpl ::
  String ->
  Array String ->
  ActualExecSyncOptions ->
  Effect.Effect Buffer

foreign import data ActualExecSyncOptions :: Type

type ExecSyncOptions
  = { cwd :: Maybe.Maybe String
    , input :: Maybe.Maybe String
    , stdio :: Array (Maybe.Maybe StdIOBehaviour)
    , env :: Maybe.Maybe (Object.Object String)
    , timeout :: Maybe.Maybe Number
    , maxBuffer :: Maybe.Maybe Int
    , killSignal :: Maybe.Maybe Signal.Signal
    , uid :: Maybe.Maybe Uid
    , gid :: Maybe.Maybe Gid
    }

defaultExecSyncOptions :: ExecSyncOptions
defaultExecSyncOptions =
  { cwd: Maybe.Nothing
  , input: Maybe.Nothing
  , stdio: pipe
  , env: Maybe.Nothing
  , timeout: Maybe.Nothing
  , maxBuffer: Maybe.Nothing
  , killSignal: Maybe.Nothing
  , uid: Maybe.Nothing
  , gid: Maybe.Nothing
  }

-- | A special case of `spawn` for creating Node.js child processes. The first
-- | argument is the module to be run, and the second is the argv (command line
-- | arguments).
foreign import fork ::
  String ->
  Array String ->
  Effect.Effect ChildProcess

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

-- | Behaviour for standard IO streams (eg, standard input, standard output) of
-- | a child process.
-- |
-- | * `Pipe`: creates a pipe between the child and parent process, which can
-- |   then be accessed as a `Stream` via the `stdin`, `stdout`, or `stderr`
-- |   functions.
-- | * `Ignore`: ignore this stream. This will cause Node to open /dev/null and
-- |   connect it to the stream.
-- | * `ShareStream`: Connect the supplied stream to the corresponding file
-- |    descriptor in the child.
-- | * `ShareFD`: Connect the supplied file descriptor (which should be open
-- |   in the parent) to the corresponding file descriptor in the child.
data StdIOBehaviour
  = Pipe
  | Ignore
  | ShareStream (forall r. Stream.Stream r)
  | ShareFD FS.FileDescriptor

-- | Create pipes for each of the three standard IO streams.
pipe :: Array (Maybe.Maybe StdIOBehaviour)
pipe = map Maybe.Just [ Pipe, Pipe, Pipe ]

-- | Share `stdin` with `stdin`, `stdout` with `stdout`,
-- | and `stderr` with `stderr`.
inherit :: Array (Maybe.Maybe StdIOBehaviour)
inherit =
  map Maybe.Just
    [ ShareStream process.stdin
    , ShareStream process.stdout
    , ShareStream process.stderr
    ]

foreign import process :: forall props. { | props }

-- | Ignore all streams.
ignore :: Array (Maybe.Maybe StdIOBehaviour)
ignore = map Maybe.Just [ Ignore, Ignore, Ignore ]

-- Helpers
foreign import data ActualStdIOBehaviour :: Type

toActualStdIOBehaviour :: StdIOBehaviour -> ActualStdIOBehaviour
toActualStdIOBehaviour b = case b of
  Pipe -> c "pipe"
  Ignore -> c "ignore"
  ShareFD x -> c x
  ShareStream stream -> c stream
  where
  c :: forall a. a -> ActualStdIOBehaviour
  c = UnsafeCoerce.unsafeCoerce

type ActualStdIOOptions
  = Array (Nullable ActualStdIOBehaviour)

toActualStdIOOptions :: Array (Maybe.Maybe StdIOBehaviour) -> ActualStdIOOptions
toActualStdIOOptions = map (toNullable <<< map toActualStdIOBehaviour)
