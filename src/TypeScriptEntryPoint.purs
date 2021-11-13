module TypeScriptEntryPoint
  ( colorFrom
  , htmlOptionToString
  , japanese
  , english
  , esperanto
  , just
  , nothing
  , pathAndSearchParamsFromPath
  ) where

-- PureScript で書かれたコードを呼び出すためのモジュール. bundle-module するためにこのモジュール以外から import してはいけない
import Color as Color
import Data.Maybe as Maybe
import Data.String.NonEmpty.Internal as NonEmptyString
import Html.Data as HtmlData
import Html.ToString as HtmlToString
import Language as Language
import StructuredUrl as StructuredUrl

-- | 色の作成
colorFrom :: { r :: Int, g :: Int, b :: Int, a :: Number } -> Color.Color
colorFrom { r, g, b, a } = Color.rgba r g b a

htmlOptionToString :: HtmlData.HtmlOption -> String
htmlOptionToString = HtmlToString.htmlOptionToString

japanese :: Language.Language
japanese = Language.Japanese

english :: Language.Language
english = Language.English

esperanto :: Language.Language
esperanto = Language.Esperanto

just :: forall a. a -> Maybe.Maybe a
just = Maybe.Just

nothing :: forall a b. b -> Maybe.Maybe a
nothing _ = Maybe.Nothing

pathAndSearchParamsFromPath :: Array NonEmptyString.NonEmptyString -> StructuredUrl.PathAndSearchParams
pathAndSearchParamsFromPath = StructuredUrl.fromPath
