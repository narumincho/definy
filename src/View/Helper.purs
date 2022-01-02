module View.Helper
  ( Animation(..)
  , BoxHoverStyle(..)
  , PercentageOrRem(..)
  , TextMarkup(..)
  , boxX
  , boxY
  , code
  , div
  , divText
  , image
  , inlineAnchor
  , span
  , svg
  , text
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Hash as Hash
import Option as Option
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util
import Vdom.PatchState as PatchState
import View.Data as Data
import View.StyleDict as StyleDict

type ImageRequired
  = ( path :: StructuredUrl.PathAndSearchParams
    , width :: PercentageOrRem
    , height :: Number
    , alternativeText :: String
    )

data PercentageOrRem
  = Rem Number
  | Percentage Number

type BoxOptional message location
  = ( gap :: Number
    , paddingTopBottom :: Number
    , paddingLeftRight :: Number
    , height :: Number
    , backgroundColor :: Color.Color
    , gridTemplateColumns1FrCount :: Int
    , link :: Data.Link message location
    , hover :: BoxHoverStyle
    , scrollX :: Boolean
    , scrollY :: Boolean
    )

newtype BoxData message location
  = BoxData
  { gap :: Number
  , paddingTopBottom :: Number
  , paddingLeftRight :: Number
  , height :: Maybe Number
  , backgroundColor :: Maybe Color.Color
  , gridTemplateColumns1FrCount :: Maybe Int
  , link :: Maybe (Data.Link message location)
  , hover :: BoxHoverStyle
  , scrollX :: Boolean
  , scrollY :: Boolean
  }

newtype BoxHoverStyle
  = BoxHoverStyle
  { animation :: Maybe Animation
  }

newtype Animation
  = Animation
  { keyframeList :: Array Css.Keyframe
  , {- アニメーションする時間. 単位は ms */ -} duration :: Number
  }

data XOrY
  = X
  | Y

-- | 縦方向に box を配置する
boxY ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (BoxOptional message location) =>
  Record r ->
  (Array (Data.Element message location)) ->
  Data.Element message location
boxY option children = boxXOrYToElement (boxOptionalToBoxData option) children Y

-- | 横方向に box を配置する
boxX ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (BoxOptional message location) =>
  Record r ->
  (Array (Data.Element message location)) ->
  Data.Element message location
boxX option children = boxXOrYToElement (boxOptionalToBoxData option) children X

boxOptionalToBoxData ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (BoxOptional message location) =>
  Record r -> BoxData message location
boxOptionalToBoxData rec =
  let
    maybeRecord =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (BoxOptional message location))
        rec
  in
    BoxData
      { gap:
          case maybeRecord.gap of
            Just gap -> gap
            Nothing -> 0.0
      , paddingTopBottom:
          case maybeRecord.paddingTopBottom of
            Just paddingTopBottom -> paddingTopBottom
            Nothing -> 0.0
      , paddingLeftRight:
          case maybeRecord.paddingLeftRight of
            Just paddingLeftRight -> paddingLeftRight
            Nothing -> 0.0
      , height: maybeRecord.height
      , backgroundColor: maybeRecord.backgroundColor
      , gridTemplateColumns1FrCount: maybeRecord.gridTemplateColumns1FrCount
      , link: maybeRecord.link
      , hover:
          case maybeRecord.hover of
            Just hover -> hover
            Nothing -> BoxHoverStyle { animation: Nothing }
      , scrollX:
          case maybeRecord.scrollX of
            Just scrollX -> scrollX
            Nothing -> false
      , scrollY:
          case maybeRecord.scrollY of
            Just scrollY -> scrollY
            Nothing -> false
      }

boxXOrYToElement ::
  forall message location.
  BoxData message location ->
  Array (Data.Element message location) ->
  XOrY ->
  Data.Element message location
