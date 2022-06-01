module EsBuild (buildJs, buildTsx, Option) where

import Prelude
import Binary as Binary
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect.Aff as Aff
import Effect.Aff.Compat as AffCompat
import FileSystem.FileType as FileType
import FileSystem.Path as Path
import Foreign.Object as Object
import Prelude as Prelude

type Option
  = { entryPoints :: Path.FilePath
    , target :: Set.Set NonEmptyString
    , external :: Set.Set NonEmptyString
    , define :: Map.Map NonEmptyString NonEmptyString
    }

type OptionRaw
  = { entryPoints :: String
    , target :: Array String
    , external :: Array String
    , define :: Object.Object String
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
            , external:
                Prelude.map
                  NonEmptyString.toString
                  (Set.toUnfoldable option.external)
            , define:
                Object.fromFoldable
                  ( Prelude.map
                      ( \(Tuple.Tuple k v) ->
                          Tuple.Tuple (NonEmptyString.toString k) (NonEmptyString.toString v)
                      )
                      ( (Map.toUnfoldable option.define) ::
                          Array
                            ( Tuple.Tuple
                                NonEmptyString
                                NonEmptyString
                            )
                      )
                  )
            }
        )
    )
    ( \codeBinary -> case Binary.toStringReadAsUtf8 codeBinary of
        Just code -> pure code
        Nothing -> Aff.throwError (Aff.error "esbuild result error. invalid utf8 binary")
    )
