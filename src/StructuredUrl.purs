module StructuredUrl
  ( PathAndSearchParams(..)
  , StructuredUrl(..)
  , toString
  , pathAndSearchParams
  , pathAndSearchParamsToString
  ) where

import Data.Map as Map
import Data.String as String
import Prelude as Prelude

-- | URL の Path と searchParams
newtype PathAndSearchParams
  = PathAndSearchParams
  { {-
  パス.
  クエリパラメーターとの違いは, SSG 時にファイルとして残せるレベルの単位 であるということ
  使える文字は, 正規表現 `[a-zA-Z0-9_-]` を満たすものに限ってほしいが, チェックはしない
   -} path :: Array String
  , {-
  クエリパラメーター.
  検索条件等を入れる.
  キーにも値にも文字の制限はない. JavaScript の URLSearchParams で 変換される.
   -} searchParams :: Map.Map String String
  }

pathAndSearchParams :: Array String -> Map.Map String String -> PathAndSearchParams
pathAndSearchParams path searchParams = PathAndSearchParams { path, searchParams }

-- | 構造化されたURL
newtype StructuredUrl
  = StructuredUrl { origin :: String, pathAndSearchParams :: PathAndSearchParams }

toString :: StructuredUrl -> String
toString (StructuredUrl { origin, pathAndSearchParams: path }) = String.joinWith "" [ origin, pathAndSearchParamsToString path ]

pathAndSearchParamsToString :: PathAndSearchParams -> String
pathAndSearchParamsToString (PathAndSearchParams { path }) = Prelude.append "/" (String.joinWith "/" path)
