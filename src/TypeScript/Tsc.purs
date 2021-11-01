module TypeScript.Tsc (compile) where

import Prelude
import Console as Console
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.Path as Path

-- | TypeScript 標準の コンパイラである tsc を呼ぶ
compile :: { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
compile { rootName, outDir } = do
  AffCompat.fromEffectFnAff
    ( compileAsEffectFnAff
        { rootName: NonEmptyString.toString (Path.filePathToString rootName)
        , outDir: NonEmptyString.toString (Path.distributionDirectoryPathToString outDir)
        }
    )
  Console.logValueAsAff "tsc に成功!"
    { rootName: Path.filePathToString rootName
    , outDir: Path.distributionDirectoryPathToString outDir
    }

foreign import compileAsEffectFnAff :: { rootName :: String, outDir :: String } -> AffCompat.EffectFnAff Unit
