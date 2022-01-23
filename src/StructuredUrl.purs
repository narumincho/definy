module StructuredUrl
  ( PathAndSearchParams(..)
  , StructuredUrl(..)
  , nodeHttpUrlToPathAndSearchParams
  , fromPath
  , locationPathAndSearchParamsToPathAndSearchParams
  , pathAndSearchParams
  , pathAndSearchParamsToString
  , toString
  ) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe (Maybe(..))
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

instance pathAndSearchParamsShow :: Prelude.Show PathAndSearchParams where
  show value = NonEmptyString.toString (pathAndSearchParamsToString value)

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

instance structuredUrlShow :: Prelude.Show StructuredUrl where
  show structuredUrl = NonEmptyString.toString (toString structuredUrl)

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

nodeHttpUrlToPathAndSearchParams :: String -> PathAndSearchParams
nodeHttpUrlToPathAndSearchParams nodeHttpUrl =
  let
    parsed = parseNodeHttpUrl nodeHttpUrl
  in
    PathAndSearchParams
      { path: parsePath parsed.path
      , searchParams: keyValueArrayToSearchParams parsed.searchParams
      }

foreign import searchParamsToString :: Array { key :: String, value :: String } -> String

foreign import parseNodeHttpUrl ::
  String ->
  { path :: String
  , searchParams :: Array { key :: String, value :: String }
  }

locationPathAndSearchParamsToPathAndSearchParams :: { path :: String, searchParams :: String } -> PathAndSearchParams
locationPathAndSearchParamsToPathAndSearchParams option =
  pathAndSearchParams
    (parsePath option.path)
    (keyValueArrayToSearchParams (parseSearchParams option.searchParams))

foreign import parseSearchParams ::
  String ->
  Array { key :: String, value :: String }

parsePath :: String -> Array NonEmptyString
parsePath path =
  Array.mapMaybe
    NonEmptyString.fromString
    (String.split (String.Pattern "/") path)

keyValueArrayToSearchParams :: Array { key :: String, value :: String } -> Map.Map NonEmptyString NonEmptyString
keyValueArrayToSearchParams searchParams =
  Map.fromFoldable
    ( Array.mapMaybe
        ( \{ key, value } -> case { keyNonEmptyMaybe: NonEmptyString.fromString key, valueNonEmptyMaybe: NonEmptyString.fromString value } of
            { keyNonEmptyMaybe: Just keyNonEmpty, valueNonEmptyMaybe: Just valueNonEmpty } -> Just (Tuple.Tuple keyNonEmpty valueNonEmpty)
            _ -> Nothing
        )
        searchParams
    )