boxXOrYToElement boxData@(BoxData rec) children xOrY =
  let
    style :: Data.ViewStyle
    style = boxToBoxViewStyle boxData xOrY

    vdomChildren :: Data.ElementListOrText message location
    vdomChildren = case NonEmptyArray.fromArray children of
      Just nonEmptyVdomChildren ->
        Data.ElementListOrTextElementList
          ( NonEmptyArray.mapWithIndex
              ( \index element ->
                  Data.KeyAndElement
                    { key: (Prelude.show index)
                    , element: element
                    }
              )
              nonEmptyVdomChildren
          )
      Nothing -> Data.ElementListOrTextText ""
  in
    case rec.link of
      Just (Data.LinkSameOrigin location) ->
        Data.ElementSameOriginAnchor
          { style
          , anchor:
              Data.SameOriginAnchor
                { id: Nothing
                , href: location
                , children: vdomChildren
                }
          }
      Just (Data.LinkExternal url) ->
        Data.ElementExternalLinkAnchor
          { style
          , anchor:
              Data.ExternalLinkAnchor
                { id: Nothing
                , href: url
                , children: vdomChildren
                }
          }
      Nothing ->
        Data.ElementDiv
          { style
          , div:
              Data.Div
                { id: Nothing
                , click: Nothing
                , children: vdomChildren
                }
          }

boxToBoxViewStyle ::
  forall message location.
  BoxData message location ->
  XOrY ->
  Data.ViewStyle
boxToBoxViewStyle boxData@(BoxData rec) direction =
  let
    keyframeResult = boxGetKeyframeListAndAnimationName boxData
  in
    Data.ViewStyle
      { normal:
          Array.concat
            [ [ Css.boxSizingBorderBox
              , Css.displayGrid
              , Css.gridAutoFlow case direction of
                  X -> Css.Column
                  Y -> Css.Row
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
      , animation:
          case keyframeResult of
            Just animationHashValue ->
              Map.singleton
                animationHashValue.animationHashValue
                animationHashValue.keyframeList
            Nothing -> Map.empty
      }

boxGetKeyframeListAndAnimationName ::
  forall message location.
  BoxData message location ->
  Maybe
    { keyframeList :: Array Css.Keyframe
    , animationHashValue :: Hash.Sha256HashValue
    , duration :: Number
    }
boxGetKeyframeListAndAnimationName (BoxData rec) = case rec.hover of
  (BoxHoverStyle { animation: Just (Animation { keyframeList, duration }) }) ->
    Just
      { keyframeList: keyframeList
      , animationHashValue: keyframeListToSha256HashValue keyframeList
      , duration: duration
      }
  _ -> Nothing

keyframeListToSha256HashValue :: Array Css.Keyframe -> Hash.Sha256HashValue
keyframeListToSha256HashValue keyframeList =
  Hash.stringToSha256HashValue
    (String.joinWith "!" (Prelude.map Css.keyFrameToString keyframeList))

type TextOptional message
  = ( markup :: TextMarkup
    , padding :: Number
    , click :: message
    )

data TextMarkup
  = None
  | Heading1
  | Heading2
  | Code

text ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (TextOptional message) =>
  Record r -> String -> Data.Element message location
text option textValue =
  let
    rec =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (TextOptional message))
        option

    paddingValue = case rec.padding of
      Just v -> v
      Nothing -> 0.0

    style =
      Data.ViewStyle
        { normal:
            [ Css.color Color.white
            , Css.padding { leftRight: paddingValue, topBottom: paddingValue }
            , Css.margin0
            ]
        , hover: []
        , animation: Map.empty
        }

    clickMessageData :: Maybe (PatchState.ClickMessageData message)
    clickMessageData =
      Prelude.map
        ( \message ->
            PatchState.clickMessageFrom
              { stopPropagation: false
              , message
              , url: Nothing
              }
        )
        rec.click
  in
    case rec.markup of
      Just None ->
        Data.ElementDiv
          { style
          , div:
              Data.Div
                { children: Data.ElementListOrTextText textValue
                , click: clickMessageData
                , id: Nothing
                }
          }
      Just Heading1 ->
        Data.ElementHeading1
          { style
          , heading1:
              Data.Heading1
                { children: Data.ElementListOrTextText textValue
                , click: clickMessageData
                , id: Nothing
                }
          }
      Just Heading2 ->
        Data.ElementHeading2
          { style
          , heading2:
              Data.Heading2
                { children: Data.ElementListOrTextText textValue
                , click: clickMessageData
                , id: Nothing
                }
          }
      Just Code ->
        Data.ElementCode
          { style
          , code:
              Data.Code
                { children: Data.ElementListOrTextText textValue
                , click: clickMessageData
                , id: Nothing
                }
          }
      Nothing ->
        Data.ElementDiv
          { style
          , div:
              Data.Div
                { children: Data.ElementListOrTextText textValue
                , click: clickMessageData
                , id: Nothing
                }
          }

type ImageOptional
  = ( objectFit :: Css.ObjectFitValue )

image ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ImageRequired
    ImageOptional =>
  Record r -> Data.Element message location
image option =
  let
    rec =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ImageRequired)
        (Proxy.Proxy :: _ ImageOptional)
        option
  in
    Data.ElementImage
      ( { style:
            Data.ViewStyle
              { normal:
                  [ percentageOrRemWidthToCssDeclaration rec.width
                  , Css.heightRem rec.height
                  , Css.objectFit
                      ( case rec.objectFit of
                          Just objectFit -> objectFit
                          Nothing -> Css.Cover
                      )
                  ]
              , hover: []
              , animation: Map.empty
              }
        , image:
            Data.Image
              { path: rec.path
              , alternativeText: rec.alternativeText
              }
        }
      )

