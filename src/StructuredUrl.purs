module StructuredUrl
  ( PathAndSearchParams(..)
  , StructuredUrl(..)
  , toString
  , pathAndSearchParams
  , pathAndSearchParamsToString
  , fromPath
  , pathAndSearchParamsFromString
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Prelude as Prelude

-- | URL の Path と searchParams
newtype PathAndSearchParams
  = PathAndSearchParams
  { {-
  パス.
  クエリパラメーターとの違いは, SSG 時にファイルとして残せるレベルの単位 であるということ
  使える文字は, 正規表現 `[a-zA-Z0-9_-]` を満たすものに限ってほしいが, チェックはしない
   -} path :: Array NonEmptyString
  , {-
  クエリパラメーター.
  検索条件等を入れる.
  キーにも値にも文字の制限はない. JavaScript の URLSearchParams で 変換される.
   -} searchParams :: Map.Map NonEmptyString NonEmptyString
  }

derive instance pathAndSearchParamsEq :: Prelude.Eq PathAndSearchParams

pathAndSearchParams :: Array NonEmptyString -> Map.Map NonEmptyString NonEmptyString -> PathAndSearchParams
pathAndSearchParams path searchParams = PathAndSearchParams { path, searchParams }

fromPath :: Array NonEmptyString -> PathAndSearchParams
fromPath path = PathAndSearchParams { path, searchParams: Map.empty }

-- | 構造化されたURL
newtype StructuredUrl
  = StructuredUrl
  { origin :: NonEmptyString
  , pathAndSearchParams :: PathAndSearchParams
  }

derive instance structuredUrlEq :: Prelude.Eq StructuredUrl

toString :: StructuredUrl -> NonEmptyString
toString (StructuredUrl { origin, pathAndSearchParams: path }) =
  Prelude.append
    origin
    (pathAndSearchParamsToString path)

pathAndSearchParamsToString :: PathAndSearchParams -> NonEmptyString
pathAndSearchParamsToString (PathAndSearchParams { path, searchParams }) =
  let
    pathAsString :: NonEmptyString
    pathAsString =
      NonEmptyString.appendString
        (NonEmptyString.singleton (String.codePointFromChar '/'))
        (NonEmptyString.joinWith "/" path)

    searchParamsAsString :: String
    searchParamsAsString =
      searchParamsToString
        ( Prelude.map
            ( \(Tuple.Tuple key value) ->
                { key: NonEmptyString.toString key, value: NonEmptyString.toString value }
            )
            (Map.toUnfoldable searchParams)
        )
  in
    NonEmptyString.appendString
      pathAsString
      ( case searchParamsAsString of
          "" -> ""
          _ -> Prelude.append "?" searchParamsAsString
      )

-- | TODO SearchParams を考慮していない
pathAndSearchParamsFromString :: String -> PathAndSearchParams
pathAndSearchParamsFromString str =
  fromPath
    ( Array.mapMaybe
        NonEmptyString.fromString
        (String.split (String.Pattern "/") str)
    )

foreign import searchParamsToString :: Array { key :: String, value :: String } -> String
