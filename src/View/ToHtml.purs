module View.ToHtml (viewToHtmlOption) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Hash as Hash
import Html.Data as HtmlData
import Html.Wellknown as HtmlWellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as Data

-- | View から HtmlOption に変換する
viewToHtmlOption :: forall message. StructuredUrl.PathAndSearchParams -> Data.View message -> HtmlData.HtmlOption
viewToHtmlOption scriptPath (Data.View view) =
  let
    htmlElementAndStyleDict :: HtmlElementAndStyleDict
    htmlElementAndStyleDict = boxToHtmlElementAndStyleDict view.box
  in
    HtmlData.HtmlOption
      { pageName: view.pageName
      , appName: view.appName
      , description: view.description
      , themeColor: view.themeColor
      , iconPath: view.iconPath
      , language: view.language
      , coverImagePath: view.coverImagePath
      , path: Maybe.Just view.path
      , origin: view.origin
      , style:
          htmlElementAndStyleDictToCssStatementList htmlElementAndStyleDict
      , scriptPath: Maybe.Just scriptPath
      , bodyChildren: [ htmlElementAndStyleDictHtmlElement htmlElementAndStyleDict ]
      , bodyClass: Maybe.Nothing
      }

htmlElementAndStyleDictToCssStatementList :: HtmlElementAndStyleDict -> Css.StatementList
htmlElementAndStyleDictToCssStatementList htmlElementAndStyleDict =
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
              ( Map.toUnfoldable
                  (htmlElementAndStyleDictStyleDict htmlElementAndStyleDict)
              )
          ]
    , keyframesList:
        Prelude.map
          ( \(Tuple.Tuple hashValue keyframeList) ->
              Css.Keyframes
                { name: sha256HashValueToAnimationName hashValue
                , keyframeList
                }
          )
          (Map.toUnfoldable (htmlElementAndStyleDictKeyframesDict htmlElementAndStyleDict))
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

newtype HtmlElementAndStyleDict
  = HtmlElementAndStyleDict
  { htmlElement :: HtmlData.RawHtmlElement
  , styleDict :: Map.Map Hash.Sha256HashValue ViewStyle
  , keyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
  }

htmlElementAndStyleDictStyleDict :: HtmlElementAndStyleDict -> Map.Map Hash.Sha256HashValue ViewStyle
htmlElementAndStyleDictStyleDict (HtmlElementAndStyleDict { styleDict }) = styleDict

htmlElementAndStyleDictHtmlElement :: HtmlElementAndStyleDict -> HtmlData.RawHtmlElement
htmlElementAndStyleDictHtmlElement (HtmlElementAndStyleDict { htmlElement }) = htmlElement

htmlElementAndStyleDictKeyframesDict :: HtmlElementAndStyleDict -> Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
htmlElementAndStyleDictKeyframesDict (HtmlElementAndStyleDict { keyframesDict }) = keyframesDict

boxToHtmlElementAndStyleDict :: forall message. Data.Box message -> HtmlElementAndStyleDict
boxToHtmlElementAndStyleDict box@( Data.Box
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

    className = viewStyleToSha256HashValue viewStyle

    children :: Array HtmlElementAndStyleDict
    children = Prelude.map elementToHtmlElementAndStyleDict boxRecord.children
  in
    HtmlElementAndStyleDict
      { htmlElement:
          ( case boxRecord.url of
              Maybe.Just _ -> HtmlWellknown.a
              Maybe.Nothing -> HtmlWellknown.div
          )
            ( Map.fromFoldable
                ( Array.concat
                    [ [ sha256HashValueToClassAttributeNameAndValue className ]
                    , case boxRecord.url of
                        Maybe.Just url ->
                          [ Tuple.Tuple
                              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "href"))
                              ( Maybe.Just
                                  ( NonEmptyString.toString
                                      (StructuredUrl.toString url)
                                  )
                              )
                          ]
                        Maybe.Nothing -> []
                    ]
                )
            )
            (HtmlData.ElementList (Prelude.map htmlElementAndStyleDictHtmlElement children))
      , styleDict:
          Map.insert className viewStyle
            (Map.fromFoldable (Array.concatMap (\c -> Map.toUnfoldable (htmlElementAndStyleDictStyleDict c)) children))
      , keyframesDict:
          let
            childrenKeyframesDict :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
            childrenKeyframesDict =
              Map.fromFoldable
                (Array.concatMap (\c -> Map.toUnfoldable (htmlElementAndStyleDictKeyframesDict c)) children)
          in
            case keyframeResult of
              Maybe.Just { animationHashValue, keyframeList } ->
                Map.insert animationHashValue keyframeList
                  childrenKeyframesDict
              Maybe.Nothing -> childrenKeyframesDict
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

