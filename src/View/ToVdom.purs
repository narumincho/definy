module View.ToVdom (toVdom) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple as Tuple
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.PatchState as VdomPatchState
import Vdom.VdomPicked as Vdom
import View.Data as Data
import View.StyleDict as StyleDict

toVdom ::
  forall message location.
  { scriptPath :: Maybe StructuredUrl.PathAndSearchParams
  , view :: Data.View message location
  } ->
  Vdom.VdomPicked message location
toVdom { scriptPath, view: Data.View view } =
  let
    ( { childList: vdomChildren
      , styleDict: styleDictChildren
      }
    ) = viewElementListToVdomChildren view.children

    { className: bodyClassName, styleDict } = StyleDict.addStyleDictAndClassName styleDictChildren view.bodyStyle
  in
    Vdom.Vdom
      { pageName: view.pageName
      , appName: view.appName
      , description: view.description
      , themeColor: view.themeColor
      , iconPath: view.iconPath
      , language: view.language
      , coverImagePath: view.coverImagePath
      , path: Just view.path
      , origin: view.origin
      , style: StyleDict.toCssStatementList styleDict
      , scriptPath
      , children: vdomChildren
      , bodyClass: Just bodyClassName
      , pointerMove: Nothing
      , pointerDown: Nothing
      }

newtype ElementAndStyleDict message location
  = ElementAndStyleDict
  { element :: Vdom.Element message location
  , styleDict :: StyleDict.StyleDict
  }

divToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, div :: Data.Div message location } ->
  ElementAndStyleDict message location
divToVdomElementAndStyleDict { style, div: Data.Div div } =
  let
    { styleDict, className, vdomChildren } = case div.children of
      Data.ElementListOrTextElementList elementList ->
        let
          { childList
          , styleDict: childrenStyleDict
          } = viewChildrenToVdomChildren elementList

          { className, styleDict } = StyleDict.addStyleDictAndClassName childrenStyleDict style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenElementList childList
          }
      Data.ElementListOrTextText _ ->
        let
          { className, styleDict } = StyleDict.createStyleDictAndClassName style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenText ""
          }
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementDiv
            ( Vdom.Div
                { id: Nothing
                , class: Just className
                , click: Nothing
                , children: vdomChildren
                }
            )
      , styleDict
      }

sampleOriginAnchorToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, anchor :: Data.SameOriginAnchor message location } ->
  ElementAndStyleDict message location
sampleOriginAnchorToVdomElementAndStyleDict { style, anchor: Data.SameOriginAnchor anchor } =
  let
    { styleDict, className, vdomChildren } = case anchor.children of
      Data.ElementListOrTextElementList elementList ->
        let
          { childList
          , styleDict: childrenStyleDict
          } = viewChildrenToVdomChildren elementList

          { className, styleDict } = StyleDict.addStyleDictAndClassName childrenStyleDict style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenElementList childList
          }
      Data.ElementListOrTextText _ ->
        let
          { className, styleDict } = StyleDict.createStyleDictAndClassName style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenText ""
          }
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementSameOriginLink
            ( Vdom.SameOriginLink
                { id: Nothing
                , class: Just className
                , href: anchor.href
                , children: vdomChildren
                }
            )
      , styleDict
      }

externalLinkAnchorToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, anchor :: Data.ExternalLinkAnchor message location } ->
  ElementAndStyleDict message location
externalLinkAnchorToVdomElementAndStyleDict { style, anchor: Data.ExternalLinkAnchor anchor } =
  let
    { styleDict, className, vdomChildren } = case anchor.children of
      Data.ElementListOrTextElementList elementList ->
        let
          { childList
          , styleDict: childrenStyleDict
          } = viewChildrenToVdomChildren elementList

          { className, styleDict } = StyleDict.addStyleDictAndClassName childrenStyleDict style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenElementList childList
          }
      Data.ElementListOrTextText _ ->
        let
          { className, styleDict } = StyleDict.createStyleDictAndClassName style
        in
          { className
          , styleDict
          , vdomChildren: Vdom.ChildrenText ""
          }
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementExternalLink
            ( Vdom.ExternalLink
                { id: Nothing
                , class: Just className
                , href: anchor.href
                , children: vdomChildren
                }
            )
      , styleDict
      }

