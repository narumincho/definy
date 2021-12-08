module TypeScript.Tsc
  ( TsOrTsx(..)
  , compile
  ) where

import Prelude
import Console as Console
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Prelude as Prelude

data TsOrTsx
  = Ts
  | Tsx

compile ::
  { rootNames :: NonEmptyArray (Tuple.Tuple Path.FilePath TsOrTsx)
  , outDirMaybe :: Maybe Path.DistributionDirectoryPath
  , {- output .d.ts file -} declaration :: Boolean
  } ->
  Aff.Aff Unit
compile { rootNames, outDirMaybe, declaration } =
  let
    filePathList :: Array String
    filePathList =
      NonEmptyArray.toArray
        ( Prelude.map
            ( \(Tuple.Tuple fileName fileType) ->
                NonEmptyString.toString
                  ( Path.filePathToString fileName
                      ( Maybe.Just
                          ( case fileType of
                              Ts -> FileType.TypeScript
                              Tsx -> FileType.TypeScriptReact
                          )
                      )
                  )
            )
            rootNames
        )
  in
    do
      AffCompat.fromEffectFnAff
        ( compileAsEffectFnAff
            { rootNames: filePathList
            , outDir:
                Nullable.toNullable
                  ( Prelude.map
                      (\outDir -> NonEmptyString.toString (Path.distributionDirectoryPathToString outDir))
                      outDirMaybe
                  )
            , declaration
            }
        )
      Console.logValueAsAff "tsc に成功!"
        { rootNames: filePathList
        , outDir: Prelude.map Path.distributionDirectoryPathToString outDirMaybe
        }

foreign import compileAsEffectFnAff ::
  { rootNames :: Array String
  , outDir :: Nullable String
  , declaration :: Boolean
  } ->
  AffCompat.EffectFnAff Unit
