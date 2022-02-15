module FileSystem.Path
  ( DirectoryPath(..)
  , DistributionDirectoryPath(..)
  , DistributionFilePath(..)
  , FilePath(..)
  , directoryPathPushDirectoryNameList
  , directoryPathToString
  , distributionDirectoryPathGetDirectoryPath
  , distributionDirectoryPathToDirectoryPath
  , distributionDirectoryPathToString
  , distributionDirectoryPathToStringBaseApp
  , distributionFilePathToDirectoryPath
  , distributionFilePathToFilePath
  , distributionFilePathToString
  , distributionFilePathToStringBaseApp
  , fileNameWithExtensionParse
  , filePathGetDirectoryPath
  , filePathGetFileName
  , filePathToString
  , srcDirectoryPath
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import FileSystem.FileType as FileType
import FileSystem.Name as Name
import Prelude as Prelude
import Type.Proxy (Proxy(..))

-- | 基本的な出力先の `distribution` 内の ディレクトリのパス
newtype DistributionDirectoryPath
  = DistributionDirectoryPath
  { appName :: Name.Name
  , folderNameMaybe :: Maybe Name.Name
  }

-- | 基本的な出力先の `distribution` 内の ファイルパス
newtype DistributionFilePath
  = DistributionFilePath
  { directoryPath :: DistributionDirectoryPath
  , fileName :: Name.Name
  }

distributionDirectoryPathGetDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionDirectoryPathGetDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

-- | リポジトリのルートをルートとした ディレクトリのパス
newtype DirectoryPath
  = DirectoryPath (Array Name.Name)

-- | リポジトリのルートをルートとした ファイルパス
newtype FilePath
  = FilePath
  { directoryPath :: DirectoryPath
  , fileName :: Name.Name
  }

-- | パスのディレクトリを取得する
filePathGetDirectoryPath :: FilePath -> DirectoryPath
filePathGetDirectoryPath (FilePath { directoryPath }) = directoryPath

-- | ファイル名を取得する
filePathGetFileName :: FilePath -> Name.Name
filePathGetFileName (FilePath { fileName }) = fileName

directoryPathToString :: DirectoryPath -> NonEmptyString
directoryPathToString (DirectoryPath directoryNameList) =
  if Array.null directoryNameList then
    (NonEmptyString.singleton (String.codePointFromChar '.'))
  else
    NonEmptyString.appendString (NonEmptyString.nes (Proxy :: _ "./"))
      (NonEmptyString.joinWith "/" (Prelude.map Name.toNonEmptyString directoryNameList))

filePathToString :: FilePath -> Maybe FileType.FileType -> NonEmptyString
filePathToString (FilePath { directoryPath, fileName }) fileTypeMaybe =
  Prelude.append
    ( Prelude.append
        (directoryPathToString directoryPath)
        (NonEmptyString.singleton (String.codePointFromChar '/'))
    )
    ( case fileTypeMaybe of
        Just fileType -> fileNameWithFileTypeToString fileName fileType
        Nothing -> Name.toNonEmptyString fileName
    )

fileNameWithFileTypeToString :: Name.Name -> FileType.FileType -> NonEmptyString
fileNameWithFileTypeToString fileName fileType =
  Prelude.append
    (Name.toNonEmptyString fileName)
    (NonEmptyString.prependString "." (FileType.toExtension fileType))

distributionDirectoryPathToString :: DistributionDirectoryPath -> NonEmptyString
distributionDirectoryPathToString distributionDirectoryPath =
  directoryPathToString
    ( distributionDirectoryPathToDirectoryPath distributionDirectoryPath
    )

distributionFilePathToString :: DistributionFilePath -> Maybe FileType.FileType -> NonEmptyString
distributionFilePathToString distributionFilePath fileTypeMaybe =
  filePathToString
    (distributionFilePathToFilePath distributionFilePath)
    fileTypeMaybe

distributionFilePathToFilePath :: DistributionFilePath -> FilePath
distributionFilePathToFilePath (DistributionFilePath { directoryPath, fileName }) =
  FilePath
    { directoryPath: distributionDirectoryPathToDirectoryPath directoryPath
    , fileName
    }

distributionDirectoryPathToDirectoryPath :: DistributionDirectoryPath -> DirectoryPath
distributionDirectoryPathToDirectoryPath (DistributionDirectoryPath { appName, folderNameMaybe }) =
  ( DirectoryPath
      ( Array.concat
          [ [ Name.fromSymbolProxy (Proxy :: _ "distribution"), appName ]
          , case folderNameMaybe of
              Just folderName -> [ folderName ]
              Nothing -> []
          ]
      )
  )

distributionFilePathToDirectoryPath :: DistributionFilePath -> DistributionDirectoryPath
distributionFilePathToDirectoryPath (DistributionFilePath { directoryPath }) = directoryPath

-- | ディレクトリパスのさらに深いところを指定する
directoryPathPushDirectoryNameList :: DirectoryPath -> Array Name.Name -> DirectoryPath
directoryPathPushDirectoryNameList (DirectoryPath directoryPath) list =
  DirectoryPath
    (Prelude.append directoryPath list)

fileNameWithExtensionParse ::
  String ->
  Maybe { fileName :: Name.Name, fileType :: Maybe FileType.FileType }
fileNameWithExtensionParse fileNameWithExtension = case String.lastIndexOf (String.Pattern ".") fileNameWithExtension of
  Just index ->
    let
      afterAndBefore = String.splitAt index fileNameWithExtension
    in
      case Tuple.Tuple
          (Name.fromString afterAndBefore.before)
          (FileType.fromExtension (String.drop 1 afterAndBefore.after)) of
        Tuple.Tuple (Just fileName) (Just fileType) ->
          Just
            { fileName, fileType: Just fileType }
        Tuple.Tuple _ _ -> Nothing
  Nothing -> case Name.fromString fileNameWithExtension of
    Just fileName ->
      Just
        { fileName: fileName
        , fileType: Nothing
        }
    Nothing -> Nothing

distributionFilePathToStringBaseApp :: DistributionFilePath -> FileType.FileType -> NonEmptyString
distributionFilePathToStringBaseApp (DistributionFilePath { directoryPath, fileName }) fileType =
  Prelude.append
    (distributionDirectoryPathToStringBaseApp directoryPath)
    (fileNameWithFileTypeToString fileName fileType)

distributionDirectoryPathToStringBaseApp :: DistributionDirectoryPath -> NonEmptyString
distributionDirectoryPathToStringBaseApp (DistributionDirectoryPath { folderNameMaybe }) =
  NonEmptyString.appendString (NonEmptyString.nes (Proxy :: _ "./"))
    ( case folderNameMaybe of
        Just folderName ->
          Prelude.append
            (NonEmptyString.toString (Name.toNonEmptyString folderName))
            "/"
        Nothing -> ""
    )

srcDirectoryPath :: DirectoryPath
srcDirectoryPath =
  DirectoryPath
    [ Name.fromSymbolProxy (Proxy :: _ "src") ]
