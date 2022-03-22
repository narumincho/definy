module VsCodeExtension.Range
  ( Position(..)
  , Range(..)
  , isPositionInsideRange
  , positionAdd1Character
  , positionCharacter
  , positionLine
  , positionSub1Character
  , rangeEnd
  , rangeStart
  , rangeZero
  ) where

import Prelude
import Data.Argonaut as Argonaut
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.Ord as Ord
import Data.String as String
import Data.UInt as UInt

-- | 文章中の文字の位置の範囲
-- | LSP の仕様により, UTF16 での offset になる
-- | https://microsoft.github.io/language-server-protocol/specifications/specification-3-16/#textDocuments
newtype Range
  = Range { start :: Position, end :: Position }

derive instance rangeEq :: Eq Range

instance showRange :: Show Range where
  show (Range { start, end }) =
    String.joinWith "→"
      [ show start, show end ]

instance encodeJsonRange :: Argonaut.EncodeJson Range where
  encodeJson :: Range -> Argonaut.Json
  encodeJson (Range rec) = Argonaut.encodeJson rec

rangeStart :: Range -> Position
rangeStart (Range { start }) = start

rangeEnd :: Range -> Position
rangeEnd (Range { end }) = end

rangeZero :: Range
rangeZero =
  Range
    { start:
        Position
          { line: UInt.fromInt 0
          , character: UInt.fromInt 0
          }
    , end:
        Position
          { line: UInt.fromInt 0
          , character: UInt.fromInt 0
          }
    }

positionSub1Character :: Position -> Position
positionSub1Character (Position { line, character }) =
  Position
    { line
    , character:
        if eq character (UInt.fromInt 0) then
          UInt.fromInt 0
        else
          sub character (UInt.fromInt 1)
    }

newtype Position
  = Position { line :: UInt.UInt, character :: UInt.UInt }

derive instance positionEq :: Eq Position

instance positionOrd :: Ord Position where
  compare (Position { line: beforeLine, character: beforeCharacter }) (Position { line: afterLine, character: afterCharacter }) = case compare beforeLine afterLine of
    LT -> LT
    EQ -> compare beforeCharacter afterCharacter
    GT -> GT

instance showPosition :: Show Position where
  show (Position { line, character }) =
    String.joinWith ""
      [ "(", UInt.toString line, ",", UInt.toString character, ")" ]

instance encodeJsonPosition :: Argonaut.EncodeJson Position where
  encodeJson :: Position -> Argonaut.Json
  encodeJson (Position rec) =
    Argonaut.encodeJson
      { line: UInt.toInt rec.line
      , character: UInt.toInt rec.character
      }

instance decodeJsonPosition :: Argonaut.DecodeJson Position where
  decodeJson json = do
    (rec :: { line :: Int, character :: Int }) <- Argonaut.decodeJson json
    case { line: UInt.fromInt' rec.line, character: UInt.fromInt' rec.character } of
      { line: Just line, character: Just character } -> Either.Right (Position { line, character })
      {} -> Either.Left (Argonaut.TypeMismatch "position need positive integer")

positionLine :: Position -> UInt.UInt
positionLine (Position { line }) = line

positionCharacter :: Position -> UInt.UInt
positionCharacter (Position { character }) = character

positionAdd1Character :: Position -> Position
positionAdd1Character (Position rec) =
  Position
    (rec { character = add (UInt.fromInt 1) rec.character })

isPositionInsideRange :: Range -> Position -> Boolean
isPositionInsideRange (Range { start, end }) position =
  (&&)
    (Ord.lessThanOrEq start position)
    (Ord.lessThanOrEq position end)
