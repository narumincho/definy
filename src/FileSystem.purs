module FileSystem
  ( DistributionFilePath(..)
  , DistributionDirectoryPath(..)
  , writeTextFile
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
  ) where

import Data.Array as Array
import Data.Maybe as Maybe
import Data.String as String
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import Effect.Class as EffectClass
import Effect.Console as Console
import FileType as FileType
import Node.Buffer as Buffer
import Node.Encoding as Encoding
import Node.FS.Aff as Fs
import Node.Path as Path
import Prelude as Prelude

newtype DistributionDirectoryPath
  = DistributionDirectoryPath
  { appName :: String
  , folderNameMaybe :: Maybe.Maybe String
  }

newtype DistributionFilePath
  = DistributionFilePath
  { directoryPath :: DistributionDirectoryPath
  , fileName :: String
  , fileType :: Maybe.Maybe FileType.FileType
  }

newtype DirectoryPath
  = DirectoryPath (Array String)

newtype FilePath
  = FilePath
  { directoryPath :: DirectoryPath
  , fileName :: String
  , fileType :: Maybe.Maybe FileType.FileType
  }

filePathFileName :: FilePath -> String
filePathFileName (FilePath { fileName }) = fileName

filePathFileType :: FilePath -> Maybe.Maybe FileType.FileType
filePathFileType (FilePath { fileType }) = fileType

directoryPathToString :: DirectoryPath -> String
directoryPathToString (DirectoryPath directoryNameList) =
  if Array.null directoryNameList then
    "."
  else
    Prelude.append "./"
      (String.joinWith "/" directoryNameList)

filePathToString :: FilePath -> String
filePathToString (FilePath { directoryPath, fileName, fileType: fileTypeMaybe }) =
  String.joinWith
    "/"
    [ directoryPathToString directoryPath
    , case fileTypeMaybe of
        Maybe.Just fileType -> fileNameWithFileTypeToString fileName fileType
        Maybe.Nothing -> fileName
    ]

fileNameWithFileTypeToString :: String -> FileType.FileType -> String
fileNameWithFileTypeToString fileName fileType =
  String.joinWith "."
    [ fileName
    , fileTypeToExtension fileType
    ]

fileTypeToExtension :: FileType.FileType -> String
fileTypeToExtension = case _ of
  FileType.Png -> "png"
  FileType.TypeScript -> "ts"
  FileType.JavaScript -> "js"
  FileType.Html -> "html"
  FileType.Json -> "json"

extensionToFileType :: String -> Maybe.Maybe FileType.FileType
extensionToFileType = case _ of
  "png" -> Maybe.Just FileType.Png
  "ts" -> Maybe.Just FileType.TypeScript
  "js" -> Maybe.Just FileType.JavaScript
  "html" -> Maybe.Just FileType.Html
  "json" -> Maybe.Just FileType.Json
  _ -> Maybe.Nothing

filePathToStringWithoutExtensition :: FilePath -> String
filePathToStringWithoutExtensition (FilePath { directoryPath, fileName }) =
  String.joinWith
    "/"
    [ directoryPathToString directoryPath
    , fileName
    ]

distributionDirectoryPathToString :: DistributionDirectoryPath -> String
distributionDirectoryPathToString distributionDirectoryPath =
  directoryPathToString
    ( distributionDirectoryPathToDirectoryPath distributionDirectoryPath
    )

distributionFilePathToString :: DistributionFilePath -> String
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
          [ [ "distribution", appName ]
          , case folderNameMaybe of
              Maybe.Just folderName -> [ folderName ]
              Maybe.Nothing -> []
          ]
      )
  )

distributionFilePathToDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionFilePathToDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

-- | distribution に ファイルを文字列として書き込む
writeTextFile :: DistributionFilePath -> String -> Aff.Aff Prelude.Unit
writeTextFile distributionFilePath content =
  let
    dirPath :: String
    dirPath = distributionDirectoryPathToString (distributionFilePathToDirectoryPath distributionFilePath)

    filePath :: String
    filePath = distributionFilePathToString distributionFilePath
  in
    Prelude.bind
      ( Prelude.bind
          (ensureDir dirPath)
          (\_ -> Fs.writeTextFile Encoding.UTF8 filePath content)
      )
      ( \_ ->
          EffectClass.liftEffect (Console.log (Prelude.append filePath "の書き込みに成功"))
      )

foreign import ensureDirAsEffectFnAff :: String -> AffCompat.EffectFnAff Prelude.Unit

ensureDir :: String -> Aff.Aff Prelude.Unit
ensureDir path = AffCompat.fromEffectFnAff (ensureDirAsEffectFnAff path)

-- | distribution にあるファイルを文字列として読み取る
readTextFileInDistribution :: DistributionFilePath -> Aff.Aff String
readTextFileInDistribution distributionFilePath =
  Prelude.bind
    (Fs.readFile (distributionFilePathToString distributionFilePath))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))

-- | ファイルを文字列として読み取る
readTextFile :: FilePath -> Aff.Aff String
readTextFile filePath =
  Prelude.bind
    (Fs.readFile (filePathToString filePath))
    (\buffer -> EffectClass.liftEffect (Buffer.toString Encoding.UTF8 buffer))

-- | ファイルをバイナリとして読み取る
readBinaryFile :: FilePath -> Aff.Aff Buffer.Buffer
readBinaryFile filePath = Fs.readFile (filePathToString filePath)

-- | ディレクトリ内に含まれるファイルのパスを取得する.
-- |
-- |  再帰的には調べず, ディレクトリ内のディレクトリは無視する.
readFilePathInDirectory :: DirectoryPath -> Aff.Aff (Array FilePath)
readFilePathInDirectory directoryPath =
  let
    dirPath = directoryPathToString directoryPath
  in
    Prelude.bind
      ( Prelude.bind
          (EffectClass.liftEffect (Console.log (Prelude.append dirPath " 内のファイルを取得")))
          ( \_ ->
              Prelude.map
                ( \direntList ->
                    Array.mapMaybe
                      ( \dirent ->
                          direntToFilePath directoryPath dirent
                      )
                      direntList
                )
                (readdirWithFileTypes dirPath)
          )
      )
      ( \result ->
          Prelude.map (\_ -> result)
            ( EffectClass.liftEffect
                ( Console.log
                    ( String.joinWith ""
                        [ dirPath
                        , " 内に"
                        , Prelude.show (Array.length result)
                        , "このファイルを発見!"
                        ]
                    )
                )
            )
      )

direntToFilePath :: DirectoryPath -> Dirent -> Maybe.Maybe FilePath
direntToFilePath directoryPath dirent =
  if dirent.isFile then
    Maybe.Nothing
  else
    let
      parseResult = Path.parse dirent.name
    in
      Maybe.Just
        ( FilePath
            { directoryPath, fileName: parseResult.name, fileType: extensionToFileType (parseResult.ext)
            }
        )

type Dirent
  = { isFile :: Boolean, name :: String }

foreign import readdirWithFileTypesAsEffectFnAff :: String -> AffCompat.EffectFnAff (Array Dirent)

readdirWithFileTypes :: String -> Aff.Aff (Array Dirent)
readdirWithFileTypes path = AffCompat.fromEffectFnAff (readdirWithFileTypesAsEffectFnAff path)
