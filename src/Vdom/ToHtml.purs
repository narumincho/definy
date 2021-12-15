module Vdom.ToHtml (toHtml) where

import Color as Color
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Html
import Html.Wellknown as Wellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Vdom.Data as Data

toHtml ::
  forall message location.
  { vdom :: Data.Vdom message location
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Html.RawHtmlElement
toHtml { vdom: vdom@(Data.Vdom rec), locationToPathAndSearchParams } =
  Wellknown.html
    rec.language
    (headElement vdom)
    ( Wellknown.body
        rec.bodyClass
        ( Html.ElementList
            ( Array.cons
                (noScriptElement rec.appName)
                ( Prelude.map
                    ( \(Tuple.Tuple _ element) ->
                        vdomElementToHtmlElement
                          { origin: rec.origin
                          , element
                          , locationToPathAndSearchParams
                          }
                    )
                    rec.children
                )
            )
        )
    )

headElement :: forall message location. Data.Vdom message location -> Html.RawHtmlElement
headElement (Data.Vdom option) =
  Wellknown.head
    ( Html.ElementList
        ( Array.concat
            [ [ charsetElement
              , viewportElement
              , Wellknown.title option.pageName
              , descriptionElement option.description
              , themeColorElement option.themeColor
              ]
            , iconElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.iconPath })
            , [ twitterCardElement, Wellknown.style option.style ]
            , case option.path of
                Maybe.Just path -> [ ogUrlElement (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: path }) ]
                Maybe.Nothing -> []
            , [ ogTitleElement option.pageName
              , ogSiteName option.appName
              , ogDescription option.description
              , ogImage (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: option.coverImagePath })
              ]
            , case option.scriptPath of
                Maybe.Just scriptPath -> [ Wellknown.script (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: scriptPath }) ]
                Maybe.Nothing -> []
            ]
        )
    )

charsetElement :: Html.RawHtmlElement
charsetElement =
  Wellknown.meta
    (Map.singleton (NonEmptyString.nes (Proxy :: Proxy "charset")) (Maybe.Just "utf-8"))

viewportElement :: Html.RawHtmlElement
viewportElement =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "name"))
            (Maybe.Just "viewport")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "content"))
            ( Maybe.Just
                "width=device-width,initial-scale=1.0"
            )
        ]
    )

descriptionElement :: String -> Html.RawHtmlElement
descriptionElement description =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "name"))
            (Maybe.Just "description")
        , contentAttribute description
        ]
    )

themeColorElement :: Color.Color -> Html.RawHtmlElement
themeColorElement themeColor =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "name"))
            (Maybe.Just "theme-color")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "content"))
            (Maybe.Just (Color.toHexString themeColor))
        ]
    )

iconElement :: StructuredUrl.StructuredUrl -> Array Html.RawHtmlElement
iconElement iconUrl =
  let
    href :: String
    href = NonEmptyString.toString (StructuredUrl.toString iconUrl)
  in
    [ Wellknown.link "icon" href
    , Wellknown.link "apple-touch-icon" href
    ]

twitterCardElement :: Html.RawHtmlElement
twitterCardElement =
  Wellknown.meta
    ( Map.fromFoldable
        ( [ Tuple.Tuple
              (NonEmptyString.nes (Proxy :: Proxy "name"))
              (Maybe.Just "twitter:card")
          , Tuple.Tuple
              (NonEmptyString.nes (Proxy :: Proxy "content"))
              (Maybe.Just "summary_large_image")
          ]
        )
    )

propertyAttribute :: String -> Tuple.Tuple NonEmptyString.NonEmptyString (Maybe.Maybe String)
propertyAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy :: Proxy "property"))
    (Maybe.Just value)

contentAttribute :: String -> Tuple.Tuple NonEmptyString.NonEmptyString (Maybe.Maybe String)
contentAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy :: Proxy "content"))
    (Maybe.Just value)

ogUrlElement :: StructuredUrl.StructuredUrl -> Html.RawHtmlElement
ogUrlElement url =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:url"
        , contentAttribute (NonEmptyString.toString (StructuredUrl.toString url))
        ]
    )

ogTitleElement :: NonEmptyString.NonEmptyString -> Html.RawHtmlElement
ogTitleElement title =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:title"
        , contentAttribute (NonEmptyString.toString title)
        ]
    )

ogSiteName :: NonEmptyString.NonEmptyString -> Html.RawHtmlElement
ogSiteName siteName =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:site_name"
        , contentAttribute (NonEmptyString.toString siteName)
        ]
    )

ogDescription :: String -> Html.RawHtmlElement
ogDescription description =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:description"
        , contentAttribute description
        ]
    )

