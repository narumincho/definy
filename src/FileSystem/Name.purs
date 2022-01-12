module FileSystem.Name
  ( Name
  , class MakeName
  , class MakeNameTail
  , fromNonEmptyString
  , fromNonEmptyStringUnsafe
  , fromString
  , fromSymbolProxy
  , fromSymbolProxyInMakeName
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
import Type.Proxy (Proxy(..))

-- | `*/` などのファイル名やディレクトリ名にふさわしくない文字列が含まれていないことを保証した名前
newtype Name
  = Name NonEmptyString

derive instance nameEq :: Prelude.Eq Name

derive instance nameOrd :: Prelude.Ord Name

instance nameShow :: Prelude.Show Name where
  show (Name rawNonEmptyString) = NonEmptyString.toString rawNonEmptyString

safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-zA-Z0-9-_]+$" RegexFlags.unicode

-- | 予約されていて使えないディレクトリ/ファイル名
reservedNameSet :: Set.Set NonEmptyString
reservedNameSet =
  Set.fromFoldable
    [ NonEmptyString.nes (Proxy :: _ "CON")
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
    , NonEmptyString.nes (Proxy :: _ "LPT8")
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
  forall (symbol :: Symbol) (charTypeList :: Identifier.CharTypeList).
  (Identifier.SymbolToCharTypeList symbol charTypeList) =>
  (MakeName charTypeList) =>
  Proxy symbol -> Name
fromSymbolProxy _ =
  fromSymbolProxyInMakeName
    (Proxy :: Proxy charTypeList)

class MakeName (charTypeList :: Identifier.CharTypeList) where
  fromSymbolProxyInMakeName :: Proxy charTypeList -> Name

instance makeNameEmpty ::
  TypeError.Fail (TypeError.Text "Cannot create an Name from an empty Symbol") =>
  MakeName Identifier.Nil where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy "empty error"))
else instance makeNameAlphabetUppercase ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (Identifier.Cons (Identifier.AlphabetUppercase head) tail) where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))
else instance makeNameAlphabetLowercase ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (Identifier.Cons (Identifier.AlphabetLowercase head) tail) where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))
else instance makeNameDigit ::
  ( MakeNameTail tail tailSymbol
  , Symbol.IsSymbol head
  , PrimSymbol.Append head tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (Identifier.Cons (Identifier.Digit head) tail) where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))
else instance makeNameDot ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "." tailSymbol symbol
  , Symbol.IsSymbol symbol
  ) =>
  MakeName (Identifier.Cons (Identifier.Other ".") tail) where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))
else instance makeNameOther ::
  ( Identifier.CharSymbolToCharType headChar head
  , PrimSymbol.Append "The first letter of the Name must not be " headChar message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  MakeName (Identifier.Cons head tail) where
  fromSymbolProxyInMakeName _ = Name (NonEmptyString.nes (Proxy :: Proxy "head invalid char error"))

class MakeNameTail (charTypeList :: Identifier.CharTypeList) (symbol :: Symbol) | charTypeList -> symbol

instance makeNameTailEmpty ::
  MakeNameTail Identifier.Nil ""
else instance makeNameTailAlphabetUppercase ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.AlphabetUppercase head) tail) symbol
else instance makeNameTailAlphabetLowercase ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.AlphabetLowercase head) tail) symbol
else instance makeNameTailAlphabetDigit ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append head tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.Digit head) tail) symbol
else instance makeNameTailUnderscore ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "_" tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.Other "_") tail) symbol
else instance makeNameTailHyphenMinus ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "-" tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.Other "-") tail) symbol
else instance makeNameTailHyphenDot ::
  ( MakeNameTail tail tailSymbol
  , PrimSymbol.Append "." tailSymbol symbol
  ) =>
  MakeNameTail (Identifier.Cons (Identifier.Other ".") tail) symbol
else instance makeNameTailOther ::
  ( Identifier.CharSymbolToCharType headCharSymbol headCharType
  , PrimSymbol.Append "Name cannot contain " headCharSymbol message
  , TypeError.Fail (TypeError.Text message)
  ) =>
  MakeNameTail (Identifier.Cons headCharType tail) "tail error"

toNonEmptyString :: Name -> NonEmptyString
toNonEmptyString (Name str) = str
