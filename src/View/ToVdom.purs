module View.ToVdom (toVdom) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.Tuple as Tuple
import Hash as Hash
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
    ) = viewChildrenToVdomChildren view.children

    { className: bodyClassName, styleDict } = StyleDict.addStyleDictAndClassName styleDictChildren view.bodyStyle Map.empty
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

boxToVdomElementAndStyleDict ::
  forall message location.
  Data.Box message location ->
  ElementAndStyleDict message location
boxToVdomElementAndStyleDict box@( Data.Box
    boxRecord
) =
  let
    keyframeResult = boxGetKeyframeListAndAnimationName box

    { childList: vdomChildList
    , styleDict: childrenStyleDict
    } = viewChildrenToVdomChildren boxRecord.children

    { styleDict, className } =
      StyleDict.addStyleDictAndClassName
        childrenStyleDict
        (boxToBoxViewStyle { box, keyframeResult })
        ( case keyframeResult of
            Just { animationHashValue, keyframeList } -> Map.singleton animationHashValue keyframeList
            Nothing -> Map.empty
        )

    vdomChildren :: Vdom.Children message location
    vdomChildren = case NonEmptyArray.fromArray vdomChildList of
      Just nonEmptyVdomChildren -> Vdom.ChildrenElementList nonEmptyVdomChildren
      Nothing -> Vdom.ChildrenText ""
  in
    ElementAndStyleDict
      { element:
          case boxRecord.link of
            Just (Data.LinkSameOrigin location) ->
              Vdom.ElementSameOriginLink
                ( Vdom.SameOriginLink
                    { id: Nothing
                    , class: Just className
                    , href: location
                    , children: vdomChildren
                    }
                )
            Just (Data.LinkExternal url) ->
              Vdom.ElementExternalLink
                ( Vdom.ExternalLink
                    { id: Nothing
                    , class: Just className
                    , href: url
                    , children: vdomChildren
                    }
                )
            Nothing ->
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

boxToBoxViewStyle ::
  forall message location.
  { box :: Data.Box message location
  , keyframeResult ::
      Maybe
        { keyframeList :: Array Css.Keyframe
        , animationHashValue :: Hash.Sha256HashValue
        , duration :: Number
        }
  } ->
  Data.ViewStyle
boxToBoxViewStyle { box: Data.Box rec, keyframeResult } =
  Data.ViewStyle
    { normal:
        Array.concat
          [ [ Css.boxSizingBorderBox
            , Css.displayGrid
            , Css.gridAutoFlow case rec.direction of
                Data.X -> Css.Column
                Data.Y -> Css.Row
            , Css.alignItems Css.Stretch
            , Css.gap rec.gap
            , Css.padding
                { topBottom: rec.paddingTopBottom
                , leftRight: rec.paddingLeftRight
                }
            ]
          , case rec.height of
              Just height -> [ Css.heightRem height ]
              Nothing -> []
          , case rec.backgroundColor of
              Just backgroundColor -> [ Css.backgroundColor backgroundColor ]
              Nothing -> []
          , case rec.link of
              Just _ ->
                [ Css.textDecorationNone
                , Css.color (Color.rgb 120 190 245)
                ]
              Nothing -> []
          , case rec.gridTemplateColumns1FrCount of
              Just count -> [ Css.gridTemplateColumns count ]
              Nothing -> []
          ]
    , hover:
        case keyframeResult of
          Just animationHashValue ->
            [ Css.animation
                ( StyleDict.sha256HashValueToAnimationName
                    animationHashValue.animationHashValue
                )
                animationHashValue.duration
            ]
          Nothing -> []
    }

viewChildrenToVdomChildren ::
  forall message location.
  Array (Data.Element message location) ->
  { childList :: Array (Tuple.Tuple String (Vdom.Element message location))
  , styleDict :: StyleDict.StyleDict
  }
viewChildrenToVdomChildren children =
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
          ( Prelude.map
              (\(ElementAndStyleDict { styleDict }) -> styleDict)
              childrenElementAndStyleDict
          )
    }

boxGetKeyframeListAndAnimationName ::
  forall message location.
  Data.Box message location ->
  Maybe
    { keyframeList :: Array Css.Keyframe
    , animationHashValue :: Hash.Sha256HashValue
    , duration :: Number
    }
boxGetKeyframeListAndAnimationName (Data.Box { hover: Data.BoxHoverStyle { animation } }) = case animation of
  Just (Data.Animation { keyframeList, duration }) ->
    Just
      { keyframeList: keyframeList
      , animationHashValue: keyframeListToSha256HashValue keyframeList
      , duration: duration
      }
  Nothing -> Nothing

elementToHtmlElementAndStyleDict ::
  forall message location.
  Data.Element message location ->
  ElementAndStyleDict message location
elementToHtmlElementAndStyleDict = case _ of
  Data.ElementText text -> textToHtmlElementAndStyleDict text
  Data.SvgElement styleAndSvg -> svgToHtmlElement styleAndSvg
  Data.ElementImage image -> imageElementToHtmlElement image
  Data.BoxElement e -> boxToVdomElementAndStyleDict e

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
            }
        )
        Map.empty

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
    { styleDict, className } =
      StyleDict.createStyleDictAndClassName
        style
        (Map.empty)
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
    { styleDict, className } = StyleDict.createStyleDictAndClassName style Map.empty
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

keyframeListToSha256HashValue :: Array Css.Keyframe -> Hash.Sha256HashValue
keyframeListToSha256HashValue keyframeList =
  Hash.stringToSha256HashValue
    (String.joinWith "!" (Prelude.map Css.keyFrameToString keyframeList))
