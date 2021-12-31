module View.ToVdom (toVdom) where

import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.Tuple as Tuple
import Prelude as Prelude
import StructuredUrl as StructuredUrl
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
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        div.children
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
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        anchor.children
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
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        anchor.children
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

heading1ToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, heading1 :: Data.Heading1 message location } ->
  ElementAndStyleDict message location
heading1ToVdomElementAndStyleDict { style, heading1: Data.Heading1 h1 } =
  let
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        h1.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementH1
            ( Vdom.H1
                { id: Nothing
                , class: Just className
                , click: h1.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

heading2ToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, heading2 :: Data.Heading2 message location } ->
  ElementAndStyleDict message location
heading2ToVdomElementAndStyleDict { style, heading2: Data.Heading2 h2 } =
  let
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        h2.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementH2
            ( Vdom.H2
                { id: Nothing
                , class: Just className
                , click: h2.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

codeToVdomElementAndStyleDict ::
  forall message location.
  { style :: Data.ViewStyle, code :: Data.Code message location } ->
  ElementAndStyleDict message location
codeToVdomElementAndStyleDict { style, code: Data.Code code } =
  let
    { styleDict, className, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        style
        code.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementCode
            ( Vdom.Code
                { id: Nothing
                , class: Just className
                , click: code.click
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
  Data.ElementSvg styleAndSvg -> svgToHtmlElement styleAndSvg
  Data.ElementImage image -> imageElementToHtmlElement image
  Data.ElementDiv div -> divToVdomElementAndStyleDict div
  Data.ElementSameOriginAnchor sampleOriginAnchor -> sampleOriginAnchorToVdomElementAndStyleDict sampleOriginAnchor
  Data.ElementExternalLinkAnchor externalLinkAnchor -> externalLinkAnchorToVdomElementAndStyleDict externalLinkAnchor
  Data.ElementHeading1 heading -> heading1ToVdomElementAndStyleDict heading
  Data.ElementHeading2 heading -> heading2ToVdomElementAndStyleDict heading
  Data.ElementCode code -> codeToVdomElementAndStyleDict code

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

elementListOrTextToStyleDictAndClassNameAndVdomChildren ::
  forall message location.
  Data.ViewStyle ->
  Data.ElementListOrText message location ->
  { styleDict :: StyleDict.StyleDict
  , className :: NonEmptyString
  , vdomChildren :: Vdom.Children message location
  }
elementListOrTextToStyleDictAndClassNameAndVdomChildren style = case _ of
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
  Data.ElementListOrTextText text ->
    let
      { className, styleDict } = StyleDict.createStyleDictAndClassName style
    in
      { className
      , styleDict
      , vdomChildren: Vdom.ChildrenText text
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
