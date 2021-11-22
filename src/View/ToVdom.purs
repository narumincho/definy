module View.ToVdom (toVdom) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Hash as Hash
import Html.Wellknown as HtmlWellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.Data as Vdom
import View.Data as Data

toVdom :: forall message. StructuredUrl.PathAndSearchParams -> Data.View message -> Vdom.Vdom message
toVdom scriptPath (Data.View view) =
  let
    ( { childList: vdomChildren
      , styleDict
      , keyframesDict
      }
    ) = viewChildrenToVdomChildren view.children
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
      , scriptPath: Just scriptPath
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

newtype ElementAndStyleDict message
  = ElementAndStyleDict
  { element :: Vdom.Element message
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  }

htmlElementAndStyleDictStyleDict :: forall message. ElementAndStyleDict message -> Map.Map Hash.Sha256HashValue ViewStyle
htmlElementAndStyleDictStyleDict (ElementAndStyleDict { styleDict }) = styleDict

htmlElementAndStyleDictKeyframesDict :: forall message. ElementAndStyleDict message -> Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
htmlElementAndStyleDictKeyframesDict (ElementAndStyleDict { keyframesDict }) = keyframesDict

boxToVdomElementAndStyleDict :: forall message. Data.Box message -> ElementAndStyleDict message
boxToVdomElementAndStyleDict box@( Data.Box
    boxRecord
) =
  let
    keyframeResult = boxGetKeyframeListAndAnimationName box

    viewStyle :: ViewStyle
    viewStyle =
      ViewStyle
        { declarationList:
            Array.concat
              [ [ Css.boxSizingBorderBox
                , Css.displayGrid
                , Css.gridAutoFlow case boxRecord.direction of
                    Data.X -> Css.Column
                    Data.Y -> Css.Row
                , Css.alignItems Css.Stretch
                , Css.gap boxRecord.gap
                , Css.padding
                    { topBottom: boxRecord.paddingTopBottom
                    , leftRight: boxRecord.paddingLeftRight
                    }
                , Css.overflowHidden
                ]
              , case boxRecord.height of
                  Maybe.Just height -> [ Css.heightRem height ]
                  Maybe.Nothing -> []
              , case boxRecord.backgroundColor of
                  Maybe.Just backgroundColor -> [ Css.backgroundColor backgroundColor ]
                  Maybe.Nothing -> []
              , case boxRecord.url of
                  Maybe.Just _ -> [ Css.textDecorationNone ]
                  Maybe.Nothing -> []
              , case boxRecord.gridTemplateColumns1FrCount of
                  Maybe.Just count -> [ Css.gridTemplateColumns count ]
                  Maybe.Nothing -> []
              ]
        , hoverDeclarationList:
            case keyframeResult of
              Maybe.Just animationHashValue ->
                [ Css.animation
                    ( sha256HashValueToAnimationName
                        animationHashValue.animationHashValue
                    )
                    animationHashValue.duration
                ]
              Maybe.Nothing -> []
        }

    classNameHashValue :: Hash.Sha256HashValue
    classNameHashValue = viewStyleToSha256HashValue viewStyle

    className :: NonEmptyString
    className = sha256HashValueToClassName classNameHashValue

    { childList: vdomChildList
    , styleDict: childrenStyleDict
    , keyframesDict: childrenKeyframesDict
    } = viewChildrenToVdomChildren boxRecord.children

    vdomChildren :: Vdom.Children message
    vdomChildren = case NonEmptyArray.fromArray vdomChildList of
      Just nonEmptyVdomChildren -> Vdom.ChildrenElementList nonEmptyVdomChildren
      Nothing -> Vdom.ChildrenText ""
  in
    ElementAndStyleDict
      { element:
          case boxRecord.url of
            Maybe.Just url ->
              Vdom.ElementExternalLink
                ( Vdom.ExternalLink
                    { id: Maybe.Nothing
                    , class: Maybe.Just className
                    , url: url
                    , children: vdomChildren
                    }
                )
            Maybe.Nothing ->
              Vdom.ElementDiv
                ( Vdom.Div
                    { id: Maybe.Nothing
                    , class: Maybe.Just className
                    , click: Maybe.Nothing
                    , children: vdomChildren
                    }
                )
      , styleDict:
          Map.insert classNameHashValue viewStyle childrenStyleDict
      , keyframesDict:
          case keyframeResult of
            Maybe.Just { animationHashValue, keyframeList } ->
              Map.insert animationHashValue keyframeList
                childrenKeyframesDict
            Maybe.Nothing -> childrenKeyframesDict
      }

viewChildrenToVdomChildren ::
  forall message.
  Array (Data.Element message) ->
  { childList :: Array (Tuple.Tuple String (Vdom.Element message))
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  }
viewChildrenToVdomChildren children =
  let
    childrenElementAndStyleDict :: Array (ElementAndStyleDict message)
    childrenElementAndStyleDict = Prelude.map elementToHtmlElementAndStyleDict children
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
              (\c -> Map.toUnfoldable (htmlElementAndStyleDictStyleDict c))
              childrenElementAndStyleDict
          )
    , keyframesDict:
        Map.fromFoldable
          ( Array.concatMap
              (\c -> Map.toUnfoldable (htmlElementAndStyleDictKeyframesDict c))
              childrenElementAndStyleDict
          )
    }

