module FfiTsToJs (main) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple as Tuple
import Effect (Effect)
import Effect.Aff as Aff
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Read as FileSystemRead
import TypeScript.Tsc as Tsc
import Data.Array.NonEmpty as NonEmptyArray

main :: Effect Unit
main =
  Aff.runAff_ (Console.logValue "build aff result")
    (Aff.attempt runTsc)

runTsc :: Aff.Aff Unit
runTsc = do
  fileList <- FileSystemRead.readFilePathRecursionInDirectory Path.srcDirectoryPath
  let
    rootNames =
      Array.mapMaybe
        ( \(Tuple.Tuple filePath fileType) -> case fileType of
            Just FileType.TypeScript ->
              Just
                ( Tuple.Tuple
                    filePath
                    Tsc.Ts
                )
            _ -> Nothing
        )
        fileList
  case NonEmptyArray.fromArray rootNames of
    Just rootNamesNonEmpty ->
      Tsc.compile
        { rootNames: rootNamesNonEmpty
        , outDirMaybe: Nothing
        , declaration: false
        }
    Nothing -> Console.logValueAsAff "Tscするファイルがなかった..." unit
