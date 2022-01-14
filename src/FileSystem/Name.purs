module FileSystem.Name
  ( Name
  , class CheckNotReserved
  , class MakeName
  , class MakeNameTail
  , fromNonEmptyString
  , fromNonEmptyStringUnsafe
  , fromString
  , fromSymbolProxy
  , toNonEmptyString
  ) where

import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.Set as Set
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
import Type.Proxy (Proxy(..))

-- | `*/` などのファイル名やディレクトリ名にふさわしくない文字列が含まれていないことを保証した名前
newtype Name
  = Name NonEmptyString

derive instance nameEq :: Prelude.Eq Name

derive instance nameOrd :: Prelude.Ord Name

instance nameShow :: Prelude.Show Name where
  show (Name rawNonEmptyString) = NonEmptyString.toString rawNonEmptyString

safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-zA-Z0-9-_.]+$" RegexFlags.unicode

-- | 予約されていて使えないディレクトリ/ファイル名
reservedNameSet :: Set.Set NonEmptyString
reservedNameSet =
  Set.fromFoldable
    [ NonEmptyString.nes (Proxy :: _ ".")
    , NonEmptyString.nes (Proxy :: _ "..")
    , NonEmptyString.nes (Proxy :: _ "CON")
    , NonEmptyString.nes (Proxy :: _ "AUX")
    , NonEmptyString.nes (Proxy :: _ "PRN")
    , NonEmptyString.nes (Proxy :: _ "NUL")
    , NonEmptyString.nes (Proxy :: _ "COM0")
    , NonEmptyString.nes (Proxy :: _ "COM1")
    , NonEmptyString.nes (Proxy :: _ "COM2")
    , NonEmptyString.nes (Proxy :: _ "COM3")
    , NonEmptyString.nes (Proxy :: _ "COM4")
    , NonEmptyString.nes (Proxy :: _ "COM5")
    , NonEmptyString.nes (Proxy :: _ "COM6")
    , NonEmptyString.nes (Proxy :: _ "COM7")
    , NonEmptyString.nes (Proxy :: _ "COM8")
    , NonEmptyString.nes (Proxy :: _ "COM9")
    , NonEmptyString.nes (Proxy :: _ "LPT0")
    , NonEmptyString.nes (Proxy :: _ "LPT1")
    , NonEmptyString.nes (Proxy :: _ "LPT2")
    , NonEmptyString.nes (Proxy :: _ "LPT3")
    , NonEmptyString.nes (Proxy :: _ "LPT4")
    , NonEmptyString.nes (Proxy :: _ "LPT5")
    , NonEmptyString.nes (Proxy :: _ "LPT6")
    , NonEmptyString.nes (Proxy :: _ "LPT7")
    , NonEmptyString.nes (Proxy :: _ "LPT8")
    , NonEmptyString.nes (Proxy :: _ "LPT9")
    ]

-- | 有効なファイル名かどうか調べ Nameを作成する.
-- | `^[a-zA-Z0-9-_]+$` の条件を満たし, windows で禁止されている文字ではないか調べる
-- | 最大ファイル名文字数や最大パス名など細かい仕様は, 検査していないため,
-- | ファイル操作をするときにエラーが発生するだろう.
-- | windows では 大文字小文字を区別しない仕様にも注意!
fromNonEmptyString :: NonEmptyString -> Maybe Name
fromNonEmptyString name = case safePatternEither of
  Either.Right safePattern ->
    if (Prelude.(&&))
      (Regex.test safePattern (NonEmptyString.toString name))
      (Prelude.not (Set.member (NonEmptyString.toUpper name) reservedNameSet)) then
      Just
        (Name name)
    else
      Nothing
  Either.Left _ -> Nothing

fromNonEmptyStringUnsafe :: NonEmptyString -> Name
fromNonEmptyStringUnsafe name = Name name

-- | 有効なファイル名かどうか調べ Nameを作成する.
-- | `^[a-zA-Z0-9-_]+$` の条件を満たし, windows で禁止されている文字ではないか調べる
-- | 最大ファイル名文字数や最大パス名など細かい仕様は, 検査していないため,
-- | ファイル操作をするときにエラーが発生するだろう.
-- | windows では 大文字小文字を区別しない仕様にも注意!
fromString :: String -> Maybe Name
fromString name = case NonEmptyString.fromString name of
  Just nonEmptyName -> fromNonEmptyString nonEmptyName
  Nothing -> Nothing

-- | Proxy symbol から作成する. 含まれる文字のチェックはするが,
-- | 予約されていて名前に関してはチェックしないので, コード内に気をつけて書く.
fromSymbolProxy ::
  forall (symbol :: Symbol).
  (Symbol.IsSymbol symbol) =>
  forall (charTypeList :: TList.List' Identifier.CharType).
  (Identifier.SymbolToCharTypeList symbol charTypeList) =>
  (MakeName charTypeList) =>
  forall (upperCharTypeList :: TList.List' Identifier.CharType).
  (Identifier.CharTypeListLowercaseToUppercase charTypeList upperCharTypeList) =>
  forall (upperSymbol :: Symbol).
  (Identifier.SymbolToCharTypeList upperSymbol upperCharTypeList) =>
  (CheckNotReserved symbol upperSymbol) =>
  Proxy symbol -> Name
fromSymbolProxy _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))

class CheckNotReserved (originalSymbol :: Symbol) (uppercaseSymbol :: Symbol)

instance checkNotReservedDot ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol ".")) =>
  CheckNotReserved originalSymbol "."
