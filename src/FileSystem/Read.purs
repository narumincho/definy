module FileSystem.Read
  ( readBinaryFile
  , readFilePathInDirectory
  , readFilePathRecursionInDirectory
  , readJsonFile
  , readTextFile
  , readTextFileInDistribution
  ) where

import Prelude
import Console as Console
import Data.Argonaut.Core as ArgonautCore
import Data.Argonaut.Parser as ArgonautParser
import Data.Array as Array
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Name as Name
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import Util as Util

-- | distribution にあるファイルを文字列として読み取る
readTextFileInDistribution ::
  Path.DistributionFilePath ->
  FileType.FileType ->
  Aff.Aff String
readTextFileInDistribution distributionFilePath fileType = do
  buffer <- Fs.readFile (NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath fileType))
  EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer)

-- | ファイルを文字列として読み取る
readTextFile :: Path.FilePath -> FileType.FileType -> Aff.Aff String
readTextFile filePath fileType =
  bind
    (Fs.readFile (NonEmptyString.toString (Path.filePathToString filePath (Maybe.Just fileType))))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))

-- | ファイルをバイナリとして読み取る
readBinaryFile ::
  Path.FilePath ->
  Maybe FileType.FileType ->
  Aff.Aff Buffer.Buffer
readBinaryFile filePath fileTypeMaybe =
  Fs.readFile
    (NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe))

-- | ファイルを json として読み取る
readJsonFile ::
  Path.FilePath ->
  FileType.FileType ->
  Aff.Aff (Either.Either String ArgonautCore.Json)
readJsonFile filePath fileType = do
  text <- readTextFile filePath fileType
  pure (ArgonautParser.jsonParser text)

-- | ディレクトリ内に含まれるファイルのパスを取得する.
-- |
-- | 再帰的には調べず, ディレクトリ内のディレクトリは無視する.
readFilePathInDirectory ::
  Path.DirectoryPath ->
  Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe FileType.FileType)))
readFilePathInDirectory directoryPath =
  let
    directoryPathAsString :: String
    directoryPathAsString = NonEmptyString.toString (Path.directoryPathToString directoryPath)
  in
    do
      Console.logValueAsAff "ディレクトリに含まれるファイルを取得" directoryPathAsString
      direntList <- readdirWithFileTypes directoryPathAsString
      let
        result =
          Array.mapMaybe
            ( \dirent ->
                if dirent.isFile then
                  direntToFilePath directoryPath dirent.name
                else
                  Nothing
            )
            direntList
      Console.logValueAsAff "ファイルを発見!"
        { directoryPath: directoryPathAsString
        , result:
            map
              (\(Tuple.Tuple path fileType) -> Path.filePathToString path fileType)
              result
        }
      pure result

-- | ディレクトリ内に含まれるファイルのパスを再帰的に取得する.
-- |
-- | ファイルの含まれていないディレクトリは取得しない
readFilePathRecursionInDirectory ::
  Path.DirectoryPath ->
  Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe FileType.FileType)))
readFilePathRecursionInDirectory directoryPath =
  let
    directoryPathAsString :: String
    directoryPathAsString = NonEmptyString.toString (Path.directoryPathToString directoryPath)
  in
    do
      Console.logValueAsAff "ディレクトリに含まれるファイルを取得(再帰的)" directoryPathAsString
      result <- readFilePathRecursionInDirectoryLoop directoryPath
      Console.logValueAsAff "ファイルを発見!(再帰的)"
        { directoryPath: directoryPathAsString
        , result:
            map
              (\(Tuple.Tuple path fileType) -> Path.filePathToString path fileType)
              result
        }
      pure result

readFilePathRecursionInDirectoryLoop ::
  Path.DirectoryPath ->
  Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe FileType.FileType)))
readFilePathRecursionInDirectoryLoop directoryPath =
  let
    directoryPathAsString :: String
    directoryPathAsString = NonEmptyString.toString (Path.directoryPathToString directoryPath)
  in
    do
      direntList <- readdirWithFileTypes directoryPathAsString
      map
        Array.concat
        ( Util.toParallelWithReturn
            ( map
                ( \(dirent :: Dirent) ->
                    if dirent.isFile then
                      pure
                        ( case direntToFilePath directoryPath dirent.name of
                            Just tuple -> [ tuple ]
                            Nothing -> []
                        )
                    else case Name.fromString dirent.name of
                      Just dirName ->
                        readFilePathRecursionInDirectoryLoop
                          ( Path.directoryPathPushDirectoryNameList
                              directoryPath
                              [ dirName ]
                          )
                      Nothing -> pure []
                )
                direntList
            )
        )

direntToFilePath ::
  Path.DirectoryPath ->
  String ->
  Maybe (Tuple.Tuple Path.FilePath (Maybe FileType.FileType))
direntToFilePath directoryPath direntName = case Path.fileNameWithExtensionParse direntName of
  Just parseResult ->
    Just
      ( Tuple.Tuple
          ( Path.FilePath
              { directoryPath
              , fileName: parseResult.fileName
              }
          )
          parseResult.fileType
      )
  Nothing -> Nothing

type Dirent
  = { isFile :: Boolean, name :: String }

foreign import readdirWithFileTypesAsEffectFnAff :: String -> AffCompat.EffectFnAff (Array Dirent)

readdirWithFileTypes :: String -> Aff.Aff (Array Dirent)
readdirWithFileTypes path = AffCompat.fromEffectFnAff (readdirWithFileTypesAsEffectFnAff path)
