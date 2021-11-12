module Html.Data
  ( HtmlOption(..)
  , HtmlChildren(..)
  , HtmlElement(..)
  , TwitterCard(..)
  , htmlElement
  ) where

import Color as Color
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import StructuredUrl as StructuredUrl

-- | 構造化された Html の指定
newtype HtmlOption
  = HtmlOption
  { {- 
  ページ名
  Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される 
  -} pageName :: NonEmptyString.NonEmptyString
  , {- アプリ名 / サイト名 (HTML出力のみ反映) -} appName :: NonEmptyString.NonEmptyString
  , {- ページの説明 (HTML出力のみ反映) -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- 使用している言語 -} language :: Maybe.Maybe Language.Language
  , {- OGPに使われるカバー画像のURL (CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- パス. ログイン時のコールバック時には Noting にして良い -} path :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- Twitter Card. Twitterでシェアしたときの表示をどうするか -} twitterCard :: TwitterCard
  , {- 全体に適応されるスタイル. CSS -} style :: Maybe.Maybe String
  , {- スクリプトのパス -} scriptPath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: Maybe.Maybe NonEmptyString.NonEmptyString
  , {- body の 子要素 -} bodyChildren :: Array HtmlElement
  }

data TwitterCard
  = SummaryCard
  | SummaryCardWithLargeImage

newtype HtmlElement
  = HtmlElement
  { name :: NonEmptyString.NonEmptyString
  , attributes :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String)
  , children :: HtmlChildren
  }

data HtmlChildren
  = ElementList (Array HtmlElement)
  | Text String
  | RawText String
  | NoEndTag

htmlElement :: NonEmptyString.NonEmptyString -> Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
htmlElement name attributes children = HtmlElement { name, attributes, children }
