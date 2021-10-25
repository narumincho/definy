module Css
  ( Declaration
  , Selector(..)
  , StatementList(..)
  , Keyframes(..)
  , Keyframe(..)
  , Rule(..)
  , ruleListToString
  , widthRem
  , widthPercent
  , heightRem
  , height100Percent
  , boxSizingBorderBox
  , displayGrid
  , margin0
  , alignItems
  , AlignItemsValue(..)
  , backgroundColor
  , declarationListToString
  , keyFrameToString
  , declarationProperty
  , declarationValue
  , gridAutoFlow
  , ColumnOrRow(..)
  , gap
  , padding
  , overflowHidden
  , textDecorationNone
  , gridTemplateColumns
  , animation
  , color
  , lineHeight
  , justifySelfCenter
  , objectFitConver
  , transformScale
  ) where

import Color as Color
import Data.Array as Array
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude

newtype Declaration
  = Declaration
  { property :: String
  , value :: String
  }

-- | 宣言のプロパティ名を取得する
declarationProperty :: Declaration -> String
declarationProperty (Declaration { property }) = property

declarationValue :: Declaration -> String
declarationValue (Declaration { value }) = value

data Selector
  = Class
    { className :: NonEmptyString.NonEmptyString
    , isHover :: Boolean
    }
  | Type
    { elementName :: NonEmptyString.NonEmptyString
    }

newtype Rule
  = Rule
  { selector :: Selector
  , declarationList :: Array Declaration
  }

declarationToString :: Declaration -> String
declarationToString (Declaration { property, value }) =
  String.joinWith
    ""
    [ property, ":", value, ";" ]

-- | style 属性に直接指定するときに使う
declarationListToString :: Array Declaration -> String
declarationListToString declarationList =
  String.joinWith ""
    (Prelude.map declarationToString declarationList)

ruleToString :: Rule -> String
ruleToString (Rule { selector, declarationList }) =
  String.joinWith ""
    [ selectorToString selector
    , "{"
    , declarationListToString declarationList
    , "}"
    ]

selectorToString :: Selector -> String
selectorToString = case _ of
  Type { elementName } -> NonEmptyString.toString elementName
  Class { className, isHover } ->
    String.joinWith ""
      [ "."
      , NonEmptyString.toString className
      , if isHover then ":hover" else ""
      ]

newtype StatementList
  = StatementList
  { keyframesList :: Array Keyframes
  , ruleList :: Array Rule
  }

newtype Keyframes
  = Keyframes
  { name :: NonEmptyString.NonEmptyString
  , keyframeList :: Array Keyframe
  }

newtype Keyframe
  = Keyframe
  { percentage :: Number
  , declarationList :: Array Declaration
  }

ruleListToString :: StatementList -> String
ruleListToString (StatementList { ruleList, keyframesList }) =
  Prelude.append
    (String.joinWith "" (Prelude.map ruleToString ruleList))
    (String.joinWith "" (Prelude.map keyFramesToString keyframesList))

keyFramesToString :: Keyframes -> String
keyFramesToString (Keyframes { name, keyframeList }) =
  String.joinWith ""
    [ "@keyframes "
    , NonEmptyString.toString name
    , "{"
    , String.joinWith "" (Prelude.map keyFrameToString keyframeList)
    , "}"
    ]

keyFrameToString :: Keyframe -> String
keyFrameToString (Keyframe { percentage, declarationList }) =
  String.joinWith ""
    [ Prelude.show percentage
    , "% "
    , "{"
    , declarationListToString declarationList
    , "}"
    ]

widthRem :: Number -> Declaration
widthRem value =
  Declaration
    { property: "width"
    , value: remValueToCssValue (value)
    }

widthPercent :: Number -> Declaration
widthPercent value =
  Declaration
    { property: "width"
    , value: Prelude.append (Prelude.show value) "%"
    }

heightRem :: Number -> Declaration
heightRem value =
  Declaration
    { property: "height"
    , value: remValueToCssValue (value)
    }

height100Percent :: Declaration
height100Percent =
  Declaration
    { property: "height"
    , value: "100%"
    }

boxSizingBorderBox :: Declaration
boxSizingBorderBox =
  Declaration
    { property: "box-sizing"
    , value: "border-box"
    }

displayGrid :: Declaration
displayGrid =
  Declaration
    { property: "display"
    , value: "grid"
    }

margin0 :: Declaration
margin0 =
  Declaration
    { property: "margin"
    , value: "0"
    }

remValueToCssValue :: Number -> String
remValueToCssValue value = Prelude.append (Prelude.show value) "rem"

data AlignItemsValue
  = Stretch
  | Center
  | Start

alignItems :: AlignItemsValue -> Declaration
alignItems value =
  Declaration
    { property: "align-items"
    , value:
        case value of
          Stretch -> "stretch"
          Center -> "center"
          Start -> "start"
    }

backgroundColor :: Color.Color -> Declaration
backgroundColor value =
  Declaration
    { property: "background-color"
    , value: Color.toHexString value
    }

data ColumnOrRow
  = Column
  | Row

gridAutoFlow :: ColumnOrRow -> Declaration
gridAutoFlow columnOrRow =
  Declaration
    { property: "grid-auto-flow"
    , value:
        case columnOrRow of
          Column -> "column"
          Row -> "row"
    }

gap :: Number -> Declaration
gap gapValue =
  Declaration
    { property: "gap"
    , value: Prelude.append (Prelude.show gapValue) "px"
    }

padding :: { topBottom :: Number, leftRight :: Number } -> Declaration
padding { topBottom, leftRight } =
  Declaration
    { property: "padding"
    , value:
        String.joinWith ""
          [ Prelude.show topBottom
          , "px "
          , Prelude.show leftRight
          , "px"
          ]
    }

overflowHidden :: Declaration
overflowHidden =
  Declaration
    { property: "overflow"
    , value: "hidden"
    }

textDecorationNone :: Declaration
textDecorationNone =
  Declaration
    { property: "text-decoration", value: "none" }

gridTemplateColumns :: Int -> Declaration
gridTemplateColumns oneFrCount =
  Declaration
    { property: "grid-template-columns"
    , value:
        String.joinWith " "
          (Array.replicate oneFrCount "1fr")
    }

animation :: NonEmptyString.NonEmptyString -> Number -> Declaration
animation animationName duration =
  Declaration
    { property: "animation"
    , value:
        String.joinWith " "
          [ NonEmptyString.toString animationName
          , Prelude.append (Prelude.show duration) "ms"
          ]
    }

color :: Color.Color -> Declaration
color value =
  Declaration
    { property: "color"
    , value: Color.toHexString value
    }

lineHeight :: Int -> Declaration
lineHeight value =
  Declaration
    { property: "line-height"
    , value: Prelude.show value
    }

justifySelfCenter :: Declaration
justifySelfCenter =
  Declaration
    { property: "justify-self"
    , value: "center"
    }

objectFitConver :: Declaration
objectFitConver =
  Declaration
    { property: "object-fit"
    , value: "cover"
    }

transformScale :: Number -> Declaration
transformScale value =
  Declaration
    { property: "transform", value: String.joinWith "" [ "scale(", Prelude.show value, ")" ] }
