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
import Vdom.PatchState as VdomPatchState
import View.Data as Data

toVdom :: forall message. Maybe StructuredUrl.PathAndSearchParams -> Data.View message -> Vdom.Vdom message
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
                  Just height -> [ Css.heightRem height ]
                  Nothing -> []
              , case boxRecord.backgroundColor of
                  Just backgroundColor -> [ Css.backgroundColor backgroundColor ]
                  Nothing -> []
              , case boxRecord.link of
                  Just _ -> [ Css.textDecorationNone ]
                  Nothing -> []
              , case boxRecord.gridTemplateColumns1FrCount of
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
          case boxRecord.link of
            Just (Data.LinkSameOrigin (Data.PathAndSearchParamsAndMessage { message, pathAndSearchParams })) ->
              Vdom.ElementSameOriginLink
                ( Vdom.SameOriginLink
                    { id: Nothing
                    , class: Just className
                    , href: pathAndSearchParams
                    , jumpMessage: message
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
      , styleDict:
          Map.insert classNameHashValue viewStyle childrenStyleDict
      , keyframesDict:
          case keyframeResult of
            Just { animationHashValue, keyframeList } ->
              Map.insert animationHashValue keyframeList
                childrenKeyframesDict
            Nothing -> childrenKeyframesDict
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
  Just (Data.Animation { keyframeList, duration }) ->
    Just
      { keyframeList: keyframeList
      , animationHashValue: keyframeListToSha256HashValue keyframeList
      , duration: duration
      }
  Nothing -> Nothing

elementToHtmlElementAndStyleDict :: forall message. Data.Element message -> ElementAndStyleDict message
elementToHtmlElementAndStyleDict = case _ of
  Data.ElementText text -> textToHtmlElementAndStyleDict text
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
              , class: Nothing
              , id: Nothing
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

textToHtmlElementAndStyleDict :: forall message. Data.Text message -> ElementAndStyleDict message
textToHtmlElementAndStyleDict (Data.Text { padding, markup, text, click }) =
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
      , styleDict: Map.singleton classNameHashValue viewStyle
      , keyframesDict: Map.empty
      }

svgElementToHtmlElement :: forall message. Data.SvgElement -> Vdom.Element message
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
