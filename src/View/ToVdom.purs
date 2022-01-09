module View.ToVdom
  ( ElementAndStyleDict(..)
  , svgToHtmlElement
  , toVdom
  ) where

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
      , bodyClass: bodyClassName
      , pointerMove: Nothing
      , pointerDown: Nothing
      }

newtype ElementAndStyleDict message location
  = ElementAndStyleDict
  { element :: Vdom.Element message location
  , styleDict :: StyleDict.StyleDict
  }

newtype ElementAndClassAndStyleDict message location
  = ElementAndClassAndStyleDict
  { element :: Vdom.ElementAndClass message location
  , styleDict :: StyleDict.StyleDict
  }

elementAndStyleDictSetViewStyle ::
  forall message location.
  Data.ViewStyle ->
  Maybe NonEmptyString ->
  ElementAndStyleDict message location ->
  ElementAndClassAndStyleDict message location
elementAndStyleDictSetViewStyle viewStyle idMaybe (ElementAndStyleDict { element, styleDict }) = case StyleDict.addStyleDictAndClassName styleDict viewStyle of
  { className, styleDict: newStyleDict } ->
    ElementAndClassAndStyleDict
      { styleDict: newStyleDict
      , element:
          Vdom.ElementAndClass
            { element
            , class: className
            , id: idMaybe
            }
      }

divToVdomElementAndStyleDict ::
  forall message location.
  Data.Div message location ->
  ElementAndStyleDict message location
divToVdomElementAndStyleDict (Data.Div div) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        div.children
  in
    ElementAndStyleDict
      { styleDict
      , element:
          Vdom.ElementDiv
            ( Vdom.Div
                { click: Nothing
                , children: vdomChildren
                }
            )
      }

sampleOriginAnchorToVdomElementAndStyleDict ::
  forall message location.
  Data.SameOriginAnchor message location ->
  ElementAndStyleDict message location
sampleOriginAnchorToVdomElementAndStyleDict (Data.SameOriginAnchor anchor) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        anchor.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementSameOriginLink
            ( Vdom.SameOriginLink
                { href: anchor.href
                , children: vdomChildren
                }
            )
      , styleDict
      }

externalLinkAnchorToVdomElementAndStyleDict ::
  forall message location.
  Data.ExternalLinkAnchor message location ->
  ElementAndStyleDict message location
externalLinkAnchorToVdomElementAndStyleDict (Data.ExternalLinkAnchor anchor) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        anchor.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementExternalLink
            ( Vdom.ExternalLink
                { href: anchor.href
                , children: vdomChildren
                }
            )
      , styleDict
      }

heading1ToVdomElementAndStyleDict ::
  forall message location.
  Data.Heading1 message location ->
  ElementAndStyleDict message location
