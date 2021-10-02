module Html.Data
  ( htmlElement
  , HtmlOption(..)
  , HtmlChildren(..)
  , HtmlElement(..)
  , TwitterCard(..)
  ) where

import Data.Maybe as Maybe
import StructuredUrl as StructuredUrl
import Language as Language
import Data.Map as Map
import Color as Color

-- | 構造化された Html の指定
newtype HtmlOption
  = HtmlOption
  { {- ページ名 Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される -} pageName :: String
  , {- アプリ名 / サイト名 (HTML出力のみ反映) -} appName :: String
  , {- ページの説明 (HTML出力のみ反映) -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- 使用している言語 -} language :: Maybe.Maybe Language.Language
  , {- OGPに使われるカバー画像のURL (CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: String
  , {- パス. ログイン時のコールバック時には Noting にして良い -} path :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- Twitter Card. Twitterでシェアしたときの表示をどうするか -} twitterCard :: TwitterCard
  , {- 全体に適応されるスタイル. CSS -} style :: Maybe.Maybe String
  , {- スタイルのパス -} stylePath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- スクリプトのパス -} scriptPath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: Maybe.Maybe String
  , {- body の 子要素 -} bodyChildren :: Array HtmlElement
  }

data TwitterCard
  = SummaryCard
  | SummaryCardWithLargeImage

newtype HtmlElement
  = HtmlElement { name :: String, attributes :: Map.Map String (Maybe.Maybe String), children :: HtmlChildren }

data HtmlChildren
  = ElementList (Array HtmlElement)
  | Text String
  | RawText String
  | NoEndTag

htmlElement :: String -> Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
htmlElement name attributes children = HtmlElement { name, attributes, children }
