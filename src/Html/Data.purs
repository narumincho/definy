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
  , a
  , h1
  , h2
  , svg
  , img
  , svgPath
  , svgG
  ) where

import Color as Color
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
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
  , {- スタイルのパス -} stylePath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- スクリプトのパス -} scriptPath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: Maybe.Maybe NonEmptyString.NonEmptyString
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

body :: Maybe.Maybe NonEmptyString.NonEmptyString -> HtmlChildren -> HtmlElement
body classMaybe children =
  htmlElement "body"
    ( case classMaybe of
        Maybe.Just className ->
          Map.singleton "class"
            ( Maybe.Just
                (NonEmptyString.toString className)
            )
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
        , Tuple.Tuple "src" (Maybe.Just (NonEmptyString.toString (StructuredUrl.toString url)))
        ]
    )
    (ElementList [])

title :: NonEmptyString.NonEmptyString -> HtmlElement
title pageName = htmlElement "title" Map.empty (Text (NonEmptyString.toString pageName))

div :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
div attributes children = htmlElement "div" attributes children

a :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
a attributes children = htmlElement "a" attributes children

h1 :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
h1 attributes children = htmlElement "h1" attributes children

h2 :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
h2 attributes children = htmlElement "h2" attributes children

svg :: Map.Map String (Maybe.Maybe String) -> HtmlChildren -> HtmlElement
svg attributes children = htmlElement "svg" attributes children

img :: Map.Map String (Maybe.Maybe String) -> HtmlElement
img attributes = htmlElement "img" attributes NoEndTag

svgPath :: Map.Map String (Maybe.Maybe String) -> HtmlElement
svgPath attributes = htmlElement "path" attributes (ElementList [])

svgG :: Map.Map String (Maybe.Maybe String) -> Array HtmlElement -> HtmlElement
svgG attributes elementList = htmlElement "g" attributes (ElementList elementList)
