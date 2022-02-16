module VsCodeExtension.TokenType
  ( TokenType(..)
  , TokenTypeDict
  , TokenTypeOrNotSupportTokenType
  , TokenTypeWithDict
  , createTokenTypeDictAndSupportTokenList
  , dictEmpty
  , tokenAddDict
  ) where

import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Either as Either
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.UInt as UInt
import Prelude as Prelude

data TokenType
  = TokenTypeVariable

derive instance eqTokenType :: Prelude.Eq TokenType

derive instance ordTokenType :: Prelude.Ord TokenType

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
  = TokenTypeDict (Map.Map TokenType UInt.UInt)

dictEmpty :: TokenTypeDict
dictEmpty = TokenTypeDict Map.empty

createTokenTypeDictAndSupportTokenList ::
  Array TokenTypeOrNotSupportTokenType ->
  { tokenTypeDict :: TokenTypeDict, supportTokenType :: Array String }
createTokenTypeDictAndSupportTokenList tokenTypeOrNotSupportTokenTypeList =
  let
    rec =
      Array.foldl
        ( \{ index, tokenTypeDict: TokenTypeDict dict, supportTokenType } (TokenTypeOrNotSupportTokenType tokenMaybe) ->
            { index: Prelude.add index (UInt.fromInt 1)
            , tokenTypeDict:
                case tokenMaybe of
                  Just token ->
                    TokenTypeDict
                      (Map.insert token index dict)
                  Nothing -> TokenTypeDict dict
            , supportTokenType:
                case tokenMaybe of
                  Just token -> Array.snoc supportTokenType (toString token)
                  Nothing -> supportTokenType
            }
        )
        { index: UInt.fromInt 0
        , tokenTypeDict: TokenTypeDict Map.empty
        , supportTokenType: []
        }
        tokenTypeOrNotSupportTokenTypeList
  in
    { tokenTypeDict: rec.tokenTypeDict
    , supportTokenType: rec.supportTokenType
    }

newtype TokenTypeWithDict
  = TokenTypeWithDict { tokenType :: TokenType, dict :: TokenTypeDict }

tokenAddDict :: TokenType -> TokenTypeDict -> TokenTypeWithDict
tokenAddDict tokenType dict = TokenTypeWithDict { tokenType, dict }

instance jsonEncodeTokenTypeWithDict :: Argonaut.EncodeJson TokenTypeWithDict where
  encodeJson (TokenTypeWithDict { tokenType, dict: TokenTypeDict dict }) = case Map.lookup tokenType dict of
    Just id -> Argonaut.fromNumber (UInt.toNumber id)
    -- TODO クライアントが未対応のtokenは0番固定にならないように
    Nothing -> Argonaut.encodeJson 0
