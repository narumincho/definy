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
import VsCodeExtension.VSCodeApi as VSCodeApi

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
  , start :: VSCodeApi.Position
  , length :: UInt.UInt
  }

instance showTokenData :: Prelude.Show TokenData where
  show (TokenData rec) = Prelude.show rec

tokenDataToData :: VSCodeApi.Position -> TokenData -> Array Int
tokenDataToData beforePosition (TokenData { tokenType, start: startPosition, length }) =
  [ UInt.toInt
      ( Prelude.sub
          (VSCodeApi.positionGetLine startPosition)
          (VSCodeApi.positionGetLine beforePosition)
      )
  , if Prelude.eq
      (VSCodeApi.positionGetLine startPosition)
      (VSCodeApi.positionGetLine beforePosition) then
      UInt.toInt
        ( Prelude.sub
            (VSCodeApi.positionGetCharacter startPosition)
            (VSCodeApi.positionGetCharacter beforePosition)
        )
    else
      UInt.toInt (VSCodeApi.positionGetCharacter startPosition)
  , UInt.toInt length
  , tokenTypeToInt tokenType
  , 0
  ]
