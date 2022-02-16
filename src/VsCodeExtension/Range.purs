module VsCodeExtension.Range
  ( Position(..)
  , Range(..)
  , positionAdd1Character
  ) where

import Prelude
import Data.Argonaut as Argonaut
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

newtype Position
  = Position { line :: UInt.UInt, character :: UInt.UInt }

derive instance positionEq :: Eq Position

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

positionAdd1Character :: Position -> Position
positionAdd1Character (Position rec) =
  Position
    (rec { character = add (UInt.fromInt 1) rec.character })