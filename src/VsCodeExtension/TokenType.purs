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

derive instance eqTokenType :: Prelude.Eq TokenType

derive instance ordTokenType :: Prelude.Ord TokenType

instance showTokenType :: Prelude.Show TokenType where
  show tokenType = toString tokenType

useTokenTypesAsStringArray :: Array String
useTokenTypesAsStringArray = Prelude.map toString useTokenTypes

useTokenTypes :: Array TokenType
useTokenTypes = [ TokenTypeNamespace, TokenTypeVariable, TokenTypeString, TokenTypeNumber ]

toString :: TokenType -> String
toString = case _ of
  TokenTypeNamespace -> "namespace"
  TokenTypeVariable -> "variable"
  TokenTypeString -> "string"
  TokenTypeNumber -> "number"

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
tokenDataToData (Range.Position { line: beforeLine, character: beforeCharacter }) (TokenData { tokenType, start: Range.Position { line, character }, length }) =
  [ UInt.toInt (Prelude.sub line beforeLine)
  , if Prelude.eq line beforeLine then
      UInt.toInt (Prelude.sub character beforeCharacter)
    else
      UInt.toInt character
  , UInt.toInt length
  , tokenTypeToInt tokenType
  , 0
  ]