boxGetKeyframeListAndAnimationName ::
  forall message.
  Data.Box message ->
  Maybe.Maybe
    { keyframeList :: Array Css.Keyframe
    , animationHashValue :: Hash.Sha256HashValue
    , duration :: Number
    }
boxGetKeyframeListAndAnimationName (Data.Box { hover: Data.BoxHoverStyle { animation } }) = case animation of
  Maybe.Just (Data.Animation { keyframeList, duration }) ->
    Maybe.Just
      { keyframeList: keyframeList
      , animationHashValue: keyframeListToSha256HashValue keyframeList
      , duration: duration
      }
  Maybe.Nothing -> Maybe.Nothing

elementToHtmlElementAndStyleDict :: forall message. Data.Element message -> ElementAndStyleDict message
elementToHtmlElementAndStyleDict = case _ of
  Data.Text { padding, markup, text } ->
    let
      viewStyle :: ViewStyle
      viewStyle =
        ViewStyle
          { declarationList:
              [ Css.color Color.white
              , Css.padding { topBottom: padding, leftRight: padding }
              , Css.margin0
              , Css.lineHeight 1
              ]
          , hoverDeclarationList: []
          }

      classNameHashValue :: Hash.Sha256HashValue
      classNameHashValue = viewStyleToSha256HashValue viewStyle

      className :: NonEmptyString
      className = sha256HashValueToClassName classNameHashValue
    in
      ElementAndStyleDict
        { element:
            case markup of
              Data.None ->
                Vdom.ElementDiv
                  ( Vdom.Div
                      { children: Vdom.ChildrenText text
                      , class: Maybe.Just className
                      , click: Maybe.Nothing
                      , id: Maybe.Nothing
                      }
                  )
              Data.Heading1 ->
                Vdom.ElementH1
                  ( Vdom.H1
                      { class: Maybe.Just className
                      , click: Maybe.Nothing
                      , id: Maybe.Nothing
                      , children: Vdom.ChildrenText text
                      }
                  )
              Data.Heading2 ->
                Vdom.ElementH2
                  ( Vdom.H2
                      { class: Maybe.Just className
                      , click: Maybe.Nothing
                      , id: Maybe.Nothing
                      , children: Vdom.ChildrenText text
                      }
                  )
        , styleDict: Map.singleton classNameHashValue viewStyle
        , keyframesDict: Map.empty
        }
  Data.SvgElement
    { height
  , isJustifySelfCenter
  , svg: Data.Svg { viewBox: Data.ViewBox viewBox, svgElementList }
  , width
  } ->
    let
      viewStyle :: ViewStyle
      viewStyle =
        ViewStyle
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

      className = viewStyleToSha256HashValue viewStyle
    in
      ElementAndStyleDict
        { element:
            Vdom.svg
              { children:
                  Array.mapWithIndex (\index element -> Tuple.Tuple (Prelude.show index) (svgElementToHtmlElement element)) svgElementList
              , class: Maybe.Nothing
              , id: Maybe.Nothing
              , viewBoxHeight: viewBox.height
              , viewBoxWidth: viewBox.width
              , viewBoxX: viewBox.x
              , viewBoxY: viewBox.y
              }
        , styleDict: Map.singleton className viewStyle
        , keyframesDict: Map.empty
        }
  Data.Image { width, height, path, alternativeText } ->
    let
      viewStyle :: ViewStyle
      viewStyle =
        ViewStyle
          { declarationList:
              [ percentageOrRemWidthToCssDeclaration width
              , Css.heightRem height
              , Css.objectFitConver
              ]
          , hoverDeclarationList: []
          }

      classNameHashValue :: Hash.Sha256HashValue
      classNameHashValue = viewStyleToSha256HashValue viewStyle
    in
      ElementAndStyleDict
        { element:
            Vdom.ElementImg
              ( Vdom.Img
                  { id: Nothing
                  , class: Just (sha256HashValueToClassName classNameHashValue)
                  , alt: alternativeText
                  , src: path
                  }
              )
        , styleDict: Map.singleton classNameHashValue viewStyle
        , keyframesDict: Map.empty
        }
  Data.BoxElement element -> boxToVdomElementAndStyleDict element

svgElementToHtmlElement :: forall message. Data.SvgElement -> Vdom.Element message
svgElementToHtmlElement = case _ of
  Data.Path { pathText, fill } ->
    Vdom.ElementSvgPath
      ( Vdom.SvgPath
          { id: Maybe.Nothing
          , class: Maybe.Nothing
          , d: pathText
          , fill: fill
          }
      )
  Data.G { transform, svgElementList } ->
    Vdom.ElementSvgG
      ( Vdom.SvgG
          { transform: String.joinWith "" transform
          , children: Array.mapWithIndex (\index element -> Tuple.Tuple (Prelude.show index) (svgElementToHtmlElement element)) svgElementList
          }
      )

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
