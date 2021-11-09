module FileSystem.Read
  ( readTextFileInDistribution
  , readTextFile
  , readBinaryFile
  , readFilePathInDirectory
  , readJsonFile
  ) where

import Prelude
import Data.Argonaut.Core as ArgonautCore
import Data.Argonaut.Parser as ArgonautParser
import Data.Array as Array
import Data.Either as Either
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.FS.Aff as Fs

-- | distribution にあるファイルを文字列として読み取る
readTextFileInDistribution :: Path.DistributionFilePath -> FileType.FileType -> Aff.Aff String
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
readBinaryFile :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Aff.Aff Buffer.Buffer
readBinaryFile filePath fileTypeMaybe =
  Fs.readFile
    (NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe))

-- | ファイルを json として読み取る
readJsonFile :: Path.FilePath -> FileType.FileType -> Aff.Aff (Either.Either String ArgonautCore.Json)
readJsonFile filePath fileType = do
  text <- readTextFile filePath fileType
  pure (ArgonautParser.jsonParser text)

-- | ディレクトリ内に含まれるファイルのパスを取得する.
-- |
-- | 再帰的には調べず, ディレクトリ内のディレクトリは無視する.
readFilePathInDirectory :: Path.DirectoryPath -> Aff.Aff (Array (Tuple.Tuple Path.FilePath (Maybe.Maybe FileType.FileType)))
readFilePathInDirectory directoryPath =
  let
    dirPath = NonEmptyString.toString (Path.directoryPathToString directoryPath)
  in
    do
      EffectClass.liftEffect (Console.log (append dirPath " 内のファイルを取得"))
      direntList <- readdirWithFileTypes dirPath
      EffectClass.liftEffect (Console.logShow direntList)
      let
        result = Array.mapMaybe (\dirent -> direntToFilePath directoryPath dirent) direntList
      EffectClass.liftEffect
        ( Console.log
            ( String.joinWith ""
                [ dirPath
                , " 内に "
                , show (Array.length result)
                , " こ のファイルを発見!"
                ]
            )
        )
      pure result

direntToFilePath :: Path.DirectoryPath -> Dirent -> Maybe.Maybe (Tuple.Tuple Path.FilePath (Maybe.Maybe FileType.FileType))
direntToFilePath directoryPath dirent =
  if dirent.isFile then case NonEmptyString.fromString dirent.name of
    Maybe.Just direntName -> case Path.fileNameWithExtensitonParse direntName of
      Maybe.Just parseResult ->
        Maybe.Just
          ( Tuple.Tuple
              ( Path.FilePath
                  { directoryPath
                  , fileName: parseResult.fileName
                  }
              )
              parseResult.fileType
          )
      Maybe.Nothing -> Maybe.Nothing
    Maybe.Nothing -> Maybe.Nothing
  else
    Maybe.Nothing

type Dirent
  = { isFile :: Boolean, name :: String }

foreign import readdirWithFileTypesAsEffectFnAff :: String -> AffCompat.EffectFnAff (Array Dirent)

readdirWithFileTypes :: String -> Aff.Aff (Array Dirent)
readdirWithFileTypes path = AffCompat.fromEffectFnAff (readdirWithFileTypesAsEffectFnAff path)
