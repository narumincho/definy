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
import Vdom.Data as Vdom
import Vdom.PatchState as VdomPatchState
import View.Data as Data

toVdom ::
  forall message location.
  { scriptPath :: Maybe StructuredUrl.PathAndSearchParams
  , view :: Data.View message location
  } ->
  Vdom.Vdom message location
toVdom { scriptPath, view: Data.View view } =
  let
    ( { childList: vdomChildren
      , styleDict
      , keyframesDict
      }
    ) =
      viewChildrenToVdomChildren
        { children: view.children
        , parentScrollX: view.scrollX
        , parentScrollY: view.scrollY
        }
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
      , bodyClass: Nothing
      , pointerMove: Nothing
      , pointerDown: Nothing
      }

htmlElementAndStyleDictToCssStatementList ::
  { keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
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

styleDictItemToCssRuleList :: Tuple.Tuple Hash.Sha256HashValue ViewStyle -> Array Css.Rule
styleDictItemToCssRuleList (Tuple.Tuple hashValue (ViewStyle { declarationList, hoverDeclarationList })) =
  Array.concat
    [ if Array.null declarationList then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: false
                  }
            , declarationList: declarationList
            }
        ]
    , if Array.null hoverDeclarationList then
        []
      else
        [ Css.Rule
            { selector:
                Css.Class
                  { className: sha256HashValueToClassName hashValue
                  , isHover: true
                  }
            , declarationList: hoverDeclarationList
            }
        ]
    ]

newtype ViewStyle
  = ViewStyle
  { declarationList :: Array Css.Declaration
  , hoverDeclarationList :: Array Css.Declaration
  }

newtype ElementAndStyleDict message location
  = ElementAndStyleDict
  { element :: Vdom.Element message location
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  }

boxToVdomElementAndStyleDict ::
  forall message location.
  { box :: Data.Box message location
  , parentScrollX :: Boolean
  , parentScrollY :: Boolean
  } ->
  ElementAndStyleDict message location
boxToVdomElementAndStyleDict { box:
    box@( Data.Box
        boxRecord
    )
, parentScrollX
, parentScrollY
} =
  let
    keyframeResult = boxGetKeyframeListAndAnimationName box

    { childList: vdomChildList
    , styleDict: childrenStyleDict
    , keyframesDict: childrenKeyframesDict
    } =
      viewChildrenToVdomChildren
        { children: boxRecord.children
        , parentScrollX:
            if boxRecord.scrollX then
              true
            else
              parentScrollX
        , parentScrollY:
            if boxRecord.scrollY then
              true
            else
              parentScrollY
        }

    { styleDict, className } =
      addStyleDictAndClassName
        childrenStyleDict
        (boxToBoxViewStyle { box, parentScrollX, parentScrollY, keyframeResult })

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
  , parentScrollX :: Boolean
  , parentScrollY :: Boolean
  , keyframeResult ::
      Maybe
        { keyframeList :: Array Css.Keyframe
        , animationHashValue :: Hash.Sha256HashValue
        , duration :: Number
        }
  } ->
  ViewStyle
boxToBoxViewStyle { box: Data.Box rec, parentScrollX, parentScrollY, keyframeResult } =
  ViewStyle
    { declarationList:
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
            , Css.overflow
                { x:
                    if rec.scrollX then
                      Css.Scroll
                    else if parentScrollX then
                      Css.Visible
                    else
                      Css.Hidden
                , y:
                    if rec.scrollY then
                      Css.Scroll
                    else if parentScrollY then
                      Css.Visible
                    else
                      Css.Hidden
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
    , hoverDeclarationList:
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
  { children :: Array (Data.Element message location)
  , parentScrollX :: Boolean
  , parentScrollY :: Boolean
  } ->
  { childList :: Array (Tuple.Tuple String (Vdom.Element message location))
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  }
viewChildrenToVdomChildren { children, parentScrollX, parentScrollY } =
  let
    childrenElementAndStyleDict :: Array (ElementAndStyleDict message location)
    childrenElementAndStyleDict =
      Prelude.map
        ( \child ->
            elementToHtmlElementAndStyleDict
              { element: child
              , parentScrollX
              , parentScrollY
              }
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
  { element :: Data.Element message location
  , parentScrollX :: Boolean
  , parentScrollY :: Boolean
  } ->
  ElementAndStyleDict message location
elementToHtmlElementAndStyleDict { element, parentScrollX, parentScrollY } = case element of
  Data.ElementText text -> textToHtmlElementAndStyleDict text
  Data.SvgElement
    { height
  , isJustifySelfCenter
  , svg: Data.Svg { viewBox: Data.ViewBox viewBox, svgElementList }
  , width
  } ->
    let
      { styleDict, className } =
        createStyleDictAndClassName
          ( ViewStyle
              { declarationList:
                  Array.concat
                    [ [ percentageOrRemWidthToCssDeclaration width
                      , Css.heightRem height
                      ]
                    , if isJustifySelfCenter then
                        [ Css.justifySelfCenter ]
                      else
                        []
                    ]
              , hoverDeclarationList: []
              }
          )
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
  Data.Image { width, height, path, alternativeText } ->
    let
      { styleDict, className } =
        createStyleDictAndClassName
          ( ViewStyle
              { declarationList:
                  [ percentageOrRemWidthToCssDeclaration width
                  , Css.heightRem height
                  , Css.objectFitConver
                  ]
              , hoverDeclarationList: []
              }
          )
    in
      ElementAndStyleDict
        { element:
            Vdom.ElementImg
              ( Vdom.Img
                  { id: Nothing
                  , class: Just className
                  , alt: alternativeText
                  , src: path
                  }
              )
        , styleDict
        , keyframesDict: Map.empty
        }
  Data.BoxElement e -> boxToVdomElementAndStyleDict { box: e, parentScrollX, parentScrollY }

textToHtmlElementAndStyleDict :: forall message location. Data.Text message -> ElementAndStyleDict message location
textToHtmlElementAndStyleDict (Data.Text { padding, markup, text, click }) =
  let
    { styleDict, className } =
      createStyleDictAndClassName
        ( ViewStyle
            { declarationList:
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
            , hoverDeclarationList: []
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

percentageOrRemWidthToCssDeclaration :: Data.PercentageOrRem -> Css.Declaration
percentageOrRemWidthToCssDeclaration = case _ of
  Data.Rem value -> Css.widthRem value
  Data.Percentage value -> Css.widthPercent value

viewStyleToSha256HashValue :: ViewStyle -> Hash.Sha256HashValue
viewStyleToSha256HashValue (ViewStyle { declarationList, hoverDeclarationList }) =
  Hash.stringToSha256HashValue
    ( String.joinWith "!"
        [ Css.declarationListToString declarationList
        , Css.declarationListToString hoverDeclarationList
        ]
    )

keyframeListToSha256HashValue :: Array Css.Keyframe -> Hash.Sha256HashValue
keyframeListToSha256HashValue keyframeList =
  Hash.stringToSha256HashValue
    (String.joinWith "!" (Prelude.map Css.keyFrameToString keyframeList))

createStyleDictAndClassName :: ViewStyle -> { styleDict :: Map.Map Hash.Sha256HashValue ViewStyle, className :: NonEmptyString }
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

addStyleDictAndClassName :: Map.Map Hash.Sha256HashValue ViewStyle -> ViewStyle -> { styleDict :: Map.Map Hash.Sha256HashValue ViewStyle, className :: NonEmptyString }
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
