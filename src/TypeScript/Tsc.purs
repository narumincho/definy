module TypeScript.Tsc (compile, compileTsx, compileTs) where

import Prelude
import Console as Console
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path

-- | TypeScript 標準の コンパイラである tsc を呼ぶ
compileTs :: { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
compileTs option = compile FileType.TypeScript option

-- | TypeScript 標準の コンパイラである tsc を呼ぶ
compileTsx :: { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
compileTsx option = compile FileType.TypeScriptReact option

compile :: FileType.FileType -> { rootName :: Path.FilePath, outDir :: Path.DistributionDirectoryPath } -> Aff.Aff Unit
compile fileType { rootName, outDir } = do
  AffCompat.fromEffectFnAff
    ( compileAsEffectFnAff
        { rootName: NonEmptyString.toString (Path.filePathToString rootName (Maybe.Just fileType))
        , outDir: NonEmptyString.toString (Path.distributionDirectoryPathToString outDir)
        }
    )
  Console.logValueAsAff "tsc に成功!"
    { rootName: Path.filePathToString rootName
    , outDir: Path.distributionDirectoryPathToString outDir
    }

foreign import compileAsEffectFnAff :: { rootName :: String, outDir :: String } -> AffCompat.EffectFnAff Unit