else instance checkNotReservedDotDot ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "..")) =>
  CheckNotReserved originalSymbol ".."
else instance checkNotReservedCon ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "CON")) =>
  CheckNotReserved originalSymbol "CON"
else instance checkNotReservedAUX ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "AUX")) =>
  CheckNotReserved originalSymbol "AUX"
else instance checkNotReservedPRN ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "PRN")) =>
  CheckNotReserved originalSymbol "PRN"
else instance checkNotReservedNUL ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "NUL")) =>
  CheckNotReserved originalSymbol "NUL"
else instance checkNotReservedCOM0 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM0")) =>
  CheckNotReserved originalSymbol "COM0"
else instance checkNotReservedCOM1 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM1")) =>
  CheckNotReserved originalSymbol "COM1"
else instance checkNotReservedCOM2 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM2")) =>
  CheckNotReserved originalSymbol "COM2"
else instance checkNotReservedCOM3 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM3")) =>
  CheckNotReserved originalSymbol "COM3"
else instance checkNotReservedCOM4 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM4")) =>
  CheckNotReserved originalSymbol "COM4"
else instance checkNotReservedCOM5 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM5")) =>
  CheckNotReserved originalSymbol "COM5"
else instance checkNotReservedCOM6 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM6")) =>
  CheckNotReserved originalSymbol "COM6"
else instance checkNotReservedCOM7 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM7")) =>
  CheckNotReserved originalSymbol "COM7"
else instance checkNotReservedCOM8 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM8")) =>
  CheckNotReserved originalSymbol "COM8"
else instance checkNotReservedCOM9 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "COM9")) =>
  CheckNotReserved originalSymbol "COM9"
else instance checkNotReservedLPT0 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT0")) =>
  CheckNotReserved originalSymbol "LPT0"
else instance checkNotReservedLPT1 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT1")) =>
  CheckNotReserved originalSymbol "LPT1"
else instance checkNotReservedLPT2 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT2")) =>
  CheckNotReserved originalSymbol "LPT2"
else instance checkNotReservedLPT3 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT3")) =>
  CheckNotReserved originalSymbol "LPT3"
else instance checkNotReservedLPT4 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT4")) =>
  CheckNotReserved originalSymbol "LPT4"
else instance checkNotReservedLPT5 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT5")) =>
  CheckNotReserved originalSymbol "LPT5"
else instance checkNotReservedLPT6 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT6")) =>
  CheckNotReserved originalSymbol "LPT6"
else instance checkNotReservedLPT7 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT7")) =>
  CheckNotReserved originalSymbol "LPT7"
else instance checkNotReservedLPT8 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT8")) =>
  CheckNotReserved originalSymbol "LPT8"
else instance checkNotReservedLPT9 ::
  (TypeError.Fail (ReservedNameErrorMessage originalSymbol "LPT9")) =>
  CheckNotReserved originalSymbol "LPT9"
else instance checkReservedNotReserved :: CheckNotReserved originalSymbol symbol

type ReservedNameErrorMessage :: Symbol -> Symbol -> TypeError.Doc
type ReservedNameErrorMessage originalSymbol symbol
  = TypeError.Beside
      ( TypeError.Beside
          ( TypeError.Beside
              (TypeError.QuoteLabel symbol)
              (TypeError.Text " (original: ")
          )
          (TypeError.QuoteLabel originalSymbol)
      )
      (TypeError.Text ") is reserved Name")

class MakeName (charTypeList :: TList.List' Identifier.CharType)

instance makeNameEmpty ::
  TypeError.Fail (TypeError.Text "Cannot create an Name from an empty Symbol") =>
  MakeName TList.Nil'
else instance makeNameAlphabetUppercase ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (TList.Cons' (Identifier.AlphabetUppercase head) tail)
else instance makeNameAlphabetLowercase ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (TList.Cons' (Identifier.AlphabetLowercase head) tail)
else instance makeNameDigit ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (TList.Cons' (Identifier.Digit head) tail)
else instance makeNameDot ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "." tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (TList.Cons' (Identifier.Other ".") tail)
else instance makeNameOther ::
  ( Identifier.CharSymbolToCharType headChar head
  , PrimSymbol.Append "The first letter of the Name must not be " headChar message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  MakeName (TList.Cons' head tail)

class MakeNameTail (charTypeList :: TList.List' Identifier.CharType) (symbol :: Symbol) | charTypeList -> symbol

instance makeNameTailEmpty ::
  MakeNameTail TList.Nil' ""
else instance makeNameTailAlphabetUppercase ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.AlphabetUppercase head) tail) symbol
else instance makeNameTailAlphabetLowercase ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.AlphabetLowercase head) tail) symbol
else instance makeNameTailAlphabetDigit ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.Digit head) tail) symbol
else instance makeNameTailUnderscore ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "_" tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.Other "_") tail) symbol
else instance makeNameTailHyphenMinus ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "-" tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.Other "-") tail) symbol
else instance makeNameTailHyphenDot ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "." tailSymbol symbol
  ) =>
  MakeNameTail (TList.Cons' (Identifier.Other ".") tail) symbol
else instance makeNameTailOther ::
  ( Identifier.CharSymbolToCharType headCharSymbol headCharType
  , PrimSymbol.Append "Name cannot contain " headCharSymbol message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  MakeNameTail (TList.Cons' headCharType tail) "tail error"

toNonEmptyString :: Name -> NonEmptyString
toNonEmptyString (Name str) = str