elementToHtmlElementAndStyleDict :: forall message. Data.Element message -> HtmlElementAndStyleDict
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

      className = viewStyleToSha256HashValue viewStyle
    in
      HtmlElementAndStyleDict
        { htmlElement:
            markupToTagName markup
              (Map.fromFoldable ([ sha256HashValueToClassAttributeNameAndValue className ]))
              (HtmlData.Text text)
        , styleDict: Map.singleton className viewStyle
        , keyframesDict: Map.empty
        }
  Data.SvgElement
    { height
  , isJustifySelfCenter
  , svg: Data.Svg { viewBox, svgElementList }
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
      HtmlElementAndStyleDict
        { htmlElement:
            HtmlWellknown.svg
              ( Map.fromFoldable
                  [ Tuple.Tuple
                      (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "viewBox"))
                      ( Maybe.Just
                          (viewBoxToViewBoxAttributeValue viewBox)
                      )
                  , sha256HashValueToClassAttributeNameAndValue (className)
                  ]
              )
              (HtmlData.ElementList (Prelude.map svgElementToHtmlElement svgElementList))
        , styleDict: Map.singleton className viewStyle
        , keyframesDict: Map.empty
        }
  Data.Image { width, height, path } ->
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

      className = viewStyleToSha256HashValue viewStyle
    in
      HtmlElementAndStyleDict
        { htmlElement:
            HtmlWellknown.img
              ( Map.fromFoldable
                  [ Tuple.Tuple
                      (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "src"))
                      (Maybe.Just (NonEmptyString.toString (StructuredUrl.pathAndSearchParamsToString path)))
                  , sha256HashValueToClassAttributeNameAndValue className
                  ]
              )
        , styleDict: Map.singleton className viewStyle
        , keyframesDict: Map.empty
        }
  Data.BoxElement element -> boxToHtmlElementAndStyleDict element

markupToTagName :: Data.TextMarkup -> Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) → HtmlData.HtmlChildren → HtmlData.RawHtmlElement
markupToTagName = case _ of
  Data.None -> HtmlWellknown.div
  Data.Heading1 -> HtmlWellknown.h1
  Data.Heading2 -> HtmlWellknown.h2

viewBoxToViewBoxAttributeValue :: Data.ViewBox -> String
viewBoxToViewBoxAttributeValue (Data.ViewBox viewBox) =
  String.joinWith " "
    ( Prelude.map Prelude.show
        [ viewBox.x
        , viewBox.y
        , viewBox.width
        , viewBox.height
        ]
    )

svgElementToHtmlElement :: Data.SvgElement -> HtmlData.RawHtmlElement
svgElementToHtmlElement = case _ of
  Data.Path { pathText, fill } ->
    HtmlWellknown.svgPath
      ( Map.fromFoldable
          [ Tuple.Tuple
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "d"))
              (Maybe.Just pathText)
          , Tuple.Tuple
              (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "fill"))
              (Maybe.Just fill)
          ]
      )
  Data.G { transform, svgElementList } ->
    HtmlWellknown.svgG
      ( Map.singleton
          (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "transform"))
          (Maybe.Just (String.joinWith "" transform))
      )
      (Prelude.map svgElementToHtmlElement svgElementList)

sha256HashValueToClassAttributeNameAndValue :: Hash.Sha256HashValue -> Tuple.Tuple NonEmptyString.NonEmptyString (Maybe.Maybe String)
sha256HashValueToClassAttributeNameAndValue sha256HashValue =
  Tuple.Tuple
    (NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "class"))
    (Maybe.Just (NonEmptyString.toString (sha256HashValueToClassName sha256HashValue)))

sha256HashValueToClassName :: Hash.Sha256HashValue -> NonEmptyString.NonEmptyString
sha256HashValueToClassName sha256HashValue =
  NonEmptyString.prependString
    "nv_"
    (Hash.toNonEmptyString sha256HashValue)

sha256HashValueToAnimationName :: Hash.Sha256HashValue -> NonEmptyString.NonEmptyString
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