ogImage :: StructuredUrl.StructuredUrl -> Html.RawHtmlElement
ogImage url =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:image"
        , contentAttribute (NonEmptyString.toString (StructuredUrl.toString url))
        ]
    )

noScriptElement :: NonEmptyString.NonEmptyString -> Html.RawHtmlElement
noScriptElement appName =
  Wellknown.noscript
    ( Html.Text
        ( Prelude.append
            (NonEmptyString.toString appName)
            " では JavaScript を使用します. ブラウザの設定で有効にしてください."
        )
    )

vdomElementToHtmlElement ::
  forall message location.
  { origin :: NonEmptyString
  , element :: Data.Element message location
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Html.RawHtmlElement
vdomElementToHtmlElement { origin, element, locationToPathAndSearchParams } = case element of
  Data.ElementDiv (Data.Div rec) ->
    Wellknown.div
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementH1 (Data.H1 rec) ->
    Wellknown.h1
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementH2 (Data.H2 rec) ->
    Wellknown.h2
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementCode (Data.Code rec) ->
    Wellknown.code
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementExternalLink (Data.ExternalLink rec) ->
    Wellknown.a
      { id: rec.id, class: rec.class, href: rec.href }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementSameOriginLink (Data.SameOriginLink rec) ->
    Wellknown.a
      { id: rec.id
      , class: rec.class
      , href:
          StructuredUrl.StructuredUrl
            { origin
            , pathAndSearchParams: locationToPathAndSearchParams rec.href
            }
      }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementButton (Data.Button rec) ->
    Wellknown.button
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementImg (Data.Img rec) ->
    Wellknown.img
      { id: rec.id, class: rec.class, alt: rec.alt, src: rec.src }
  Data.ElementInputRadio (Data.InputRadio rec) ->
    Wellknown.inputRadio
      { id: rec.id, class: rec.class, name: rec.name }
  Data.ElementInputText (Data.InputText rec) ->
    Wellknown.inputText
      { id: rec.id
      , class: rec.class
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementTextArea (Data.TextArea rec) ->
    Wellknown.textarea
      { id: rec.id
      , class: rec.class
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementLabel (Data.Label rec) ->
    Wellknown.label
      { id: rec.id
      , class: rec.class
      , for: rec.for
      }
      ( vdomChildrenToHtmlChildren
          { origin, children: rec.children, locationToPathAndSearchParams }
      )
  Data.ElementSvg (Data.Svg rec) ->
    Wellknown.svg
      { id: rec.id
      , class: rec.class
      , viewBoxX: rec.viewBoxX
      , viewBoxY: rec.viewBoxY
      , viewBoxWidth: rec.viewBoxWidth
      , viewBoxHeight: rec.viewBoxHeight
      }
      ( vdomChildListToHtmlChildList
          { origin, childList: rec.children, locationToPathAndSearchParams }
      )
  Data.ElementSvgPath (Data.SvgPath rec) -> Wellknown.svgPath rec
  Data.ElementSvgCircle (Data.SvgCircle rec) ->
    Wellknown.svgCircle
      { id: rec.id
      , class: rec.class
      , fill: rec.fill
      , stroke: rec.stroke
      , cx: rec.cx
      , cy: rec.cy
      , r: rec.r
      }
      ( vdomChildListToHtmlChildList
          { origin, childList: rec.children, locationToPathAndSearchParams }
      )
  Data.ElementSvgAnimate (Data.SvgAnimate rec) ->
    Wellknown.svgAnimate
      rec
  Data.ElementSvgG (Data.SvgG rec) ->
    Wellknown.svgG
      { transform: rec.transform }
      ( vdomChildListToHtmlChildList
          { origin, childList: rec.children, locationToPathAndSearchParams }
      )

vdomChildrenToHtmlChildren ::
  forall message location.
  { origin :: NonEmptyString
  , children :: Data.Children message location
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Html.HtmlChildren
vdomChildrenToHtmlChildren { origin, children, locationToPathAndSearchParams } = case children of
  Data.ChildrenElementList list ->
    Html.ElementList
      ( vdomChildListToHtmlChildList
          { origin
          , childList: NonEmptyArray.toArray list
          , locationToPathAndSearchParams
          }
      )
  Data.ChildrenText text -> Html.Text text

vdomChildListToHtmlChildList ::
  forall message location.
  { origin :: NonEmptyString
  , childList :: Array (Tuple.Tuple String (Data.Element message location))
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Array Html.RawHtmlElement
vdomChildListToHtmlChildList { origin, childList, locationToPathAndSearchParams } =
  Prelude.map
    ( \(Tuple.Tuple _ element) ->
        vdomElementToHtmlElement { origin, element, locationToPathAndSearchParams }
    )
    childList
