module EsBuild (buildJs, buildTsx, Option) where

import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Prelude as Prelude

type Option
  = { entryPoints :: Path.FilePath
    , outdir :: Path.DistributionDirectoryPath
    , sourcemap :: Boolean
    , target :: Array String
    }

type OptionRaw
  = { entryPoints :: String
    , outdir :: String
    , sourcemap :: Boolean
    , target :: Array String
    }

foreign import buildAsEffectFnAff ::
  OptionRaw ->
  AffCompat.EffectFnAff Prelude.Unit

buildJs :: Option -> Aff.Aff Prelude.Unit
buildJs option = build FileType.JavaScript option

buildTsx :: Option -> Aff.Aff Prelude.Unit
buildTsx option = build FileType.TypeScriptReact option

build :: FileType.FileType -> Option -> Aff.Aff Prelude.Unit
build fileType option =
  AffCompat.fromEffectFnAff
    ( buildAsEffectFnAff
        { entryPoints:
            NonEmptyString.toString
              (Path.filePathToString option.entryPoints (Maybe.Just fileType))
        , outdir: NonEmptyString.toString (Path.distributionDirectoryPathToString option.outdir)
        , sourcemap: option.sourcemap
        , target: option.target
        }
    )
