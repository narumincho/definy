module FileSystem.Copy
  ( copyFileToDistributionWithoutExtension
  , copyFileToDistribution
  , copySecretFile
  ) where

import Prelude
import Console as Console
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Write as Write

-- | ファイルをコピーする.
-- | コピー先ファイル名は拡張子なしになる
copyFileToDistributionWithoutExtension :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Path.DistributionFilePath -> Aff.Aff Unit
copyFileToDistributionWithoutExtension filePath fileTypeMaybe distributionFilePath@(Path.DistributionFilePath { directoryPath }) = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe)
    , dist: NonEmptyString.toString (Path.distributionFilePathToStringWithoutExtensiton distributionFilePath)
    }

-- | ファイルをコピーする
copyFileToDistribution :: Path.FilePath -> Maybe.Maybe FileType.FileType -> Path.DistributionFilePath -> FileType.FileType -> Aff.Aff Unit
copyFileToDistribution filePath fileTypeMaybe distributionFilePath@(Path.DistributionFilePath { directoryPath }) fileType = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath fileTypeMaybe)
    , dist: NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath fileType)
    }

-- | 1つ上の階層の secret ディレクトリないに保存された機密情報の入ったファイルを出力先にコピーする
copySecretFile ::
  NonEmptyString ->
  Path.DistributionFilePath -> FileType.FileType -> Aff.Aff Unit
copySecretFile secretFileName distributionFilePath@(Path.DistributionFilePath { directoryPath }) fileType = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: append "../secret/" (NonEmptyString.toString secretFileName)
    , dist: NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath fileType)
    }

copyFile :: { src :: String, dist :: String } -> Aff.Aff Unit
copyFile option = do
  AffCompat.fromEffectFnAff (copyFileAsEffectFnAff option)
  Console.logValueAsAff "ファイルのコピーに成功!" option

foreign import copyFileAsEffectFnAff :: { src :: String, dist :: String } -> AffCompat.EffectFnAff Unit
