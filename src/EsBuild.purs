module EsBuild (buildJs, Option) where

import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.Path as Path
import FileType as FileType
import Prelude as Prelude

type Option
  = { entryPoints :: Path.DistributionFilePath
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
buildJs option =
  AffCompat.fromEffectFnAff
    ( buildAsEffectFnAff
        { entryPoints:
            NonEmptyString.toString
              (Path.distributionFilePathToString option.entryPoints FileType.JavaScript)
        , outdir: NonEmptyString.toString (Path.distributionDirectoryPathToString option.outdir)
        , sourcemap: option.sourcemap
        , target: option.target
        }
    )
