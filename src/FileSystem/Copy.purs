module FileSystem.Copy (copyFileToDistribution) where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.Path as Path
import FileSystem.Write as Write

-- | ファイルをコピーする.
-- | コピー先ファイル名は拡張子なしになる
copyFileToDistribution :: Path.FilePath -> Path.DistributionFilePath -> Aff.Aff Unit
copyFileToDistribution filePath distributionFilePath@(Path.DistributionFilePath { directoryPath }) = do
  Write.ensureDir (Path.distributionDirectoryPathToDirectoryPath directoryPath)
  copyFile
    { src: NonEmptyString.toString (Path.filePathToString filePath)
    , dist: NonEmptyString.toString (Path.distributionFilePathToStringWithoutExtensiton distributionFilePath)
    }

copyFile :: { src :: String, dist :: String } -> Aff.Aff Unit
copyFile option = AffCompat.fromEffectFnAff (copyFileAsEffectFnAff option)

foreign import copyFileAsEffectFnAff :: { src :: String, dist :: String } -> AffCompat.EffectFnAff Unit