viewElementListToVdomChildren ::
  forall message location.
  Array (Data.Element message location) ->
  { childList :: Array (Tuple.Tuple String (Vdom.Element message location))
  , styleDict :: StyleDict.StyleDict
  }
viewElementListToVdomChildren children =
  let
    childrenElementAndStyleDict :: Array (ElementAndStyleDict message location)
    childrenElementAndStyleDict =
      Prelude.map
        ( \child ->
            elementToHtmlElementAndStyleDict child
        )
        children
  in
    { childList:
        Array.mapWithIndex
          ( \index (ElementAndStyleDict { element }) ->
              Tuple.Tuple
                (Prelude.show index)
                element
          )
          childrenElementAndStyleDict
    , styleDict:
        StyleDict.listStyleDictToStyleDict
          ( Prelude.map (\(ElementAndStyleDict { styleDict }) -> styleDict)
              childrenElementAndStyleDict
          )
    }

viewChildrenToVdomChildren ::
  forall message location.
  NonEmptyArray (Data.KeyAndElement message location) ->
  { childList :: NonEmptyArray (Tuple.Tuple String (Vdom.Element message location))
  , styleDict :: StyleDict.StyleDict
  }
viewChildrenToVdomChildren children =
  let
    childrenElementAndStyleDict ::
      NonEmptyArray
        { elementAndStyleDict :: ElementAndStyleDict message location
        , key :: String
        }
    childrenElementAndStyleDict =
      Prelude.map
        ( \(Data.KeyAndElement { element, key }) ->
            { elementAndStyleDict: elementToHtmlElementAndStyleDict element
            , key
            }
        )
        children
  in
    { childList:
        Prelude.map
          ( \({ elementAndStyleDict: ElementAndStyleDict { element }, key }) ->
              Tuple.Tuple
                key
                element
          )
          childrenElementAndStyleDict
    , styleDict:
        StyleDict.listStyleDictToStyleDict
          ( Prelude.map
              (\({ elementAndStyleDict: ElementAndStyleDict { styleDict } }) -> styleDict)
              (NonEmptyArray.toArray childrenElementAndStyleDict)
          )
    }

elementToHtmlElementAndStyleDict ::
  forall message location.
  Data.Element message location ->
  ElementAndStyleDict message location
elementToHtmlElementAndStyleDict = case _ of
  Data.ElementText text -> textToHtmlElementAndStyleDict text
  Data.ElementSvg styleAndSvg -> svgToHtmlElement styleAndSvg
  Data.ElementImage image -> imageElementToHtmlElement image
  Data.ElementDiv div -> divToVdomElementAndStyleDict div
  Data.ElementSameOriginAnchor sampleOriginAnchor -> sampleOriginAnchorToVdomElementAndStyleDict sampleOriginAnchor
  Data.ElementExternalLinkAnchor externalLinkAnchor -> externalLinkAnchorToVdomElementAndStyleDict externalLinkAnchor

