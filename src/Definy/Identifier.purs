module Definy.Identifier
  ( AccountName
  , Identifier
  , accountNameFromNonEmptyString
  , class CheckValidChar
  , class CheckValidCharTail 
  , fromSymbolProxy
  , identifierFromNonEmptyString
  , identifierFromString
  , identifierToNonEmptyString
  , identifierToString
  )
  where

import Data.Either as Either
import Data.Maybe (Maybe(..)) 
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags
import Data.Symbol as Symbol
import Identifier as Identifier
import Prelude as Prelude
import Prim.Symbol as PrimSymbol
import Prim.TypeError as TypeError
import Type.Data.List as TList
import Type.Data.Peano as PeanoNat
import Type.Proxy (Proxy(..))
import Util as Util

data AccountName
  = AccountName NonEmptyString

accountNameFromNonEmptyString :: NonEmptyString -> Maybe AccountName
accountNameFromNonEmptyString raw = Prelude.map AccountName (NonEmptyString.trim raw)
 
data Identifier
  = Identifier NonEmptyString
 
derive instance Prelude.Eq Identifier
 
safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-z][a-zA-Z0-9]{0,63}$" RegexFlags.unicode

identifierFromString ::  String -> Maybe Identifier
identifierFromString value =
  case NonEmptyString.fromString (String.trim value) of
    Just nonEmptyValue -> identifierFromNonEmptyString nonEmptyValue
    Nothing -> Nothing


identifierFromNonEmptyString :: NonEmptyString -> Maybe Identifier
identifierFromNonEmptyString value = case safePatternEither of
  Either.Right safePattern ->
    case NonEmptyString.trim value of
      Just valueTrimmed ->
        let 
          lowercase = Util.firstLowercaseNonEmpty valueTrimmed
        in
        if Regex.test safePattern (NonEmptyString.toString lowercase) then
          Just (Identifier lowercase)
        else
          Nothing
      Nothing ->
        Nothing
  Either.Left _ -> Nothing

identifierToNonEmptyString :: Boolean -> Identifier -> NonEmptyString
identifierToNonEmptyString isUppercase (Identifier value) = 
  if isUppercase then
    Util.firstUppercaseNonEmpty value
  else
    value 

identifierToString :: Boolean -> Identifier -> String
identifierToString isUppercase identifier =
  NonEmptyString.toString
    (identifierToNonEmptyString isUppercase identifier)

fromSymbolProxy ::
  forall (symbol :: Symbol) (charTypeList:: TList.List' Identifier.CharType).
  (Identifier.SymbolToCharTypeList symbol charTypeList) => 
  (CheckValidChar charTypeList) =>
  (Symbol.IsSymbol symbol) =>
  (NonEmptyString.MakeNonEmpty symbol) =>
  Proxy symbol -> Identifier
fromSymbolProxy _ = Identifier (NonEmptyString.nes (Proxy :: Proxy symbol))


class CheckValidChar (charType :: TList.List' Identifier.CharType)

instance checkValidCharEmpty ::
  TypeError.Fail (TypeError.Text "空の文字列は definy の識別子にできません") =>
  CheckValidChar TList.Nil'
else instance checkValidCharAlphabetLowercase ::
  ( CheckValidCharTail tail tailSymbol PeanoNat.D1
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  CheckValidChar (TList.Cons' (Identifier.AlphabetLowercase head) tail)
else instance checkValidCharOther ::
  ( Identifier.CharSymbolToCharType headChar head
  , PrimSymbol.Append "definyの識別子の先頭に含めることができない文字が含まれています " headChar message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  CheckValidChar (TList.Cons' head tail)

class CheckValidCharTail (charTypeList :: TList.List' Identifier.CharType) (symbol :: Symbol) (length :: PeanoNat.Nat) | charTypeList -> symbol

instance checkValidCharTailLength ::
  (TypeError.Fail (TypeError.Text "64文字以上は識別子にできません")) =>
  CheckValidCharTail list symbol PeanoNat.D64
else instance checkValidCharTailEmpty ::
  CheckValidCharTail TList.Nil' "" length
else instance checkValidCharTailAlphabetUppercase ::
  ( CheckValidCharTail tail tailSymbol (PeanoNat.Succ length)
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.AlphabetUppercase head) tail) symbol length
else instance checkValidCharTailAlphabetLowercase ::
  ( CheckValidCharTail tail tailSymbol (PeanoNat.Succ length)
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.AlphabetLowercase head) tail) symbol length
else instance checkValidCharTailAlphabetDigit ::
  ( CheckValidCharTail tail tailSymbol (PeanoNat.Succ length)
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.Digit head) tail) symbol length
else instance checkValidCharTailOther ::
  ( Identifier.CharSymbolToCharType headCharSymbol headCharType
  , PrimSymbol.Append "definyの識別子に含めることができない文字が含まれています " headCharSymbol message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  CheckValidCharTail (TList.Cons' headCharType tail) "tail error" length
