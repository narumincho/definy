module View.Helper
  ( PercentageOrRem(..)
  , boxX
  , boxY
  , image
  , text
  ) where

import Color as Color
import Css as Css
import Data.Maybe (Maybe(..))
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as Data
import Util as Util

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
    , hover :: Data.BoxHoverStyle
    , scrollX :: Boolean
    , scrollY :: Boolean
    )

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
boxY option children =
  let
    rec =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (BoxOptional message location))
        option
  in
    Data.BoxElement
      ( Data.Box
          { backgroundColor: rec.backgroundColor
          , children: children
          , direction: Data.Y
          , gap:
              case rec.gap of
                Just gap -> gap
                Nothing -> 0.0
          , gridTemplateColumns1FrCount: rec.gridTemplateColumns1FrCount
          , height: rec.height
          , hover:
              case rec.hover of
                Just hover -> hover
                Nothing -> boxHoverStyleNone
          , link: rec.link
          , paddingLeftRight:
              case rec.paddingLeftRight of
                Just paddingLeftRight -> paddingLeftRight
                Nothing -> 0.0
          , paddingTopBottom:
              case rec.paddingTopBottom of
                Just paddingTopBottom -> paddingTopBottom
                Nothing -> 0.0
          , scrollX:
              case rec.scrollX of
                Just scrollX -> scrollX
                Nothing -> false
          , scrollY:
              case rec.scrollY of
                Just scrollY -> scrollY
                Nothing -> false
          }
      )

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
boxX option children =
  let
    rec =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (BoxOptional message location))
        option
  in
    Data.BoxElement
      ( Data.Box
          { backgroundColor: rec.backgroundColor
          , children: children
          , direction: Data.X
          , gap:
              case rec.gap of
                Just gap -> gap
                Nothing -> 0.0
          , gridTemplateColumns1FrCount: rec.gridTemplateColumns1FrCount
          , height: rec.height
          , hover:
              case rec.hover of
                Just hover -> hover
                Nothing -> boxHoverStyleNone
          , link: rec.link
          , paddingLeftRight:
              case rec.paddingLeftRight of
                Just paddingLeftRight -> paddingLeftRight
                Nothing -> 0.0
          , paddingTopBottom:
              case rec.paddingTopBottom of
                Just paddingTopBottom -> paddingTopBottom
                Nothing -> 0.0
          , scrollX:
              case rec.scrollX of
                Just scrollX -> scrollX
                Nothing -> false
          , scrollY:
              case rec.scrollY of
                Just scrollY -> scrollY
                Nothing -> false
          }
      )

type TextOptional message
  = ( markup :: Data.TextMarkup
    , padding :: Number
    , click :: message
    )

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
  in
    Data.ElementText
      ( Data.Text
          { markup:
              case rec.markup of
                Just markup -> markup
                Nothing -> Data.None
          , padding:
              case rec.padding of
                Just padding -> padding
                Nothing -> 0.0
          , click: rec.click
          , text: textValue
          }
      )

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
              }
        , image:
            Data.Image
              { path: rec.path
              , alternativeText: rec.alternativeText
              }
        }
      )

percentageOrRemWidthToCssDeclaration :: PercentageOrRem -> Css.Declaration
percentageOrRemWidthToCssDeclaration = case _ of
  Rem value -> Css.widthRem value
  Percentage value -> Css.widthPercent value

boxHoverStyleNone :: Data.BoxHoverStyle
boxHoverStyleNone = Data.BoxHoverStyle { animation: Nothing }
