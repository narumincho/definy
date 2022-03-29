module VsCodeExtension.TokenType
  ( TokenData(..)
  , TokenType(..)
  , tokenDataToData
  , useTokenTypes
  , useTokenTypesAsStringArray
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.UInt as UInt
import Prelude as Prelude
import VsCodeExtension.Range as Range

data TokenType
  = TokenTypeNamespace
  | TokenTypeVariable
  | TokenTypeString
  | TokenTypeNumber
  | TokenTypeFunction

derive instance eqTokenType :: Prelude.Eq TokenType

derive instance ordTokenType :: Prelude.Ord TokenType

instance showTokenType :: Prelude.Show TokenType where
  show tokenType = toString tokenType

useTokenTypesAsStringArray :: Array String
useTokenTypesAsStringArray = Prelude.map toString useTokenTypes

useTokenTypes :: Array TokenType
useTokenTypes =
  [ TokenTypeNamespace
  , TokenTypeVariable
  , TokenTypeString
  , TokenTypeNumber
  , TokenTypeFunction
  ]

toString :: TokenType -> String
toString = case _ of
  TokenTypeNamespace -> "namespace"
  TokenTypeVariable -> "variable"
  TokenTypeString -> "string"
  TokenTypeNumber -> "number"
  TokenTypeFunction -> "function"

tokenTypeToInt :: TokenType -> Int
tokenTypeToInt tokenType = case Array.elemIndex tokenType useTokenTypes of
  Just id -> id
  Nothing -> 0

newtype TokenData
  = TokenData
  { tokenType :: TokenType
  , start :: Range.Position
  , length :: UInt.UInt
  }

instance showTokenData :: Prelude.Show TokenData where
  show (TokenData rec) = Prelude.show rec

tokenDataToData :: Range.Position -> TokenData -> Array Int
tokenDataToData beforePosition (TokenData { tokenType, start: startPosition, length }) =
  [ UInt.toInt
      ( Prelude.sub
          (Range.positionLine startPosition)
          (Range.positionLine beforePosition)
      )
  , if Prelude.eq
      (Range.positionLine startPosition)
      (Range.positionLine beforePosition) then
      UInt.toInt
        ( Prelude.sub
            (Range.positionCharacter startPosition)
            (Range.positionCharacter beforePosition)
        )
    else
      UInt.toInt (Range.positionCharacter startPosition)
  , UInt.toInt length
  , tokenTypeToInt tokenType
  , 0
  ]
