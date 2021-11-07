module FileSystem.Copy
  ( copyFileToDistributionWithoutExtensiton
  , copyFileToDistribution
  , copySecretFile
  ) where

import Prelude
import Console as Console
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import FileSystem.Write as Write

-- | ファイルをコピーする.
-- | コピー先ファイル名は拡張子なしになる
copyFileToDistributionWithoutExtensiton :: Path.FilePath -> Path.DistributionFilePath -> Aff.Aff Unit
copyFileToDistributionWithoutExtensiton filePath distributionFilePath@(Path.DistributionFilePath { directoryPath }) = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath)
    , dist: NonEmptyString.toString (Path.distributionFilePathToStringWithoutExtensiton distributionFilePath)
    }

-- | ファイルをコピーする
copyFileToDistribution :: Path.FilePath -> Path.DistributionFilePath -> FileType.FileType -> Aff.Aff Unit
copyFileToDistribution filePath distributionFilePath@(Path.DistributionFilePath { directoryPath }) fileType = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath)
    , dist: NonEmptyString.toString (Path.distributionFilePathToString distributionFilePath fileType)
    }

-- | 1つ上の階層の secret ディレクトリないに保存された機密情報の入ったファイルを出力先にコピーする
copySecretFile :: NonEmptyString.NonEmptyString -> Path.DistributionFilePath -> FileType.FileType -> Aff.Aff Unit
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
