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
  , execWithLog
  , spawnWithLog
  ) where

import Prelude
import Console as Console
import Data.Either as Either
import Data.Maybe as Maybe
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect as Effect
import Effect.Aff as Aff
import Effect.Exception as Exception
import Effect.Uncurried as EffectUncurried
import Node.Platform as Platform
import Node.Process as Process
import Node.Stream as Stream
import Node.Buffer as Buffer
import Node.Encoding as Encoding

-- | Note: some of these types are lies, and so it is unsafe to access some of
-- | these record fields directly.
type ChildProcess
  = { stdin :: Stream.Writable ()
    , stdout :: Stream.Readable ()
    , stderr :: Stream.Readable ()
    }

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

spawnWithLog ::
  NonEmptyString ->
  Effect.Effect Unit
spawnWithLog cmd = do
  childProcess <- spawn cmd
  Stream.onData
    (childProcess.stdout)
    ( \buffer -> do
        stdout <- (Buffer.toString Encoding.UTF8 buffer)
        Console.logValue "stdout" stdout
    )
  Stream.onData
    (childProcess.stderr)
    ( \buffer -> do
        stderr <- (Buffer.toString Encoding.UTF8 buffer)
        Console.logValue "sterr" stderr
    )

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
