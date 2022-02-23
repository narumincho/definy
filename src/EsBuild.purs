module EsBuild
  ( Option
  , buildJs
  , buildTs
  , buildTsx
  ) where

import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Prelude as Prelude

type Option
  = { entryPoint :: Path.FilePath
    , outFile :: Path.DistributionFilePath
    , sourcemap :: Boolean
    , external :: Array NonEmptyString
    }

type OptionRaw
  = { entryPoint :: String
    , sourcemap :: Boolean
    , target :: Array String
    , external :: Array String
    , outFile :: String
    }

foreign import buildAsEffectFnAff ::
  OptionRaw ->
  AffCompat.EffectFnAff Prelude.Unit

buildJs :: Option -> Aff.Aff Prelude.Unit
buildJs option = build FileType.JavaScript option

buildTs :: Option -> Aff.Aff Prelude.Unit
buildTs option = build FileType.TypeScript option

buildTsx :: Option -> Aff.Aff Prelude.Unit
buildTsx option = build FileType.TypeScriptReact option

build :: FileType.FileType -> Option -> Aff.Aff Prelude.Unit
build fileType option =
  AffCompat.fromEffectFnAff
    ( buildAsEffectFnAff
        { entryPoint:
            NonEmptyString.toString
              (Path.filePathToString option.entryPoint (Maybe.Just fileType))
        , outFile:
            NonEmptyString.toString
              (Path.distributionFilePathToString option.outFile (Just FileType.JavaScript))
        , sourcemap: option.sourcemap
        , target: [ "chrome98", "firefox97", "safari15" ]
        , external: Prelude.map NonEmptyString.toString option.external
        }
    )
