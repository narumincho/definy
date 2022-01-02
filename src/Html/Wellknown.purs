module Html.Wellknown
  ( a
  , body
  , bodyTagName
  , button
  , code
  , div
  , h1
  , h2
  , head
  , html
  , htmlTagName
  , img
  , inputRadio
  , inputText
  , label
  , link
  , meta
  , noscript
  , script
  , span
  , style
  , svg
  , svgAnimate
  , svgCircle
  , svgEllipse
  , svgG
  , svgPath
  , svgPolygon
  , textarea
  , title
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Data
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Type.Proxy as Proxy

meta :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> Data.RawHtmlElement
meta attributes = Data.htmlElement (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "meta")) attributes Data.NoEndTag

html :: Maybe.Maybe Language.Language -> Data.RawHtmlElement -> Data.RawHtmlElement -> Data.RawHtmlElement
html langMaybe headElement bodyElement =
  Data.htmlElement
    htmlTagName
    ( case langMaybe of
        Maybe.Just lang ->
          Map.singleton
            (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "lang"))
            (Maybe.Just (Language.toIETFLanguageTag lang))
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

div :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
div attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "div"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            ]
        )
    )
    children

span :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
span attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "span"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            ]
        )
    )
    children

h1 :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
h1 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h1"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            ]
        )
    )
    children

h2 :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
h2 attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h2"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            ]
        )
    )
    children

code :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
code attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "h2"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            ]
        )
    )
    children

a ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , href :: StructuredUrl.StructuredUrl
  } ->
  Data.HtmlChildren -> Data.RawHtmlElement
a attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "a"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "href"))
                    ( Maybe.Just
                        ( NonEmptyString.toString
                            (StructuredUrl.toString attributes.href)
                        )
                    )
                )
            ]
        )
    )
    children

