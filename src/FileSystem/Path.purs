module FileSystem.Path
  ( DistributionDirectoryPath(..)
  , DistributionFilePath(..)
  , DirectoryPath(..)
  , FilePath(..)
  , filePathGetFileName
  , fileNameWithExtensitonParse
  , fileTypeToExtension
  , filePathGetFileType
  , distributionDirectoryPathToString
  , distributionFilePathToDirectoryPath
  , distributionFilePathToString
  , directoryPathPushDirectoryNameList
  , directoryPathToString
  , filePathToString
  ) where

import Prelude as Prelude
import Data.String.NonEmpty as NonEmptyString
import Data.Array as Array
import Data.Maybe as Maybe
import FileType as FileType
import Data.String as String
import Type.Proxy as Proxy

-- | 基本的な出力先の `distribution` 内の ディレクトリのパス
newtype DistributionDirectoryPath
  = DistributionDirectoryPath
  { appName :: NonEmptyString.NonEmptyString
  , folderNameMaybe :: Maybe.Maybe NonEmptyString.NonEmptyString
  }

-- | 基本的な出力先の `distribution` 内の ファイルパス
newtype DistributionFilePath
  = DistributionFilePath
  { directoryPath :: DistributionDirectoryPath
  , fileName :: NonEmptyString.NonEmptyString
  , fileType :: Maybe.Maybe FileType.FileType
  }

-- | リポジトリのルートをルートとした ディレクトリのパス
newtype DirectoryPath
  = DirectoryPath (Array NonEmptyString.NonEmptyString)

-- | リポジトリのルートをルートとした ファイルパス
newtype FilePath
  = FilePath
  { directoryPath :: DirectoryPath
  , fileName :: NonEmptyString.NonEmptyString
  , fileType :: Maybe.Maybe FileType.FileType
  }

-- | ファイル名を取得する
filePathGetFileName :: FilePath -> NonEmptyString.NonEmptyString
filePathGetFileName (FilePath { fileName }) = fileName

-- | ファイルの種類を取得する
filePathGetFileType :: FilePath -> Maybe.Maybe FileType.FileType
filePathGetFileType (FilePath { fileType }) = fileType

directoryPathToString :: DirectoryPath -> NonEmptyString.NonEmptyString
directoryPathToString (DirectoryPath directoryNameList) =
  if Array.null directoryNameList then
    (NonEmptyString.singleton (String.codePointFromChar '.'))
  else
    NonEmptyString.appendString (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "./"))
      (NonEmptyString.joinWith "/" directoryNameList)

filePathToString :: FilePath -> NonEmptyString.NonEmptyString
filePathToString (FilePath { directoryPath, fileName, fileType: fileTypeMaybe }) =
  Prelude.append
    ( Prelude.append
        (directoryPathToString directoryPath)
        (NonEmptyString.singleton (String.codePointFromChar '/'))
    )
    ( case fileTypeMaybe of
        Maybe.Just fileType -> fileNameWithFileTypeToString fileName fileType
        Maybe.Nothing -> fileName
    )

fileNameWithFileTypeToString :: NonEmptyString.NonEmptyString -> FileType.FileType -> NonEmptyString.NonEmptyString
fileNameWithFileTypeToString fileName fileType =
  Prelude.append
    fileName
    (NonEmptyString.prependString "." (fileTypeToExtension fileType))

filePathToStringWithoutExtensition :: FilePath -> NonEmptyString.NonEmptyString
filePathToStringWithoutExtensition (FilePath { directoryPath, fileName }) =
  Prelude.append
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
          [ [ NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "distribution"), appName ]
          , case folderNameMaybe of
              Maybe.Just folderName -> [ folderName ]
              Maybe.Nothing -> []
          ]
      )
  )

distributionFilePathToDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionFilePathToDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

directoryPathPushDirectoryNameList :: DirectoryPath -> Array NonEmptyString.NonEmptyString -> DirectoryPath
directoryPathPushDirectoryNameList (DirectoryPath directoryPath) list =
  DirectoryPath
    (Prelude.append directoryPath list)

fileNameWithExtensitonParse :: NonEmptyString.NonEmptyString -> Maybe.Maybe { fileName :: NonEmptyString.NonEmptyString, fileType :: Maybe.Maybe FileType.FileType }
fileNameWithExtensitonParse fileNameWithExtensiton = case NonEmptyString.lastIndexOf (String.Pattern ".") fileNameWithExtensiton of
  Maybe.Just index ->
    let
      afterAndBefore = String.splitAt index (NonEmptyString.toString fileNameWithExtensiton)
    in
      Prelude.map
        ( \fileName ->
            { fileName: fileName, fileType: extensionToFileType (String.drop 1 afterAndBefore.after) }
        )
        (NonEmptyString.fromString afterAndBefore.before)
  Maybe.Nothing -> Maybe.Just { fileName: fileNameWithExtensiton, fileType: Maybe.Nothing }

fileTypeToExtension :: FileType.FileType -> NonEmptyString.NonEmptyString
fileTypeToExtension = case _ of
  FileType.Png -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "png")
  FileType.TypeScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "ts")
  FileType.JavaScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "js")
  FileType.Html -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")
  FileType.Json -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "json")
  FileType.PureScript -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "purs")
  FileType.FirebaseSecurityRules -> NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "rules")

extensionToFileType :: String -> Maybe.Maybe FileType.FileType
extensionToFileType = case _ of
  "png" -> Maybe.Just FileType.Png
  "ts" -> Maybe.Just FileType.TypeScript
  "js" -> Maybe.Just FileType.JavaScript
  "html" -> Maybe.Just FileType.Html
  "json" -> Maybe.Just FileType.Json
  "purs" -> Maybe.Just FileType.PureScript
  "rules" -> Maybe.Just FileType.FirebaseSecurityRules
  _ -> Maybe.Nothing
