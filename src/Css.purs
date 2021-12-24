module Css
  ( AlignItemsValue(..)
  , ColumnOrRow(..)
  , Declaration
  , Keyframe(..)
  , Keyframes(..)
  , ObjectFitValue(..)
  , OverflowValue(..)
  , Rule(..)
  , Selector(..)
  , StatementList(..)
  , alignItems
  , animation
  , backgroundColor
  , boxSizingBorderBox
  , color
  , declarationListToString
  , declarationProperty
  , declarationValue
  , displayGrid
  , gap
  , gridAutoFlow
  , gridTemplateColumns
  , height100Percent
  , heightRem
  , justifySelfCenter
  , keyFrameToString
  , lineHeight
  , margin0
  , objectFit
  , overflow
  , padding
  , ruleListToString
  , textDecorationNone
  , transformScale
  , whiteSpacePre
  , widthPercent
  , widthRem
  ) where

import Color as Color
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import Type.Proxy (Proxy(..))

newtype Declaration
  = Declaration
  { property :: NonEmptyString
  , value :: NonEmptyString
  }

-- | 宣言のプロパティ名を取得する
declarationProperty :: Declaration -> NonEmptyString
declarationProperty (Declaration { property }) = property

declarationValue :: Declaration -> NonEmptyString
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

declarationToString :: Declaration -> NonEmptyString
declarationToString (Declaration { property, value }) =
  Prelude.append
    ( Prelude.append
        property
        (NonEmptyString.nes (Proxy :: _ ":"))
    )
    ( Prelude.append value
        (NonEmptyString.nes (Proxy :: _ ";"))
    )

-- | style 属性に直接指定するときに使う
declarationListToString :: Array Declaration -> String
declarationListToString declarationList =
  NonEmptyString.joinWith ""
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
    { property: NonEmptyString.nes (Proxy :: _ "width")
    , value: remValueToCssValue value
    }

widthPercent :: Number -> Declaration
widthPercent value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "width")
    , value:
        NonEmptyString.prependString (Prelude.show value)
          (NonEmptyString.nes (Proxy :: _ "%"))
    }

heightRem :: Number -> Declaration
heightRem value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "height")
    , value: remValueToCssValue value
    }

height100Percent :: Declaration
height100Percent =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "height")
    , value: NonEmptyString.nes (Proxy :: _ "100%")
    }

boxSizingBorderBox :: Declaration
boxSizingBorderBox =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "box-sizing")
    , value: NonEmptyString.nes (Proxy :: _ "border-box")
    }

displayGrid :: Declaration
displayGrid =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "display")
    , value: NonEmptyString.nes (Proxy :: _ "grid")
    }

margin0 :: Declaration
margin0 =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "margin")
    , value: NonEmptyString.nes (Proxy :: _ "0")
    }

whiteSpacePre :: Declaration
whiteSpacePre =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "white-space")
    , value: NonEmptyString.nes (Proxy :: _ "pre")
    }

remValueToCssValue :: Number -> NonEmptyString
remValueToCssValue value =
  NonEmptyString.prependString
    (Prelude.show value)
    (NonEmptyString.nes (Proxy :: _ "rem"))

joinWhiteSpaceValue :: NonEmptyString -> Array NonEmptyString -> NonEmptyString
joinWhiteSpaceValue head others =
  NonEmptyString.join1With " "
    (NonEmptyArray.cons' head others)

data AlignItemsValue
  = Stretch
  | Center
  | Start

alignItems :: AlignItemsValue -> Declaration
alignItems value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "align-items")
    , value:
        case value of
          Stretch -> NonEmptyString.nes (Proxy :: _ "stretch")
          Center -> NonEmptyString.nes (Proxy :: _ "center")
          Start -> NonEmptyString.nes (Proxy :: _ "start")
    }

backgroundColor :: Color.Color -> Declaration
backgroundColor value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "background-color")
    , value: colorToNonEmptyString value
    }

data ColumnOrRow
  = Column
  | Row

gridAutoFlow :: ColumnOrRow -> Declaration
gridAutoFlow columnOrRow =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "grid-auto-flow")
    , value:
        case columnOrRow of
          Column -> NonEmptyString.nes (Proxy :: _ "column")
          Row -> NonEmptyString.nes (Proxy :: _ "row")
    }

gap :: Number -> Declaration
gap gapValue =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "gap")
    , value: remValueToCssValue gapValue
    }

padding :: { topBottom :: Number, leftRight :: Number } -> Declaration
padding { topBottom, leftRight } =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "padding")
    , value:
        joinWhiteSpaceValue
          (remValueToCssValue topBottom)
          [ remValueToCssValue leftRight ]
    }

data OverflowValue
  = Hidden
  | Visible
  | Scroll

overflow :: { x :: OverflowValue, y :: OverflowValue } -> Declaration
overflow { x, y } =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "overflow")
    , value:
        joinWhiteSpaceValue
          (overflowValueToCssValue x)
          [ overflowValueToCssValue y ]
    }

overflowValueToCssValue :: OverflowValue -> NonEmptyString
overflowValueToCssValue = case _ of
  Hidden -> NonEmptyString.nes (Proxy :: _ "hidden")
  Visible -> NonEmptyString.nes (Proxy :: _ "visible")
  Scroll -> NonEmptyString.nes (Proxy :: _ "scroll")

textDecorationNone :: Declaration
textDecorationNone =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "text-decoration")
    , value: NonEmptyString.nes (Proxy :: _ "none")
    }

gridTemplateColumns :: Int -> Declaration
gridTemplateColumns oneFrCount =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "grid-template-columns")
    , value:
        NonEmptyString.joinWith1 (NonEmptyString.nes (Proxy :: _ " "))
          (NonEmptyArray.replicate oneFrCount "1fr")
    }

animation :: NonEmptyString.NonEmptyString -> Number -> Declaration
animation animationName duration =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "animation")
    , value:
        joinWhiteSpaceValue
          (animationName)
          [ NonEmptyString.prependString (Prelude.show duration)
              (NonEmptyString.nes (Proxy :: _ "ms"))
          ]
    }

color :: Color.Color -> Declaration
color value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "color")
    , value: colorToNonEmptyString value
    }

colorToNonEmptyString :: Color.Color -> NonEmptyString
colorToNonEmptyString colorValue = case NonEmptyString.fromString (Color.toHexString colorValue) of
  Just hexString -> hexString
  Nothing -> NonEmptyString.nes (Proxy :: _ "#error")

lineHeight :: Int -> Declaration
lineHeight value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "line-height")
    , value:
        case NonEmptyString.fromString (Prelude.show value) of
          Just str -> str
          Nothing -> NonEmptyString.nes (Proxy :: _ "0")
    }

justifySelfCenter :: Declaration
justifySelfCenter =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "justify-self")
    , value: NonEmptyString.nes (Proxy :: _ "center")
    }

data ObjectFitValue
  = Contain
  | Cover

objectFit :: ObjectFitValue -> Declaration
objectFit value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "object-fit")
    , value:
        case value of
          Contain -> NonEmptyString.nes (Proxy :: _ "contain")
          Cover -> NonEmptyString.nes (Proxy :: _ "cover")
    }

transformScale :: Number -> Declaration
transformScale value =
  Declaration
    { property: NonEmptyString.nes (Proxy :: _ "transform")
    , value:
        NonEmptyString.appendString
          (NonEmptyString.nes (Proxy :: _ "scale("))
          (Prelude.append (Prelude.show value) ")")
    }