textToHtmlElementAndStyleDict :: forall message location. Data.Text message -> ElementAndStyleDict message location
textToHtmlElementAndStyleDict (Data.Text { padding, markup, text, click }) =
  let
    { styleDict, className } =
      StyleDict.createStyleDictAndClassName
        ( Data.ViewStyle
            { normal:
                ( Array.concat
                    [ [ Css.color Color.white
                      , Css.padding { topBottom: padding, leftRight: padding }
                      , Css.margin0
                      ]
                    , case markup of
                        Data.Code -> [ Css.whiteSpacePre ]
                        _ -> []
                    ]
                )
            , hover: []
            , animation: Map.empty
            }
        )

    clickMessageDataMaybe :: Maybe (VdomPatchState.ClickMessageData message)
    clickMessageDataMaybe =
      Prelude.map
        ( \message ->
            VdomPatchState.clickMessageFrom
              { stopPropagation: false
              , message
              , url: Nothing
              }
        )
        click
  in
    ElementAndStyleDict
      { element:
          case markup of
            Data.None ->
              Vdom.ElementDiv
                ( Vdom.Div
                    { id: Nothing
                    , class: Just className
                    , click: clickMessageDataMaybe
                    , children: Vdom.ChildrenText text
                    }
                )
            Data.Heading1 ->
              Vdom.ElementH1
                ( Vdom.H1
                    { id: Nothing
                    , class: Just className
                    , click: clickMessageDataMaybe
                    , children: Vdom.ChildrenText text
                    }
                )
            Data.Heading2 ->
              Vdom.ElementH2
                ( Vdom.H2
                    { id: Nothing
                    , class: Just className
                    , click: clickMessageDataMaybe
                    , children: Vdom.ChildrenText text
                    }
                )
            Data.Code ->
              Vdom.ElementCode
                ( Vdom.Code
                    { id: Nothing
                    , class: Just className
                    , click: clickMessageDataMaybe
                    , children: Vdom.ChildrenText text
                    }
                )
      , styleDict
      }

svgToHtmlElement :: forall message location. { style :: Data.ViewStyle, svg :: Data.Svg } -> ElementAndStyleDict message location
svgToHtmlElement { style
, svg: Data.Svg { viewBox: Data.ViewBox viewBox, svgElementList }
} =
  let
    { styleDict, className } = StyleDict.createStyleDictAndClassName style
  in
    ElementAndStyleDict
      { element:
          Vdom.svg
            { children:
                Array.mapWithIndex
                  (\index e -> Tuple.Tuple (Prelude.show index) (svgElementToHtmlElement e))
                  svgElementList
            , class: Just className
            , id: Nothing
            , viewBoxHeight: viewBox.height
            , viewBoxWidth: viewBox.width
            , viewBoxX: viewBox.x
            , viewBoxY: viewBox.y
            }
      , styleDict
      }

imageElementToHtmlElement :: forall message location. { style :: Data.ViewStyle, image :: Data.Image } -> ElementAndStyleDict message location
imageElementToHtmlElement { style, image: Data.Image rec } =
  let
    { styleDict, className } = StyleDict.createStyleDictAndClassName style
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementImg
            ( Vdom.Img
                { id: Nothing
                , class: Just className
                , alt: rec.alternativeText
                , src: rec.path
                }
            )
      , styleDict
      }

svgElementToHtmlElement :: forall message location. Data.SvgElement -> Vdom.Element message location
svgElementToHtmlElement = case _ of
  Data.Path { pathText, fill } ->
    Vdom.ElementSvgPath
      ( Vdom.SvgPath
          { id: Nothing
          , class: Nothing
          , d: pathText
          , fill: fill
          }
      )
  Data.G { transform, svgElementList } ->
    Vdom.ElementSvgG
      ( Vdom.SvgG
          { transform: transform
          , children:
              Array.mapWithIndex
                (\index element -> Tuple.Tuple (Prelude.show index) (svgElementToHtmlElement element))
                svgElementList
          }
      )
  Data.Polygon rec ->
    Vdom.ElementSvgPolygon
      ( Vdom.SvgPolygon
          rec
      )
  Data.Circle rec ->
    Vdom.ElementSvgCircle
      ( Vdom.SvgCircle
          { id: Nothing
          , class: Nothing
          , fill: rec.fill
          , stroke: Nothing
          , cx: rec.cx
          , cy: rec.cy
          , r: rec.r
          , children: []
          }
      )
  Data.Ellipse rec -> Vdom.ElementSvgEllipse (Vdom.SvgEllipse rec)
