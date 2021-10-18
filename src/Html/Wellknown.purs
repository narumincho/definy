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
  ) where

import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

meta :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlElement
meta attributes = Data.htmlElement (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "meta")) attributes Data.NoEndTag

html :: Maybe.Maybe String -> Data.HtmlElement -> Data.HtmlElement -> Data.HtmlElement
html langMaybe headElement bodyElement =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "html"))
    ( case langMaybe of
        Maybe.Just lang ->
          Map.singleton
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "lang"))
            (Maybe.Just lang)
        Maybe.Nothing -> Map.empty
    )
    (Data.ElementList [ headElement, bodyElement ])

body :: Maybe.Maybe NonEmptyString.NonEmptyString -> Data.HtmlChildren -> Data.HtmlElement
body classMaybe children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "body"))
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

noscript :: Data.HtmlChildren -> Data.HtmlElement
noscript children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "noscript"))
    Map.empty
    children

head :: Data.HtmlChildren -> Data.HtmlElement
head children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "head"))
    Map.empty
    children

link :: String -> String -> Data.HtmlElement
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

style :: String -> Data.HtmlElement
style cssCode =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "style"))
    Map.empty
    (Data.RawText cssCode)

script :: StructuredUrl.StructuredUrl -> Data.HtmlElement
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

title :: NonEmptyString.NonEmptyString -> Data.HtmlElement
title pageName =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "title"))
    Map.empty
    (Data.Text (NonEmptyString.toString pageName))

div :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.HtmlElement
div attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "div"))
    attributes
    children

a :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.HtmlElement
a attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "a"))
    attributes
    children

h1 :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.HtmlElement
h1 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h1"))
    attributes
    children

h2 :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.HtmlElement
h2 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h2"))
    attributes
    children

svg :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlChildren -> Data.HtmlElement
svg attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "svg"))
    attributes
    children

img :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlElement
img attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "img"))
    attributes
    Data.NoEndTag

svgPath :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.HtmlElement
svgPath attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "path"))
    attributes
    (Data.ElementList [])

svgG :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Array Data.HtmlElement -> Data.HtmlElement
svgG attributes elementList =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "g"))
    attributes
    (Data.ElementList elementList)
