module TypeScript.Tsc (compile) where

import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.Path as Path
import Prelude as Prelude

-- | TypeScript 標準の コンパイラである tsc を呼ぶ
compile :: { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Prelude.Unit
compile { rootName, outDir } =
  AffCompat.fromEffectFnAff
    ( compileAsEffectFnAff
        { rootName: NonEmptyString.toString (Path.filePathToString rootName)
        , outDir: NonEmptyString.toString (Path.distributionDirectoryPathToString outDir)
        }
    )

foreign import compileAsEffectFnAff :: { rootName :: String, outDir :: String } -> AffCompat.EffectFnAff Prelude.Unit