heading1ToVdomElementAndStyleDict (Data.Heading1 h1) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        h1.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementH1
            ( Vdom.H1
                { click: h1.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

heading2ToVdomElementAndStyleDict ::
  forall message location.
  Data.Heading2 message location ->
  ElementAndStyleDict message location
heading2ToVdomElementAndStyleDict (Data.Heading2 h2) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        h2.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementH2
            ( Vdom.H2
                { click: h2.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

codeToVdomElementAndStyleDict ::
  forall message location.
  Data.Code message location ->
  ElementAndStyleDict message location
codeToVdomElementAndStyleDict (Data.Code code) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        code.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementCode
            ( Vdom.Code
                { click: code.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

spanToVdomElementAndStyleDict ::
  forall message location.
  (Data.Span message location) ->
  ElementAndStyleDict message location
spanToVdomElementAndStyleDict (Data.Span code) =
  let
    { styleDict, vdomChildren } =
      elementListOrTextToStyleDictAndClassNameAndVdomChildren
        code.children
  in
    ElementAndStyleDict
      { element:
          Vdom.ElementSpan
            ( Vdom.Span
                { click: code.click
                , children: vdomChildren
                }
            )
      , styleDict
      }

viewElementListToVdomChildren ::
  forall message location.
  Array (Data.ElementAndStyle message location) ->
  { childList :: Array (Tuple.Tuple String (Vdom.ElementAndClass message location))
  , styleDict :: StyleDict.StyleDict
  }
viewElementListToVdomChildren children =
  let
    childrenElementAndStyleDict :: Array (ElementAndClassAndStyleDict message location)
    childrenElementAndStyleDict =
      Prelude.map
        ( \child ->
            elementAndStyleToHtmlElementAndStyleDict child
        )
        children
  in
    { childList:
        Array.mapWithIndex
          ( \index (ElementAndClassAndStyleDict { element }) ->
              Tuple.Tuple
                (Prelude.show index)
                element
          )
          childrenElementAndStyleDict
    , styleDict:
        StyleDict.listStyleDictToStyleDict
          ( Prelude.map (\(ElementAndClassAndStyleDict { styleDict }) -> styleDict)
              childrenElementAndStyleDict
          )
    }

viewChildrenToVdomChildren ::
  forall message location.
  NonEmptyArray (Data.KeyAndElement message location) ->
  { childList :: NonEmptyArray (Tuple.Tuple String (Vdom.ElementAndClass message location))
  , styleDict :: StyleDict.StyleDict
  }
viewChildrenToVdomChildren children =
  let
    childrenElementAndStyleDict ::
      NonEmptyArray
        { elementAndStyleDict :: ElementAndClassAndStyleDict message location
        , key :: String
        }
    childrenElementAndStyleDict =
      Prelude.map
        ( \(Data.KeyAndElement { element, key }) ->
            { elementAndStyleDict: elementAndStyleToHtmlElementAndStyleDict element
            , key
            }
        )
        children
  in
    { childList:
        Prelude.map
          ( \({ elementAndStyleDict: ElementAndClassAndStyleDict { element }, key }) ->
              Tuple.Tuple
                key
                element
          )
          childrenElementAndStyleDict
    , styleDict:
        StyleDict.listStyleDictToStyleDict
          ( Prelude.map
              (\({ elementAndStyleDict: ElementAndClassAndStyleDict { styleDict } }) -> styleDict)
              (NonEmptyArray.toArray childrenElementAndStyleDict)
          )
    }

elementAndStyleToHtmlElementAndStyleDict ::
  forall message location.
  Data.ElementAndStyle message location ->
  ElementAndClassAndStyleDict message location
elementAndStyleToHtmlElementAndStyleDict (Data.ElementAndStyle { element, style, id }) = elementAndStyleDictSetViewStyle style id (elementToHtmlElementAndStyleDict element)

elementToHtmlElementAndStyleDict ::
  forall message location.
  Data.Element message location ->
  ElementAndStyleDict message location
elementToHtmlElementAndStyleDict = case _ of
  Data.ElementSvg styleAndSvg -> svgToHtmlElement styleAndSvg
  Data.ElementImage image -> imageElementToHtmlElement image
  Data.ElementDiv div -> divToVdomElementAndStyleDict div
  Data.ElementSameOriginAnchor anchor -> sampleOriginAnchorToVdomElementAndStyleDict anchor
  Data.ElementExternalLinkAnchor anchor -> externalLinkAnchorToVdomElementAndStyleDict anchor
  Data.ElementHeading1 heading1 -> heading1ToVdomElementAndStyleDict heading1
  Data.ElementHeading2 heading2 -> heading2ToVdomElementAndStyleDict heading2
  Data.ElementCode code -> codeToVdomElementAndStyleDict code
  Data.ElementSpan span -> spanToVdomElementAndStyleDict span

svgToHtmlElement ::
  forall message location.
  Data.Svg ->
  ElementAndStyleDict message location
svgToHtmlElement (Data.Svg { viewBox, svgElementList }) =
  ElementAndStyleDict
    { element:
        Vdom.ElementSvg
          ( Vdom.Svg
              { children:
                  Array.mapWithIndex
                    ( \index e ->
                        Tuple.Tuple (Prelude.show index)
                          (svgElementAndStyleToHtmlElementAndClass e)
                    )
                    svgElementList
              , attributes: Vdom.SvgAttributes { viewBox }
              }
          )
    , styleDict: StyleDict.empty
    }

imageElementToHtmlElement ::
  forall message location.
  Data.Image ->
  ElementAndStyleDict message location
imageElementToHtmlElement (Data.Image rec) =
  ElementAndStyleDict
    { element:
        Vdom.ElementImg
          ( Vdom.Img
              { alt: rec.alternativeText
              , src: rec.path
              }
          )
    , styleDict: StyleDict.empty
    }

elementListOrTextToStyleDictAndClassNameAndVdomChildren ::
  forall message location.
  Data.ElementListOrText message location ->
  { styleDict :: StyleDict.StyleDict
  , vdomChildren :: Vdom.Children message location
  }
elementListOrTextToStyleDictAndClassNameAndVdomChildren = case _ of
  Data.ElementListOrTextElementList elementList -> case viewChildrenToVdomChildren elementList of
    { styleDict, childList } ->
      { styleDict
      , vdomChildren: Vdom.ChildrenElementList childList
      }
  Data.ElementListOrTextText text ->
    { styleDict: StyleDict.empty
    , vdomChildren: Vdom.ChildrenText text
    }

svgElementAndStyleToHtmlElementAndClass :: forall message location. Data.SvgElementAndStyle -> Vdom.ElementAndClass message location
svgElementAndStyleToHtmlElementAndClass (Data.SvgElementAndStyle rec) =
  Vdom.ElementAndClass
    { element: svgElementToHtmlElement rec.element
    , id: rec.id
    , class: Nothing
    }

svgElementToHtmlElement :: forall message location. Data.SvgElement -> Vdom.Element message location
svgElementToHtmlElement = case _ of
  Data.Path { pathText, fill } ->
    Vdom.ElementSvgPath
      ( Vdom.SvgPath
          { d: pathText
          , fill: fill
          }
      )
  Data.G { transform, svgElementList } ->
    Vdom.ElementSvgG
      ( Vdom.SvgG
          { transform: transform
          , children:
              Array.mapWithIndex
                ( \index element ->
                    Tuple.Tuple (Prelude.show index)
                      (svgElementAndStyleToHtmlElementAndClass element)
                )
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
          { fill: rec.fill
          , stroke: Nothing
          , cx: rec.cx
          , cy: rec.cy
          , r: rec.r
          , children: []
          }
      )
  Data.Ellipse rec -> Vdom.ElementSvgEllipse (Vdom.SvgEllipse rec)
  Data.SvgText rec -> Vdom.ElementSvgText rec
