module StructuredUrl
  ( PathAndSearchParams(..)
  , StructuredUrl(..)
  , toString
  , pathAndSearchParams
  , pathAndSearchParamsToString
  , fromPath
  ) where

import Data.Map as Map
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude

-- | URL の Path と searchParams
newtype PathAndSearchParams
  = PathAndSearchParams
  { {-
  パス.
  クエリパラメーターとの違いは, SSG 時にファイルとして残せるレベルの単位 であるということ
  使える文字は, 正規表現 `[a-zA-Z0-9_-]` を満たすものに限ってほしいが, チェックはしない
   -} path :: Array NonEmptyString.NonEmptyString
  , {-
  クエリパラメーター.
  検索条件等を入れる.
  キーにも値にも文字の制限はない. JavaScript の URLSearchParams で 変換される.
   -} searchParams :: Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString
  }

derive instance pathAndSearchParamsEq :: Prelude.Eq PathAndSearchParams

pathAndSearchParams :: Array NonEmptyString.NonEmptyString -> Map.Map NonEmptyString.NonEmptyString NonEmptyString.NonEmptyString -> PathAndSearchParams
pathAndSearchParams path searchParams = PathAndSearchParams { path, searchParams }

fromPath :: Array NonEmptyString.NonEmptyString -> PathAndSearchParams
fromPath path = PathAndSearchParams { path, searchParams: Map.empty }

-- | 構造化されたURL
newtype StructuredUrl
  = StructuredUrl
  { origin :: NonEmptyString.NonEmptyString
  , pathAndSearchParams :: PathAndSearchParams
  }

derive instance structuredUrlEq :: Prelude.Eq StructuredUrl

toString :: StructuredUrl -> NonEmptyString.NonEmptyString
toString (StructuredUrl { origin, pathAndSearchParams: path }) =
  Prelude.append
    origin
    (pathAndSearchParamsToString path)

pathAndSearchParamsToString :: PathAndSearchParams -> NonEmptyString.NonEmptyString
pathAndSearchParamsToString (PathAndSearchParams { path }) =
  NonEmptyString.appendString
    (NonEmptyString.singleton (String.codePointFromChar '/'))
    (NonEmptyString.joinWith "/" path)
