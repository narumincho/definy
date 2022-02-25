module VsCodeExtension.TokenType
  ( TokenData(..)
  , TokenType(..)
  , TokenTypeDict
  , TokenTypeOrNotSupportTokenType
  , createTokenTypeDictAndSupportTokenList
  , dictEmpty
  , tokenDataToData
  ) where

import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.UInt as UInt
import Prelude as Prelude
import VsCodeExtension.Range as Range

data TokenType
  = TokenTypeVariable

derive instance eqTokenType :: Prelude.Eq TokenType

derive instance ordTokenType :: Prelude.Ord TokenType

instance showTokenType :: Prelude.Show TokenType where
  show tokenType = toString tokenType

toString :: TokenType -> String
toString = case _ of
  TokenTypeVariable -> "variable"

newtype TokenTypeOrNotSupportTokenType
  = TokenTypeOrNotSupportTokenType (Maybe TokenType)

instance decodeJsonTokenType :: Argonaut.DecodeJson TokenTypeOrNotSupportTokenType where
  decodeJson json = case Argonaut.toString json of
    Just str -> case fromString str of
      Just tokenType -> Either.Right (TokenTypeOrNotSupportTokenType (Just tokenType))
      Nothing -> Either.Right (TokenTypeOrNotSupportTokenType Nothing)
    Nothing ->
      Either.Left
        (Argonaut.TypeMismatch "expect string in token type")

fromString :: String -> Maybe TokenType
fromString = case _ of
  "variable" -> Just TokenTypeVariable
  _ -> Nothing

newtype TokenTypeDict
  = TokenTypeDict (Array TokenType)

dictEmpty :: TokenTypeDict
dictEmpty = TokenTypeDict []

createTokenTypeDictAndSupportTokenList ::
  Array TokenTypeOrNotSupportTokenType ->
  { tokenTypeDict :: TokenTypeDict, supportTokenType :: Array String }
createTokenTypeDictAndSupportTokenList tokenTypeOrNotSupportTokenTypeList =
  let
    rec =
      Array.foldl
        ( \{ index, supportTokenType } (TokenTypeOrNotSupportTokenType tokenMaybe) ->
            { index: Prelude.add index (UInt.fromInt 1)
            , supportTokenType:
                case tokenMaybe of
                  Just token -> Array.snoc supportTokenType token
                  Nothing -> supportTokenType
            }
        )
        { index: UInt.fromInt 0
        , supportTokenType: []
        }
        tokenTypeOrNotSupportTokenTypeList
  in
    { tokenTypeDict: TokenTypeDict rec.supportTokenType
    , supportTokenType: Prelude.map toString rec.supportTokenType
    }

tokenTypeToInt :: TokenTypeDict -> TokenType -> Int
tokenTypeToInt (TokenTypeDict dict) tokenType = case Array.elemIndex tokenType dict of
  Just id -> id
  -- TODO クライアントが未対応のtokenは0番固定にならないように
  Nothing -> 0

newtype TokenData
  = TokenData
  { tokenType :: TokenType
  , start :: Range.Position
  , length :: UInt.UInt
  }

instance showTokenData :: Prelude.Show TokenData where
  show (TokenData rec) = Prelude.show rec

tokenDataToData :: TokenTypeDict -> Range.Position -> TokenData -> Array Int
tokenDataToData dict (Range.Position { line: beforeLine, character: beforeCharacter }) (TokenData { tokenType, start: Range.Position { line, character }, length }) =
  [ UInt.toInt (Prelude.sub line beforeLine)
  , if Prelude.eq line beforeLine then
      UInt.toInt (Prelude.sub character beforeCharacter)
    else
      UInt.toInt character
  , UInt.toInt length
  , tokenTypeToInt dict tokenType
  , 0
  ]
