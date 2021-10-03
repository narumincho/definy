module Html.Data
  ( HtmlOption(..)
  , HtmlChildren(..)
  , HtmlElement(..)
  , TwitterCard(..)
  , meta
  , html
  , body
  , noscript
  , head
  , link
  , style
  , script
  , title
  , div
  ) where

import Color as Color
import Data.Map as Map
import Data.Maybe as Maybe
import Language as Language
import StructuredUrl as StructuredUrl
import Data.Tuple as Tuple

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

meta :: Map.Map String (Maybe.Maybe String) -> HtmlElement
meta attributes = htmlElement "meta" attributes NoEndTag

html :: Maybe.Maybe String -> HtmlElement -> HtmlElement -> HtmlElement
html langMaybe headElement bodyElement =
  htmlElement "html"
    ( case langMaybe of
        Maybe.Just lang -> Map.singleton "lang" (Maybe.Just lang)
        Maybe.Nothing -> Map.empty
    )
    (ElementList [ headElement, bodyElement ])

body :: Maybe.Maybe String -> HtmlChildren -> HtmlElement
body classMaybe children =
  htmlElement "body"
    ( case classMaybe of
        Maybe.Just className -> Map.singleton "class" (Maybe.Just className)
        Maybe.Nothing -> Map.empty
    )
    children

noscript :: HtmlChildren -> HtmlElement
noscript children =
  htmlElement
    "noscript"
    Map.empty
    children

head :: HtmlChildren -> HtmlElement
head children =
  htmlElement
    "head"
    Map.empty
    children

link :: String -> String -> HtmlElement
link rel href =
  htmlElement
    "link"
    ( Map.fromFoldable
        [ Tuple.Tuple "rel" (Maybe.Just rel)
        , Tuple.Tuple "href" (Maybe.Just href)
        ]
    )
    NoEndTag

style :: String -> HtmlElement
style cssCode = htmlElement "style" Map.empty (RawText cssCode)

script :: StructuredUrl.StructuredUrl -> HtmlElement
script url =
  htmlElement
    "script"
    ( Map.fromFoldable
        [ Tuple.Tuple "defer" Maybe.Nothing
        , Tuple.Tuple "src" (Maybe.Just (StructuredUrl.toString url))
        ]
    )
    (ElementList [])

title :: String -> HtmlElement
title pageName = htmlElement "title" Map.empty (Text pageName)

div :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
div attributes children = htmlElement "div" attributes children