svg :: forall message location. { height :: Number, isJustifySelfCenter :: Boolean, width :: PercentageOrRem, svg :: Data.Svg } -> Data.Element message location
svg rec =
  Data.ElementSvg
    { style:
        Data.ViewStyle
          { normal:
              Array.concat
                [ [ percentageOrRemWidthToCssDeclaration rec.width
                  , Css.heightRem rec.height
                  ]
                , if rec.isJustifySelfCenter then
                    [ Css.justifySelfCenter ]
                  else
                    []
                ]
          , hover: []
          , animation: Map.empty
          }
    , svg: rec.svg
    }

div :: forall message location. { style :: Data.ViewStyle } -> Array (Data.Element message location) -> Data.Element message location
div { style } children =
  Data.ElementDiv
    { style
    , div:
        Data.Div
          { id: Nothing
          , click: Nothing
          , children:
              case NonEmptyArray.fromArray children of
                Just nonEmptyVdomChildren ->
                  Data.ElementListOrTextElementList
                    ( NonEmptyArray.mapWithIndex
                        ( \index element ->
                            Data.KeyAndElement
                              { key: (Prelude.show index)
                              , element: element
                              }
                        )
                        nonEmptyVdomChildren
                    )
                Nothing -> Data.ElementListOrTextText ""
          }
    }

divText :: forall message location. { style :: Data.ViewStyle } -> String -> Data.Element message location
divText { style } textValue =
  Data.ElementDiv
    { style
    , div:
        Data.Div
          { id: Nothing
          , click: Nothing
          , children: Data.ElementListOrTextText textValue
          }
    }

span :: forall message location. { style :: Data.ViewStyle } -> String -> Data.Element message location
span { style } textValue =
  Data.ElementSpan
    { style
    , span:
        Data.Span
          { id: Nothing
          , click: Nothing
          , children: Data.ElementListOrTextText textValue
          }
    }

inlineAnchor ::
  forall message location.
  { style :: Data.ViewStyle, link :: Data.Link message location } ->
  String ->
  Data.Element message location
inlineAnchor { style, link } textValue = case link of
  Data.LinkSameOrigin location ->
    Data.ElementSameOriginAnchor
      { style
      , anchor:
          Data.SameOriginAnchor
            { id: Nothing
            , href: location
            , children: Data.ElementListOrTextText textValue
            }
      }
  Data.LinkExternal url ->
    Data.ElementExternalLinkAnchor
      { style
      , anchor:
          Data.ExternalLinkAnchor
            { id: Nothing
            , href: url
            , children: Data.ElementListOrTextText textValue
            }
      }

code :: forall message location. String -> Data.Element message location
code textValue =
  Data.ElementCode
    { style:
        Data.createStyle {}
          [ Css.color Color.white, Css.whiteSpacePreWrap, Css.fontSize 1.1 ]
    , code:
        Data.Code
          { children: Data.ElementListOrTextText textValue
          , click: Nothing
          , id: Nothing
          }
    }

percentageOrRemWidthToCssDeclaration :: PercentageOrRem -> Css.Declaration
percentageOrRemWidthToCssDeclaration = case _ of
  Rem value -> Css.widthRem value
  Percentage value -> Css.widthPercent value
