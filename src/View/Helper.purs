module View.Helper
  ( Animation(..)
  , BoxHoverStyle(..)
  , PercentageOrRem(..)
  , TextMarkup(..)
  , boxOptionalDefault
  , boxX
  , boxY
  , code
  , div
  , divText
  , image
  , imageOptionalDefault
  , inlineAnchor
  , span
  , svg
  , svgCircle
  , svgEllipse
  , svgG
  , svgPath
  , svgPolygon
  , svgText
  , text
  , textOptionalDefault
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Hash as Hash
import Html.Wellknown as HtmlWellknown
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.PatchState as PatchState
import View.Data as Data
import View.StyleDict as StyleDict

type ImageRequired
  = { path :: StructuredUrl.PathAndSearchParams
    , width :: PercentageOrRem
    , height :: Number
    , alternativeText :: String
    }

data PercentageOrRem
  = Rem Number
  | Percentage Number

type BoxOptional message location
  = { gap :: Number
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

boxOptionalDefault :: forall message location. BoxOptional message location
boxOptionalDefault =
  { gap: 0.0
  , paddingTopBottom: 0.0
  , paddingLeftRight: 0.0
  , height: Nothing
  , backgroundColor: Nothing
  , gridTemplateColumns1FrCount: Nothing
  , link: Nothing
  , hover: BoxHoverStyle { animation: Nothing }
  , scrollX: false
  , scrollY: false
  }

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
  forall message location.
  BoxOptional message location ->
  (Array (Data.ElementAndStyle message location)) ->
  Data.ElementAndStyle message location
boxY option children = boxXOrYToElement (boxOptionalToBoxData option) children Y

-- | 横方向に box を配置する
boxX ::
  forall message location.
  BoxOptional message location ->
  (Array (Data.ElementAndStyle message location)) ->
  Data.ElementAndStyle message location
boxX option children = boxXOrYToElement (boxOptionalToBoxData option) children X

boxOptionalToBoxData ::
  forall message location.
  BoxOptional message location -> BoxData message location
boxOptionalToBoxData rec =
  BoxData
    { gap: rec.gap
    , paddingTopBottom: rec.paddingTopBottom
    , paddingLeftRight: rec.paddingLeftRight
    , height: rec.height
    , backgroundColor: rec.backgroundColor
    , gridTemplateColumns1FrCount: rec.gridTemplateColumns1FrCount
    , link: rec.link
    , hover: rec.hover
    , scrollX: rec.scrollX
    , scrollY: rec.scrollY
    }

boxXOrYToElement ::
  forall message location.
  BoxData message location ->
  Array (Data.ElementAndStyle message location) ->
  XOrY ->
  Data.ElementAndStyle message location
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
    Data.ElementAndStyle
      { style
      , element:
          case rec.link of
            Just (Data.LinkSameOrigin location) ->
              Data.ElementSameOriginAnchor
                ( Data.SameOriginAnchor
                    { id: Nothing
                    , href: location
                    , children: vdomChildren
                    }
                )
            Just (Data.LinkExternal url) ->
              Data.ElementExternalLinkAnchor
                ( Data.ExternalLinkAnchor
                    { id: Nothing
                    , href: url
                    , children: vdomChildren
                    }
                )
            Nothing ->
              Data.ElementDiv
                ( Data.Div
                    { id: Nothing
                    , click: Nothing
                    , children: vdomChildren
                    }
                )
      , id: Nothing
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
  = { markup :: TextMarkup
    , padding :: Number
    , click :: Maybe message
    }

textOptionalDefault :: forall (message :: Type). TextOptional message
textOptionalDefault =
  { markup: None
  , padding: 0.0
  , click: Nothing
  }

data TextMarkup
  = None
  | Heading1
  | Heading2
  | Code

text ::
  forall message location.
  TextOptional message -> String -> Data.ElementAndStyle message location
text option textValue =
  let
    style =
      Data.ViewStyle
        { normal:
            [ Css.color Color.white
            , Css.padding { leftRight: option.padding, topBottom: option.padding }
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
        option.click
  in
    Data.ElementAndStyle
      { style
      , id: Nothing
      , element:
          case option.markup of
            None ->
              Data.ElementDiv
                ( Data.Div
                    { children: Data.ElementListOrTextText textValue
                    , click: clickMessageData
                    , id: Nothing
                    }
                )
            Heading1 ->
              Data.ElementHeading1
                ( Data.Heading1
                    { children: Data.ElementListOrTextText textValue
                    , click: clickMessageData
                    , id: Nothing
                    }
                )
            Heading2 ->
              Data.ElementHeading2
                ( Data.Heading2
                    { children: Data.ElementListOrTextText textValue
                    , click: clickMessageData
                    , id: Nothing
                    }
                )
            Code ->
              Data.ElementCode
                ( Data.Code
                    { children: Data.ElementListOrTextText textValue
                    , click: clickMessageData
                    , id: Nothing
                    }
                )
      }

type ImageOptional
  = { objectFit :: Css.ObjectFitValue }

imageOptionalDefault :: ImageOptional
imageOptionalDefault = { objectFit: Css.Cover }

image ::
  forall message location.
  ImageRequired ->
  ImageOptional ->
  Data.ElementAndStyle message location
image option optionOptional =
  Data.ElementAndStyle
    { style:
        Data.ViewStyle
          { normal:
              [ percentageOrRemWidthToCssDeclaration option.width
              , Css.heightRem option.height
              , Css.objectFit optionOptional.objectFit
              ]
          , hover: []
          , animation: Map.empty
          }
    , element:
        Data.ElementImage
          ( Data.Image
              { path: option.path
              , alternativeText: option.alternativeText
              }
          )
    , id: Nothing
    }

svg ::
  forall message location.
  { height :: Number
  , isJustifySelfCenter :: Boolean
  , width :: PercentageOrRem
  , svg :: Data.Svg
  } ->
  Data.ElementAndStyle message location
svg rec =
  Data.ElementAndStyle
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
    , element: Data.ElementSvg rec.svg
    , id: Nothing
    }

div ::
  forall message location.
  { style :: Data.ViewStyle } ->
  Array (Data.ElementAndStyle message location) ->
  Data.ElementAndStyle message location
div { style } children =
  Data.ElementAndStyle
    { style
    , element:
        Data.ElementDiv
          ( Data.Div
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
          )
    , id: Nothing
    }

divText :: forall message location. { style :: Data.ViewStyle } -> String -> Data.ElementAndStyle message location
divText { style } textValue =
  Data.ElementAndStyle
    { style
    , element:
        Data.ElementDiv
          ( Data.Div
              { id: Nothing
              , click: Nothing
              , children: Data.ElementListOrTextText textValue
              }
          )
    , id: Nothing
    }

span :: forall message location. { style :: Data.ViewStyle } -> String -> Data.ElementAndStyle message location
span { style } textValue =
  Data.ElementAndStyle
    { style
    , id: Nothing
    , element:
        Data.ElementSpan
          ( Data.Span
              { id: Nothing
              , click: Nothing
              , children: Data.ElementListOrTextText textValue
              }
          )
    }

inlineAnchor ::
  forall message location.
  { style :: Data.ViewStyle, link :: Data.Link message location } ->
  String ->
  Data.ElementAndStyle message location
inlineAnchor { style, link } textValue =
  Data.ElementAndStyle
    { style
    , element:
        case link of
          Data.LinkSameOrigin location ->
            Data.ElementSameOriginAnchor
              ( Data.SameOriginAnchor
                  { id: Nothing
                  , href: location
                  , children: Data.ElementListOrTextText textValue
                  }
              )
          Data.LinkExternal url ->
            Data.ElementExternalLinkAnchor
              ( Data.ExternalLinkAnchor
                  { id: Nothing
                  , href: url
                  , children: Data.ElementListOrTextText textValue
                  }
              )
    , id: Nothing
    }

code :: forall message location. String -> Data.ElementAndStyle message location
code textValue =
  Data.ElementAndStyle
    { style:
        Data.createStyle Data.styleOptionalDefault
          [ Css.color Color.white, Css.whiteSpacePreWrap, Css.fontSize 1.1 ]
    , element:
        Data.ElementCode
          ( Data.Code
              { children: Data.ElementListOrTextText textValue
              , click: Nothing
              , id: Nothing
              }
          )
    , id: Nothing
    }

percentageOrRemWidthToCssDeclaration :: PercentageOrRem -> Css.Declaration
percentageOrRemWidthToCssDeclaration = case _ of
  Rem value -> Css.widthRem value
  Percentage value -> Css.widthPercent value

svgCircle ::
  { cx :: Number
  , cy :: Number
  , r :: Number
  , fill :: Color.Color
  } ->
  Data.SvgElementAndStyle
svgCircle attribute =
  Data.SvgElementAndStyle
    { element: Data.Circle attribute
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }

svgPolygon ::
  { points :: NonEmptyArray { x :: Number, y :: Number }
  , stroke :: Color.Color
  , fill :: Color.Color
  } ->
  Data.SvgElementAndStyle
svgPolygon attribute =
  Data.SvgElementAndStyle
    { element: Data.Polygon attribute
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }

svgEllipse ::
  { cx :: Number
  , cy :: Number
  , rx :: Number
  , ry :: Number
  , fill :: Color.Color
  } ->
  Data.SvgElementAndStyle
svgEllipse attribute =
  Data.SvgElementAndStyle
    { element: Data.Ellipse attribute
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }

svgText :: { fontSize :: Number, x :: Number, y :: Number, fill :: Color.Color } -> String -> Data.SvgElementAndStyle
svgText attribute textValue =
  Data.SvgElementAndStyle
    { element:
        Data.SvgText
          ( HtmlWellknown.SvgTextAttribute
              { fontSize: attribute.fontSize
              , text: textValue
              , textAnchor: HtmlWellknown.Middle
              , x: attribute.x
              , y: attribute.y
              , fill: attribute.fill
              }
          )
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }

svgPath ::
  { pathText :: String
  , fill :: Color.Color
  } ->
  Data.SvgElementAndStyle
svgPath attribute =
  Data.SvgElementAndStyle
    { element: Data.Path attribute
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }

svgG ::
  { transform :: NonEmptyArray NonEmptyString } ->
  Array Data.SvgElementAndStyle -> Data.SvgElementAndStyle
svgG attribute children =
  Data.SvgElementAndStyle
    { element: Data.G { transform: attribute.transform, svgElementList: children }
    , id: Nothing
    , style: Data.createStyle Data.styleOptionalDefault []
    }
