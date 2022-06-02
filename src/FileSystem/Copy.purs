module FileSystem.Copy
  ( copyFileToDistribution
  , copyFileToDistributionChangeFileType
  , copyFileToDistributionWithoutExtension
  , copySecretFile
  ) where

import Prelude
import Console as Console
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Write as Write

-- | ファイルをコピーする.
-- | 拡張子を変更するか, 設定削除する
copyFileToDistributionChangeFileType ::
  { src :: { filePath :: Path.FilePath, fileTypeMaybe :: Maybe FileType.FileType }
  , dist :: { filePath :: Path.DistributionFilePath, fileTypeMaybe :: Maybe FileType.FileType }
  } ->
  Aff.Aff Unit
copyFileToDistributionChangeFileType { src, dist } = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath (Path.distributionDirectoryPathGetDirectoryPath dist.filePath))
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString src.filePath src.fileTypeMaybe)
    , dist:
        NonEmptyString.toString
          (Path.distributionFilePathToString dist.filePath dist.fileTypeMaybe)
    }

-- | ファイルをコピーする
copyFileToDistribution ::
  Path.FilePath ->
  Path.DistributionFilePath ->
  Maybe FileType.FileType ->
  Aff.Aff Unit
copyFileToDistribution filePath distributionFilePath@(Path.DistributionFilePath { directoryPath }) fileTypeMaybe = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe)
    , dist:
        NonEmptyString.toString
          (Path.distributionFilePathToString distributionFilePath fileTypeMaybe)
    }

-- | ファイルをコピーする. 出力先のファイル名には拡張子を出力しない
copyFileToDistributionWithoutExtension ::
  Path.FilePath ->
  Maybe FileType.FileType ->
  Path.DistributionFilePath ->
  Aff.Aff Unit
copyFileToDistributionWithoutExtension filePath fileTypeMaybe distributionFilePath@(Path.DistributionFilePath { directoryPath }) = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe)
    , dist:
        NonEmptyString.toString
          (Path.distributionFilePathToString distributionFilePath Nothing)
    }

-- | 1つ上の階層の secret ディレクトリ内に保存された機密情報の入ったファイルを出力先にコピーする
copySecretFile ::
  NonEmptyString ->
  Path.DistributionFilePath -> FileType.FileType -> Aff.Aff Unit
copySecretFile secretFileName distributionFilePath@(Path.DistributionFilePath { directoryPath }) fileType = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: append "../secret/" (NonEmptyString.toString secretFileName)
    , dist:
        NonEmptyString.toString
          (Path.distributionFilePathToString distributionFilePath (Just fileType))
    }

copyFile :: { src :: String, dist :: String } -> Aff.Aff Unit
copyFile option = do
  AffCompat.fromEffectFnAff (copyFileAsEffectFnAff option)
  Console.logValueAsAff "ファイルのコピーに成功!" option

foreign import copyFileAsEffectFnAff :: { src :: String, dist :: String } -> AffCompat.EffectFnAff Unit
