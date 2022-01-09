module Vdom.ToHtml
  ( toHtml
  , vdomElementToHtmlElement
  ) where

import Color as Color
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Html
import Html.Wellknown as Wellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Vdom.VdomPicked as Data

toHtml ::
  forall message location.
  { vdom :: Data.VdomPicked message location
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Html.RawHtmlElement
toHtml { vdom: vdom@(Data.VdomPicked rec), locationToPathAndSearchParams } =
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

headElement :: forall message location. Data.VdomPicked message location -> Html.RawHtmlElement
headElement (Data.VdomPicked option) =
  Wellknown.head
    ( Html.ElementList
        ( Array.concat
            [ [ charsetElement
              , viewportElement
              , Wellknown.title option.pageName
              , descriptionElement option.description
              ]
            , case option.themeColor of
                Just themeColor -> [ themeColorElement themeColor ]
                Nothing -> []
            , iconElement
                ( StructuredUrl.StructuredUrl
                    { origin: option.origin
                    , pathAndSearchParams: option.iconPath
                    }
                )
            , [ twitterCardElement ]
            , case option.path of
                Just path ->
                  [ ogUrlElement
                      ( StructuredUrl.StructuredUrl
                          { origin: option.origin
                          , pathAndSearchParams: path
                          }
                      )
                  ]
                Nothing -> []
            , [ ogTitleElement option.pageName
              , ogSiteName option.appName
              , ogDescription option.description
              , ogImage
                  ( StructuredUrl.StructuredUrl
                      { origin: option.origin
                      , pathAndSearchParams: option.coverImagePath
                      }
                  )
              , Wellknown.style option.style
              ]
            , case option.scriptPath of
                Just scriptPath -> [ Wellknown.script (StructuredUrl.StructuredUrl { origin: option.origin, pathAndSearchParams: scriptPath }) ]
                Nothing -> []
            ]
        )
    )

charsetElement :: Html.RawHtmlElement
charsetElement =
  Wellknown.meta
    (Map.singleton (NonEmptyString.nes (Proxy :: Proxy "charset")) (Just "utf-8"))

viewportElement :: Html.RawHtmlElement
viewportElement =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "name"))
            (Just "viewport")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "content"))
            ( Just
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
            (Just "description")
        , contentAttribute description
        ]
    )

themeColorElement :: Color.Color -> Html.RawHtmlElement
themeColorElement themeColor =
  Wellknown.meta
    ( Map.fromFoldable
        [ Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "name"))
            (Just "theme-color")
        , Tuple.Tuple
            (NonEmptyString.nes (Proxy :: Proxy "content"))
            (Just (Color.toHexString themeColor))
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
              (Just "twitter:card")
          , Tuple.Tuple
              (NonEmptyString.nes (Proxy :: Proxy "content"))
              (Just "summary_large_image")
          ]
        )
    )

propertyAttribute :: String -> Tuple.Tuple NonEmptyString (Maybe.Maybe String)
propertyAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy :: Proxy "property"))
    (Just value)

contentAttribute :: String -> Tuple.Tuple NonEmptyString (Maybe.Maybe String)
contentAttribute value =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy :: Proxy "content"))
    (Just value)

ogUrlElement :: StructuredUrl.StructuredUrl -> Html.RawHtmlElement
ogUrlElement url =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:url"
        , contentAttribute (NonEmptyString.toString (StructuredUrl.toString url))
        ]
    )

ogTitleElement :: NonEmptyString -> Html.RawHtmlElement
ogTitleElement title =
  Wellknown.meta
    ( Map.fromFoldable
        [ propertyAttribute "og:title"
        , contentAttribute (NonEmptyString.toString title)
        ]
    )

ogSiteName :: NonEmptyString -> Html.RawHtmlElement
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

noScriptElement :: NonEmptyString -> Html.RawHtmlElement
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
  , element :: Data.ElementAndClass message location
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Html.RawHtmlElement
vdomElementToHtmlElement { origin, element: Data.ElementAndClass { element, class: className, id }, locationToPathAndSearchParams } = case element of
  Data.ElementDiv (Data.Div rec) ->
    Wellknown.div
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementSpan (Data.Span rec) ->
    Wellknown.span
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementH1 (Data.H1 rec) ->
    Wellknown.h1
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementH2 (Data.H2 rec) ->
    Wellknown.h2
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementCode (Data.Code rec) ->
    Wellknown.code
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementExternalLink (Data.ExternalLink rec) ->
    Wellknown.a
      { id, class: className, href: rec.href }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementSameOriginLink (Data.SameOriginLink rec) ->
    Wellknown.a
      { id
      , class: className
      , href:
          StructuredUrl.StructuredUrl
            { origin
            , pathAndSearchParams: locationToPathAndSearchParams rec.href
            }
      }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementButton (Data.Button rec) ->
    Wellknown.button
      { id, class: className }
      (vdomChildrenToHtmlChildren { origin, children: rec.children, locationToPathAndSearchParams })
  Data.ElementImg (Data.Img rec) ->
    Wellknown.img
      { id, class: className, alt: rec.alt, src: rec.src }
  Data.ElementInputRadio (Data.InputRadio rec) ->
    Wellknown.inputRadio
      { id, class: className, name: rec.name }
  Data.ElementInputText (Data.InputText rec) ->
    Wellknown.inputText
      { id
      , class: className
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementTextArea (Data.TextArea rec) ->
    Wellknown.textarea
      { id
      , class: className
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementLabel (Data.Label rec) ->
    Wellknown.label
      { id
      , class: className
      , for: rec.for
      }
      ( vdomChildrenToHtmlChildren
          { origin, children: rec.children, locationToPathAndSearchParams }
      )
  Data.ElementSvg (Data.Svg { attributes: Data.SvgAttributes attributes, children }) ->
    Wellknown.svg
      { id
      , class: className
      , viewBox: attributes.viewBox
      }
      ( vdomChildListToHtmlChildList
          { origin, childList: children, locationToPathAndSearchParams }
      )
  Data.ElementSvgPath (Data.SvgPath rec) ->
    Wellknown.svgPath
      { id
      , class: className
      , d: rec.d
      , fill: rec.fill
      }
  Data.ElementSvgCircle (Data.SvgCircle rec) ->
    Wellknown.svgCircle
      { id
      , class: className
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
  Data.ElementSvgPolygon (Data.SvgPolygon rec) -> Wellknown.svgPolygon rec
  Data.ElementSvgEllipse (Data.SvgEllipse rec) -> Wellknown.svgEllipse rec
  Data.ElementSvgText attributes -> Wellknown.svgText attributes

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
  , childList :: Array (Tuple.Tuple String (Data.ElementAndClass message location))
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Array Html.RawHtmlElement
vdomChildListToHtmlChildList { origin, childList, locationToPathAndSearchParams } =
  Prelude.map
    ( \(Tuple.Tuple _ element) ->
        vdomElementToHtmlElement { origin, element, locationToPathAndSearchParams }
    )
    childList
