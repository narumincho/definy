module Html.Wellknown
  ( meta
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
  , htmlTagName
  , bodyTagName
  ) where

import Css as Css
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

meta :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.RawHtmlElement
meta attributes = Data.htmlElement (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "meta")) attributes Data.NoEndTag

html :: Maybe.Maybe String -> Data.RawHtmlElement -> Data.RawHtmlElement -> Data.RawHtmlElement
html langMaybe headElement bodyElement =
  Data.htmlElement
    htmlTagName
    ( case langMaybe of
        Maybe.Just lang ->
          Map.singleton
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "lang"))
            (Maybe.Just lang)
        Maybe.Nothing -> Map.empty
    )
    (Data.ElementList [ headElement, bodyElement ])

htmlTagName :: NonEmptyString.NonEmptyString
htmlTagName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html")

body :: Maybe.Maybe NonEmptyString.NonEmptyString -> Data.HtmlChildren -> Data.RawHtmlElement
body classMaybe children =
  Data.htmlElement
    bodyTagName
    ( case classMaybe of
        Maybe.Just className ->
          Map.singleton
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "class"))
            ( Maybe.Just
                (NonEmptyString.toString className)
            )
        Maybe.Nothing -> Map.empty
    )
    children

bodyTagName :: NonEmptyString.NonEmptyString
bodyTagName = NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "body")

noscript :: Data.HtmlChildren -> Data.RawHtmlElement
noscript children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "noscript"))
    Map.empty
    children

head :: Data.HtmlChildren -> Data.RawHtmlElement
head children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "head"))
    Map.empty
    children

link :: String -> String -> Data.RawHtmlElement
link rel href =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "link"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "rel"))
            (Maybe.Just rel)
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "href"))
            (Maybe.Just href)
        ]
    )
    Data.NoEndTag

style :: Css.StatementList -> Data.RawHtmlElement
style cssStatementList =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "style"))
    Map.empty
    (Data.RawText (Css.ruleListToString cssStatementList))

script :: StructuredUrl.StructuredUrl -> Data.RawHtmlElement
script url =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "script"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "defer"))
            Maybe.Nothing
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "src"))
            (Maybe.Just (NonEmptyString.toString (StructuredUrl.toString url)))
        ]
    )
    (Data.ElementList [])

title :: NonEmptyString.NonEmptyString -> Data.RawHtmlElement
title pageName =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "title"))
    Map.empty
    (Data.Text (NonEmptyString.toString pageName))

div :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.RawHtmlElement
div attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "div"))
    attributes
    children

a :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.RawHtmlElement
a attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "a"))
    attributes
    children

h1 :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.RawHtmlElement
h1 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h1"))
    attributes
    children

h2 :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.RawHtmlElement
h2 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h2"))
    attributes
    children

svg :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.RawHtmlElement
svg attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "svg"))
    attributes
    children

img :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.RawHtmlElement
img attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "img"))
    attributes
    Data.NoEndTag

svgPath :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.RawHtmlElement
svgPath attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "path"))
    attributes
    (Data.ElementList [])

svgG :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Array Data.RawHtmlElement -> Data.RawHtmlElement
svgG attributes elementList =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "g"))
    attributes
    (Data.ElementList elementList)