-- | https://developer.mozilla.org/ja/docs/Web/HTML/Element/button
-- | ```html
-- | <button type="button"></button>
-- | ````
button :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
button attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "button"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "type"))
                    (Maybe.Just "button")
                )
            ]
        )
    )
    children

img ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , alt :: String
  , src :: StructuredUrl.PathAndSearchParams
  } ->
  Data.RawHtmlElement
img attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "img"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "alt"))
                    (Just attributes.alt)
                )
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "src"))
                    ( Just
                        ( NonEmptyString.toString
                            (StructuredUrl.pathAndSearchParamsToString attributes.src)
                        )
                    )
                )
            ]
        )
    )
    Data.NoEndTag

inputRadio ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , name :: NonEmptyString
  } ->
  Data.RawHtmlElement
inputRadio attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "input"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "type"))
                    (Just "radio")
                )
            , Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "name"))
                    ( Just
                        (NonEmptyString.toString attributes.name)
                    )
                )
            ]
        )
    )
    Data.NoEndTag

inputText ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , value :: String
  , readonly :: Boolean
  } ->
  Data.RawHtmlElement
inputText attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "input"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "type"))
                    (Just "text")
                )
            , Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "value"))
                    (Just attributes.value)
                )
            , if attributes.readonly then
                Just
                  ( Tuple.Tuple
                      (NonEmptyString.nes (Proxy :: Proxy "readonly"))
                      Nothing
                  )
              else
                Nothing
            ]
        )
    )
    Data.NoEndTag

textarea ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , value :: String
  , readonly :: Boolean
  } ->
  Data.RawHtmlElement
textarea attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "textarea"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "value"))
                    (Just attributes.value)
                )
            , if attributes.readonly then
                Just
                  ( Tuple.Tuple
                      (NonEmptyString.nes (Proxy :: Proxy "readonly"))
                      Nothing
                  )
              else
                Nothing
            ]
        )
    )
    Data.NoEndTag

label :: { id :: Maybe NonEmptyString, class :: Maybe NonEmptyString, for :: NonEmptyString } -> Data.HtmlChildren -> Data.RawHtmlElement
label attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "label"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "for"))
                    (Just (NonEmptyString.toString attributes.for))
                )
            ]
        )
    )
    children

svg ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , viewBoxX :: Number
  , viewBoxY :: Number
  , viewBoxWidth :: Number
  , viewBoxHeight :: Number
  } ->
  Array Data.RawHtmlElement -> Data.RawHtmlElement
svg attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "svg"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "viewBox"))
                    ( Just
                        ( String.joinWith " "
                            ( Prelude.map Prelude.show
                                [ attributes.viewBoxX
                                , attributes.viewBoxY
                                , attributes.viewBoxWidth
                                , attributes.viewBoxHeight
                                ]
                            )
                        )
                    )
                )
            ]
        )
    )
    (Data.ElementList children)

svgPath ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , d :: String
  , fill :: Color.Color
  } ->
  Data.RawHtmlElement
svgPath attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "path"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "d"))
                    (Just attributes.d)
                )
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "fill"))
                    (Just (Color.toHexString attributes.fill))
                )
            ]
        )
    )
    (Data.ElementList [])

-- | 子要素はアニメーションのため だったような
svgCircle ::
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , fill :: Color.Color
  , stroke :: Maybe Color.Color
  , cx :: Number
  , cy :: Number
  , r :: Number
  } ->
  Array Data.RawHtmlElement -> Data.RawHtmlElement
svgCircle attributes children =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "circle"))
    ( Map.fromFoldable
        ( Array.catMaybes
            [ Prelude.map idAttribute attributes.id
            , Prelude.map classAttribute attributes.class
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "fill"))
                    (Just (Color.toHexString attributes.fill))
                )
            , Prelude.map
                ( \stroke ->
                    Tuple.Tuple
                      (NonEmptyString.nes (Proxy :: Proxy "stroke"))
                      (Just (Color.toHexString stroke))
                )
                attributes.stroke
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "cx"))
                    (Just (Prelude.show attributes.cx))
                )
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "cy"))
                    (Just (Prelude.show attributes.cy))
                )
            , Just
                ( Tuple.Tuple
                    (NonEmptyString.nes (Proxy :: Proxy "r"))
                    (Just (Prelude.show attributes.r))
                )
            ]
        )
    )
    (Data.ElementList children)

svgAnimate ::
  { attributeName :: NonEmptyString
  , dur :: Number
  , repeatCount :: String
  , from :: String
  , to :: String
  } ->
  Data.RawHtmlElement
svgAnimate attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "path"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "attributeName"))
            (Just (NonEmptyString.toString attributes.attributeName))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "dur"))
            (Just (Prelude.show attributes.dur))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "repeatCount"))
            (Just attributes.repeatCount)
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "from"))
            (Just attributes.from)
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "to"))
            (Just attributes.to)
        ]
    )
    (Data.ElementList [])

svgG :: { transform :: NonEmptyArray NonEmptyString } -> Array Data.RawHtmlElement -> Data.RawHtmlElement
svgG attributes elementList =
  Data.htmlElement
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "g"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "transform"))
            (Just (NonEmptyString.joinWith " " attributes.transform))
        ]
    )
    (Data.ElementList elementList)

svgPolygon ::
  { points :: NonEmptyArray { x :: Number, y :: Number }
  , stroke :: Color.Color
  , fill :: Color.Color
  } ->
  Data.RawHtmlElement
svgPolygon attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "polygon"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "points"))
            ( Just
                ( String.joinWith " "
                    ( NonEmptyArray.toArray
                        ( Prelude.map
                            (\{ x, y } -> String.joinWith "," [ Prelude.show x, Prelude.show y ])
                            attributes.points
                        )
                    )
                )
            )
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "stroke"))
            (Just (Color.toHexString attributes.stroke))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "fill"))
            (Just (Color.toHexString attributes.fill))
        ]
    )
    (Data.ElementList [])

svgEllipse ::
  { cx :: Number
  , cy :: Number
  , rx :: Number
  , ry :: Number
  , fill :: Color.Color
  } ->
  Data.RawHtmlElement
svgEllipse attributes =
  Data.htmlElement
    (NonEmptyString.nes (Proxy :: Proxy "ellipse"))
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "cx"))
            (Just (Prelude.show attributes.cx))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "cy"))
            (Just (Prelude.show attributes.cy))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "rx"))
            (Just (Prelude.show attributes.rx))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "ry"))
            (Just (Prelude.show attributes.ry))
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "fill"))
            (Just (Color.toHexString attributes.fill))
        ]
    )
    (Data.ElementList [])

classAttribute :: NonEmptyString -> Tuple.Tuple NonEmptyString (Maybe.Maybe String)
classAttribute className =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy :: Proxy "class"))
    (Just (NonEmptyString.toString className))

idAttribute :: NonEmptyString -> Tuple.Tuple NonEmptyString (Maybe.Maybe String)
idAttribute id =
  ( Tuple.Tuple
      (NonEmptyString.nes (Proxy :: Proxy "id"))
      (Just (NonEmptyString.toString id))
  )
