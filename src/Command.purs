module Command
  ( execJsWithoutExtensionByNodeJsWithLog
  , execWithLog
  ) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import FileSystem.Path as Path
import Node.Process as Process

execJsWithoutExtensionByNodeJsWithLog ::
  { name :: NonEmptyString
  , filePath :: Path.FilePath
  , parameters :: Array NonEmptyString
  } ->
  Aff.Aff Unit
execJsWithoutExtensionByNodeJsWithLog { name, filePath, parameters } = do
  nodeJsExecPath <- EffectClass.liftEffect Process.execPath
  execWithLog
    { name
    , filePath: nodeJsExecPath
    , parameters:
        Array.cons
          (Path.filePathToString filePath Nothing)
          parameters
    }

execWithLog ::
  { name :: NonEmptyString
  , filePath :: String
  , parameters :: Array NonEmptyString
  } ->
  Aff.Aff Unit
execWithLog { name, filePath, parameters } = do
  result <-
    AffCompat.fromEffectFnAff
      ( childProcessExecFile
          { filePath
          , parameters: map NonEmptyString.toString parameters
          }
      )
  Console.logValueAsAff "childProcess" name
  Console.logValueAsAff "stdout" result.stdout
  Console.logValueAsAff "sterr" result.stderr

type ExecParameter
  = { filePath :: String
    , parameters :: Array String
    }

type ExecResult
  = { stdout :: String
    , stderr :: String
    }

foreign import childProcessExecFile ::
  ExecParameter ->
  (AffCompat.EffectFnAff ExecResult)
