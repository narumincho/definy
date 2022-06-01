module EsBuild (buildJs, buildTsx, Option) where

import Prelude
import Binary as Binary
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty as NonEmptyString
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Prelude as Prelude

type Option
  = { entryPoints :: Path.FilePath
    , target :: Set.Set NonEmptyString.NonEmptyString
    , external :: Set.Set NonEmptyString.NonEmptyString
    }

type OptionRaw
  = { entryPoints :: String
    , target :: Array String
    , external :: Array String
    }

foreign import buildAsEffectFnAff ::
  OptionRaw ->
  AffCompat.EffectFnAff Binary.Binary

buildJs :: Option -> Aff.Aff String
buildJs option = build FileType.JavaScript option

buildTsx :: Option -> Aff.Aff String
buildTsx option = build FileType.TypeScriptReact option

build :: FileType.FileType -> Option -> Aff.Aff String
build fileType option =
  Prelude.bind
    ( AffCompat.fromEffectFnAff
        ( buildAsEffectFnAff
            { entryPoints:
                NonEmptyString.toString
                  (Path.filePathToString option.entryPoints (Maybe.Just fileType))
            , target: Prelude.map NonEmptyString.toString (Set.toUnfoldable option.target)
            , external: Prelude.map NonEmptyString.toString (Set.toUnfoldable option.external)
            }
        )
    )
    ( \codeBinary -> case Binary.toStringReadAsUtf8 codeBinary of
        Just code -> pure code
        Nothing -> Aff.throwError (Aff.error "esbuild result error. invalid utf8 binary")
    )
