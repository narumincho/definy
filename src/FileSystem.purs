module FileSystem
  ( DistributionFilePath(..)
  , DistributionDirectoryPath(..)
  , writeTextFileInDistribution
  , readTextFile
  , readTextFileInDistribution
  , filePathToStringWithoutExtensition
  , FilePath(..)
  , DirectoryPath(..)
  , filePathToString
  , readFilePathInDirectory
  , fileTypeToExtension
  , readBinaryFile
  , filePathFileName
  , filePathFileType
  , distributionFilePathToString
  , distributionDirectoryPathToString
  , fileNameWithExtensitonParse
  , writePureScript
  ) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty as ArrayNonEmpty
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileType as FileType
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import PureScript.Data as PureScriptData
import PureScript.ToString as PureScriptToString

newtype DistributionDirectoryPath
  = DistributionDirectoryPath
  { appName :: NonEmptyString.NonEmptyString
  , folderNameMaybe :: Maybe.Maybe NonEmptyString.NonEmptyString
  }

newtype DistributionFilePath
  = DistributionFilePath
  { directoryPath :: DistributionDirectoryPath
  , fileName :: NonEmptyString.NonEmptyString
  , fileType :: Maybe.Maybe FileType.FileType
  }

newtype DirectoryPath
  = DirectoryPath (Array NonEmptyString.NonEmptyString)

newtype FilePath
  = FilePath
  { directoryPath :: DirectoryPath
  , fileName :: NonEmptyString.NonEmptyString
  , fileType :: Maybe.Maybe FileType.FileType
  }

filePathFileName :: FilePath -> NonEmptyString.NonEmptyString
filePathFileName (FilePath { fileName }) = fileName

filePathFileType :: FilePath -> Maybe.Maybe FileType.FileType
filePathFileType (FilePath { fileType }) = fileType

directoryPathToString :: DirectoryPath -> NonEmptyString.NonEmptyString
directoryPathToString (DirectoryPath directoryNameList) =
  if Array.null directoryNameList then
    (NonEmptyString.singleton (String.codePointFromChar '.'))
  else
    NonEmptyString.appendString (NonEmptyString.cons (String.codePointFromChar '.') "/")
      (NonEmptyString.joinWith "/" directoryNameList)

filePathToString :: FilePath -> NonEmptyString.NonEmptyString
filePathToString (FilePath { directoryPath, fileName, fileType: fileTypeMaybe }) =
  append
    ( append
        (directoryPathToString directoryPath)
        (NonEmptyString.singleton (String.codePointFromChar '/'))
    )
    ( case fileTypeMaybe of
        Maybe.Just fileType -> fileNameWithFileTypeToString fileName fileType
        Maybe.Nothing -> fileName
    )

fileNameWithFileTypeToString :: NonEmptyString.NonEmptyString -> FileType.FileType -> NonEmptyString.NonEmptyString
fileNameWithFileTypeToString fileName fileType =
  append
    fileName
    (NonEmptyString.prependString "." (fileTypeToExtension fileType))

fileTypeToExtension :: FileType.FileType -> NonEmptyString.NonEmptyString
fileTypeToExtension = case _ of
  FileType.Png -> NonEmptyString.cons (String.codePointFromChar 'p') "ng"
  FileType.TypeScript -> NonEmptyString.cons (String.codePointFromChar 't') "s"
  FileType.JavaScript -> NonEmptyString.cons (String.codePointFromChar 'j') "s"
  FileType.Html -> NonEmptyString.cons (String.codePointFromChar 'h') "tml"
  FileType.Json -> NonEmptyString.cons (String.codePointFromChar 'j') "son"
  FileType.PureScript -> NonEmptyString.cons (String.codePointFromChar 'p') "urs"

extensionToFileType :: String -> Maybe.Maybe FileType.FileType
extensionToFileType = case _ of
  "png" -> Maybe.Just FileType.Png
  "ts" -> Maybe.Just FileType.TypeScript
  "js" -> Maybe.Just FileType.JavaScript
  "html" -> Maybe.Just FileType.Html
  "json" -> Maybe.Just FileType.Json
  "purs" -> Maybe.Just FileType.PureScript
  _ -> Maybe.Nothing

filePathToStringWithoutExtensition :: FilePath -> NonEmptyString.NonEmptyString
filePathToStringWithoutExtensition (FilePath { directoryPath, fileName }) =
  append
    (NonEmptyString.appendString (directoryPathToString directoryPath) "/")
    fileName

distributionDirectoryPathToString :: DistributionDirectoryPath -> NonEmptyString.NonEmptyString
distributionDirectoryPathToString distributionDirectoryPath =
  directoryPathToString
    ( distributionDirectoryPathToDirectoryPath distributionDirectoryPath
    )

distributionFilePathToString :: DistributionFilePath -> NonEmptyString.NonEmptyString
distributionFilePathToString (DistributionFilePath { directoryPath, fileName, fileType }) =
  filePathToString
    ( FilePath
        { directoryPath: distributionDirectoryPathToDirectoryPath directoryPath
        , fileName
        , fileType
        }
    )

