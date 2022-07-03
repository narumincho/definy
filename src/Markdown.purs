module Markdown
  ( Block(..)
  , InlineBlock(..)
  , Markdown(..)
  , append
  , countMaxLengthGraveAccent
  , join
  , toMarkdownString
  ) where

import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Prelude as Prelude
import StructuredUrl (StructuredUrl)
import StructuredUrl as StructuredUrl
import Util as Util
import VsCodeExtension.Command as VscodeCommand

newtype Markdown
  = Markdown (Array Block)

append :: Markdown -> Markdown -> Markdown
append (Markdown a) (Markdown b) = Markdown (Prelude.append a b)

join :: Array Markdown -> Markdown
join list = Markdown (Array.concatMap (\(Markdown m) -> m) list)

data Block
  = Paragraph NonEmptyString
  | Header2 NonEmptyString
  | CodeBlock String
  | ListItem NonEmptyString
  | Raw String
  | ParagraphWithLineBlock (NonEmptyArray InlineBlock)

data InlineBlock
  = PlanText NonEmptyString
  | Italic NonEmptyString
  | Link (NonEmptyArray InlineBlock) StructuredUrl
  | LinkVSCodeCommand (NonEmptyArray InlineBlock) VscodeCommand.Command

toMarkdownString :: Markdown -> String
toMarkdownString (Markdown blockList) =
  Prelude.append
    (String.joinWith "\n\n" (Prelude.map blockToString blockList))
    "\n"

blockToString :: Block -> String
blockToString = case _ of
  Paragraph str -> escape (NonEmptyString.toString str)
  Header2 value ->
    Prelude.append "## "
      (escape (NonEmptyString.toString value))
  CodeBlock code ->
    let
      startOrEndGraveAccent =
        String.fromCodePointArray
          ( Array.replicate
              ( UInt.toInt
                  ( Prelude.max
                      (Prelude.add (countMaxLengthGraveAccent code) (UInt.fromInt 1))
                      (UInt.fromInt 3)
                  )
              )
              (String.codePointFromChar '`')
          )
    in
      String.joinWith ""
        [ startOrEndGraveAccent
        , "\n"
        , code
        , "\n"
        , startOrEndGraveAccent
        ]
  ListItem str -> Prelude.append "- " (escape (NonEmptyString.toString str))
  Raw value -> value
  ParagraphWithLineBlock inlineBlocks ->
    String.joinWith ""
      ( NonEmptyArray.toArray
          (Prelude.map inlineBlockToString inlineBlocks)
      )

inlineBlockToString :: InlineBlock -> String
inlineBlockToString = case _ of
  PlanText str -> escape (NonEmptyString.toString str)
  Italic str ->
    Util.append3
      "*"
      (escape (NonEmptyString.toString str))
      "*"
  Link blocks url ->
    String.joinWith ""
      [ "["
      , String.joinWith ""
          ( NonEmptyArray.toArray
              (Prelude.map inlineBlockToString blocks)
          )
      , "]("
      , NonEmptyString.toString (StructuredUrl.toNonEmptyString url)
      , ")"
      ]
  LinkVSCodeCommand blocks command ->
    String.joinWith ""
      [ "["
      , String.joinWith ""
          ( NonEmptyArray.toArray
              (Prelude.map inlineBlockToString blocks)
          )
      , "]("
      , NonEmptyString.toString (VscodeCommand.commandToCommandUri command)
      , ")"
      ]

-- | markdown の特殊文字をエスケープする
-- | **sorena** → \*\*sorena\*\*
escape :: String -> String
escape str =
  ( String.replaceAll
      (String.Pattern "~")
      (String.Replacement "\\~")
      ( String.replaceAll
          (String.Pattern "*")
          (String.Replacement "\\*")
          ( String.replaceAll
              (String.Pattern "\n")
              (String.Replacement " ")
              ( String.replaceAll
                  (String.Pattern "\\")
                  (String.Replacement "\\\\")
                  str
              )
          )
      )
  )

countMaxLengthGraveAccent :: String -> UInt.UInt
countMaxLengthGraveAccent str =
  getMaxValue
    ( Array.foldl
        ( \maxAndValue codePoint ->
            if Prelude.eq (String.codePointFromChar '`') codePoint then
              addValue maxAndValue
            else
              resetValue maxAndValue
        )
        zero
        (String.toCodePointArray str)
    )

data MaxAndValue
  = Max UInt.UInt {- 最大記録更新中 -}
  | NotMax { max :: UInt.UInt, value :: UInt.UInt }

zero :: MaxAndValue
zero = Max (UInt.fromInt 0)

resetValue :: MaxAndValue -> MaxAndValue
resetValue = case _ of
  Max value -> NotMax { value: UInt.fromInt 0, max: value }
  NotMax { max } -> NotMax { value: UInt.fromInt 0, max }

addValue :: MaxAndValue -> MaxAndValue
addValue = case _ of
  Max value -> Max (Prelude.add value (UInt.fromInt 1))
  NotMax { max, value } ->
    let
      nextValue = Prelude.add value (UInt.fromInt 1)
    in
      if Prelude.(<) max nextValue then
        Max nextValue
      else
        NotMax { max, value: nextValue }

getMaxValue :: MaxAndValue -> UInt.UInt
getMaxValue = case _ of
  Max value -> value
  NotMax { max } -> max
