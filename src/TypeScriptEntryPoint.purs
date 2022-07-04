module TypeScriptEntryPoint
  ( colorFrom
  , english
  , englishId
  , esperanto
  , esperantoId
  , japanese
  , japaneseId
  , just
  , languageToIdString
  , nothing
  , pathAndSearchParamsFromPath
  , structuredUrlFromOriginAndPathAndSearchParams
  ) where

-- PureScript で書かれたコードを呼び出すためのモジュール. 
-- node package に公開するための関数はすべてここで公開する
-- bundle-module するためにこのモジュール以外から import してはいけない
import Color as Color
import Data.Function.Uncurried as FnUncurried
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import MediaType as MediaType
import StructuredUrl as StructuredUrl

-- | 色の作成
colorFrom :: { r :: Int, g :: Int, b :: Int, a :: Number } -> Color.Color
colorFrom { r, g, b, a } = Color.rgba r g b a

japanese :: Language.Language
japanese = Language.Japanese

english :: Language.Language
english = Language.English

esperanto :: Language.Language
esperanto = Language.Esperanto

just :: forall a. a -> Maybe a
just = Maybe.Just

nothing :: forall a b. b -> Maybe a
nothing _ = Maybe.Nothing

pathAndSearchParamsFromPath :: Array NonEmptyString -> StructuredUrl.PathAndSearchParams
pathAndSearchParamsFromPath = StructuredUrl.fromPath

structuredUrlFromOriginAndPathAndSearchParams ::
  FnUncurried.Fn2
    NonEmptyString
    StructuredUrl.PathAndSearchParams
    StructuredUrl.StructuredUrl
structuredUrlFromOriginAndPathAndSearchParams =
  FnUncurried.mkFn2
    ( \origin pathAndSearchParams ->
        StructuredUrl.StructuredUrl
          { origin, pathAndSearchParams }
    )

languageToIdString :: Language.Language -> String
languageToIdString = case _ of
  Language.English -> englishId
  Language.Japanese -> japaneseId
  Language.Esperanto -> esperantoId

englishId ∷ String
englishId = "en"

japaneseId ∷ String
japaneseId = "ja"

esperantoId ∷ String
esperantoId = "eo"
