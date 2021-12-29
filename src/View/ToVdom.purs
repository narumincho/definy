module View.ToVdom (toVdom) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Hash as Hash
import Html.Wellknown as HtmlWellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.VdomPicked as Vdom
import Vdom.PatchState as VdomPatchState
import View.Data as Data

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
      , keyframesDict
      }
    ) = viewChildrenToVdomChildren view.children

    { className: bodyClassName, styleDict } = addStyleDictAndClassName styleDictChildren view.bodyStyle
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
      , style:
          htmlElementAndStyleDictToCssStatementList { styleDict, keyframesDict }
      , scriptPath
      , children: vdomChildren
      , bodyClass: Just bodyClassName
      , pointerMove: Nothing
      , pointerDown: Nothing
      }

htmlElementAndStyleDictToCssStatementList ::
  { keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  , styleDict :: Map.Map Hash.Sha256HashValue Data.ViewStyle
  } ->
  Css.StatementList
htmlElementAndStyleDictToCssStatementList { keyframesDict, styleDict } =
  Css.StatementList
    { ruleList:
        Array.concat
          [ [ Css.Rule
                { selector: Css.Type { elementName: HtmlWellknown.htmlTagName }
                , declarationList: [ Css.height100Percent ]
                }
            , Css.Rule
                { selector: Css.Type { elementName: HtmlWellknown.bodyTagName }
                , declarationList:
                    [ Css.height100Percent
                    , Css.margin0
                    , Css.backgroundColor Color.black
                    , Css.displayGrid
                    , Css.boxSizingBorderBox
                    , Css.alignItems Css.Start
                    ]
                }
            ]
          , Array.concatMap
              styleDictItemToCssRuleList
              (Map.toUnfoldable styleDict)
          ]
    , keyframesList:
        Prelude.map
          ( \(Tuple.Tuple hashValue keyframeList) ->
              Css.Keyframes
                { name: sha256HashValueToAnimationName hashValue
                , keyframeList
                }
          )
          (Map.toUnfoldable keyframesDict)
    }

styleDictItemToCssRuleList :: Tuple.Tuple Hash.Sha256HashValue Data.ViewStyle -> Array Css.Rule
styleDictItemToCssRuleList (Tuple.Tuple hashValue (Data.ViewStyle { normal, hover })) =
  Array.concat
    [ if Array.null normal then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: false
                  }
            , declarationList: normal
            }
        ]
    , if Array.null hover then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: true
                  }
            , declarationList: hover
            }
        ]
    ]

newtype ElementAndStyleDict message location
  = ElementAndStyleDict
  { element :: Vdom.Element message location
  , styleDict :: Map.Map Hash.Sha256HashValue Data.ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
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
    , keyframesDict: childrenKeyframesDict
    } = viewChildrenToVdomChildren boxRecord.children

    { styleDict, className } =
      addStyleDictAndClassName
        childrenStyleDict
        (boxToBoxViewStyle { box, keyframeResult })

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
      , keyframesDict:
          case keyframeResult of
            Just { animationHashValue, keyframeList } ->
              Map.insert animationHashValue keyframeList
                childrenKeyframesDict
            Nothing -> childrenKeyframesDict
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
                ( sha256HashValueToAnimationName
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
  , styleDict :: Map.Map Hash.Sha256HashValue Data.ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
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
        Map.fromFoldable
          ( Array.concatMap
              (\(ElementAndStyleDict { styleDict }) -> Map.toUnfoldable styleDict)
              childrenElementAndStyleDict
          )
    , keyframesDict:
        Map.fromFoldable
          ( Array.concatMap
              (\(ElementAndStyleDict { keyframesDict }) -> Map.toUnfoldable keyframesDict)
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
  Data.SvgElement
    { style
  , svg: Data.Svg { viewBox: Data.ViewBox viewBox, svgElementList }
  } ->
    let
      { styleDict, className } =
        createStyleDictAndClassName
          style
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
        , keyframesDict: Map.empty
        }
  Data.ElementImage image -> imageElementToHtmlElement image
  Data.BoxElement e -> boxToVdomElementAndStyleDict e

textToHtmlElementAndStyleDict :: forall message location. Data.Text message -> ElementAndStyleDict message location
textToHtmlElementAndStyleDict (Data.Text { padding, markup, text, click }) =
  let
    { styleDict, className } =
      createStyleDictAndClassName
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
      , keyframesDict: Map.empty
      }

imageElementToHtmlElement :: forall message location. { style :: Data.ViewStyle, image :: Data.Image } -> ElementAndStyleDict message location
imageElementToHtmlElement { style, image: Data.Image rec } =
  let
    { styleDict, className } = createStyleDictAndClassName style
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
      , keyframesDict: Map.empty
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

sha256HashValueToClassName :: Hash.Sha256HashValue -> NonEmptyString
sha256HashValueToClassName sha256HashValue =
  NonEmptyString.prependString
    "nv_"
    (Hash.toNonEmptyString sha256HashValue)

sha256HashValueToAnimationName :: Hash.Sha256HashValue -> NonEmptyString
sha256HashValueToAnimationName sha256HashValue =
  NonEmptyString.prependString
    "nva_"
    (Hash.toNonEmptyString sha256HashValue)

viewStyleToSha256HashValue :: Data.ViewStyle -> Hash.Sha256HashValue
viewStyleToSha256HashValue (Data.ViewStyle { normal, hover }) =
  Hash.stringToSha256HashValue
    ( String.joinWith "!"
        [ Css.declarationListToString normal
        , Css.declarationListToString hover
        ]
    )

keyframeListToSha256HashValue :: Array Css.Keyframe -> Hash.Sha256HashValue
keyframeListToSha256HashValue keyframeList =
  Hash.stringToSha256HashValue
    (String.joinWith "!" (Prelude.map Css.keyFrameToString keyframeList))

createStyleDictAndClassName ::
  Data.ViewStyle ->
  { styleDict :: Map.Map Hash.Sha256HashValue Data.ViewStyle, className :: NonEmptyString }
createStyleDictAndClassName viewStyle =
  let
    classNameHashValue :: Hash.Sha256HashValue
    classNameHashValue = viewStyleToSha256HashValue viewStyle

    className :: NonEmptyString
    className = sha256HashValueToClassName classNameHashValue
  in
    { styleDict: Map.singleton classNameHashValue viewStyle
    , className
    }

addStyleDictAndClassName ::
  Map.Map Hash.Sha256HashValue Data.ViewStyle ->
  Data.ViewStyle ->
  { styleDict :: Map.Map Hash.Sha256HashValue Data.ViewStyle, className :: NonEmptyString }
addStyleDictAndClassName styleDict viewStyle =
  let
    classNameHashValue :: Hash.Sha256HashValue
    classNameHashValue = viewStyleToSha256HashValue viewStyle

    className :: NonEmptyString
    className = sha256HashValueToClassName classNameHashValue
  in
    { styleDict: Map.insert classNameHashValue viewStyle styleDict
    , className
    }