distributionDirectoryPathToDirectoryPath :: DistributionDirectoryPath -> DirectoryPath
distributionDirectoryPathToDirectoryPath (DistributionDirectoryPath { appName, folderNameMaybe }) =
  ( DirectoryPath
      ( Array.concat
          [ [ NonEmptyString.cons (String.codePointFromChar 'd') "istribution", appName ]
          , case folderNameMaybe of
              Maybe.Just folderName -> [ folderName ]
              Maybe.Nothing -> []
          ]
      )
  )

distributionFilePathToDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionFilePathToDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

directoryPathPushDirectoryNameList :: DirectoryPath -> Array NonEmptyString.NonEmptyString -> DirectoryPath
directoryPathPushDirectoryNameList (DirectoryPath directoryPath) list = DirectoryPath (append directoryPath list)

-- | distribution に ファイルを文字列として書き込む
writeTextFileInDistribution :: DistributionFilePath -> String -> Aff.Aff Unit
writeTextFileInDistribution distributionFilePath content =
  let
    dirPath :: String
    dirPath = NonEmptyString.toString (distributionDirectoryPathToString (distributionFilePathToDirectoryPath distributionFilePath))

    filePath :: String
    filePath = NonEmptyString.toString (distributionFilePathToString distributionFilePath)
  in
    bind
      ( bind
          (ensureDir dirPath)
          (\_ -> Fs.writeTextFile Encoding.UTF8 filePath content)
      )
      ( \_ ->
          EffectClass.liftEffect (Console.log (append filePath "の書き込みに成功"))
      )

writePureScript :: DirectoryPath -> PureScriptData.Module -> Aff.Aff Unit
writePureScript srcDirectoryPath pModule =
  let
    moduleNameAsNonEmptyArrayUnsnoced = ArrayNonEmpty.unsnoc (PureScriptData.moduleNameAsStringNonEmptyArray pModule)

    directoryPath :: DirectoryPath
    directoryPath = directoryPathPushDirectoryNameList srcDirectoryPath moduleNameAsNonEmptyArrayUnsnoced.init

    dirPath :: String
    dirPath = NonEmptyString.toString (directoryPathToString directoryPath)

    filePath :: String
    filePath =
      NonEmptyString.toString
        ( filePathToString
            ( FilePath
                { directoryPath
                , fileName: moduleNameAsNonEmptyArrayUnsnoced.last
                , fileType: Maybe.Just FileType.PureScript
                }
            )
        )
  in
    bind
      ( bind
          (ensureDir dirPath)
          (\_ -> Fs.writeTextFile Encoding.UTF8 filePath (PureScriptToString.toString pModule))
      )
      ( \_ ->
          EffectClass.liftEffect (Console.log (append filePath "の書き込みに成功"))
      )

foreign import ensureDirAsEffectFnAff :: String -> AffCompat.EffectFnAff Unit

ensureDir :: String -> Aff.Aff Unit
ensureDir path = AffCompat.fromEffectFnAff (ensureDirAsEffectFnAff path)

-- | distribution にあるファイルを文字列として読み取る
readTextFileInDistribution :: DistributionFilePath -> Aff.Aff String
readTextFileInDistribution distributionFilePath =
  bind
    (Fs.readFile (NonEmptyString.toString (distributionFilePathToString distributionFilePath)))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))

-- | ファイルを文字列として読み取る
readTextFile :: FilePath -> Aff.Aff String
readTextFile filePath =
  bind
    (Fs.readFile (NonEmptyString.toString (filePathToString filePath)))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))

-- | ファイルをバイナリとして読み取る
readBinaryFile :: FilePath -> Aff.Aff Buffer.Buffer
readBinaryFile filePath = Fs.readFile (NonEmptyString.toString (filePathToString filePath))

-- | ディレクトリ内に含まれるファイルのパスを取得する.
-- |
-- |  再帰的には調べず, ディレクトリ内のディレクトリは無視する.
readFilePathInDirectory :: DirectoryPath -> Aff.Aff (Array FilePath)
readFilePathInDirectory directoryPath = do
  let
    dirPath = (NonEmptyString.toString (directoryPathToString directoryPath))
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

direntToFilePath :: DirectoryPath -> Dirent -> Maybe.Maybe FilePath
direntToFilePath directoryPath dirent =
  if dirent.isFile then case NonEmptyString.fromString dirent.name of
    Maybe.Just direntName -> case fileNameWithExtensitonParse direntName of
      Maybe.Just parseResult ->
        Maybe.Just
          ( FilePath
              { directoryPath, fileName: parseResult.fileName, fileType: parseResult.fileType
              }
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

fileNameWithExtensitonParse :: NonEmptyString.NonEmptyString -> Maybe.Maybe { fileName :: NonEmptyString.NonEmptyString, fileType :: Maybe.Maybe FileType.FileType }
fileNameWithExtensitonParse fileNameWithExtensiton = case NonEmptyString.lastIndexOf (String.Pattern ".") fileNameWithExtensiton of
  Maybe.Just index ->
    let
      afterAndBefore = String.splitAt index (NonEmptyString.toString fileNameWithExtensiton)
    in
      map
        ( \fileName ->
            { fileName: fileName, fileType: extensionToFileType (String.drop 1 afterAndBefore.after) }
        )
        (NonEmptyString.fromString afterAndBefore.before)
  Maybe.Nothing -> Maybe.Just { fileName: fileNameWithExtensiton, fileType: Maybe.Nothing }
