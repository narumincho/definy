module FileSystem.Name
  ( Name
  , class CheckNotReserved
  , class CheckSafeName
  , class CheckValidChar
  , class CheckValidCharTail
  , class IsName
  , fromNonEmptyString
  , fromNonEmptyStringUnsafe
  , fromString
  , fromSymbolProxy
  , reflectName
  , reifyName
  , toNonEmptyString
  ) where

import Data.Either (Either)
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags
import Data.Symbol as Symbol
import ErrorMessage as ErrorMessage
import Identifier as Identifier
import Prelude as Prelude
import Prim.Symbol as PrimSymbol
import Prim.TypeError as TypeError
import Type.Data.List as TList
import Type.Data.Peano.Nat as PeanoNat
import Type.Proxy (Proxy(..))

-- | `*/` などのファイル名やディレクトリ名にふさわしくない文字列が含まれていないことを保証した名前
newtype Name
  = Name NonEmptyString

derive instance nameEq :: Prelude.Eq Name

derive instance nameOrd :: Prelude.Ord Name

instance nameShow :: Prelude.Show Name where
  show (Name rawNonEmptyString) = NonEmptyString.toString rawNonEmptyString

foreign import data TypeLevelName :: Symbol -> Name

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
  forall (symbol :: Symbol) (name :: Name).
  (CheckSafeName symbol name) =>
  (IsName name) =>
  Proxy symbol -> Name
fromSymbolProxy _ = reflectName (Proxy :: Proxy name)

class IsName (name :: Name) where
  reflectName :: Proxy name -> Name

instance isName :: (Symbol.IsSymbol symbol) => IsName (TypeLevelName symbol) where
  reflectName _ = Name (NonEmptyString.nes (Proxy :: Proxy symbol))

reifyName :: forall (r :: Type). Name -> (forall (o :: Name). IsName o => Proxy o -> r) -> r
reifyName (Name str) f = Symbol.reifySymbol (NonEmptyString.toString str) (reifyNameName f)

reifyNameName ::
  forall (r :: Type) (symbol :: Symbol).
  (Symbol.IsSymbol symbol) =>
  (forall (o :: Name). IsName o => Proxy o -> r) -> Proxy symbol -> r
reifyNameName f _ = f (Proxy :: Proxy (TypeLevelName symbol))

class CheckSafeName (symbol :: Symbol) (name :: Name) | symbol -> name

instance checkSafeName ::
  ( Identifier.SymbolToCharTypeList symbol charTypeList
  , CheckValidChar charTypeList result
  , CheckNameResultTrowError result
  , Identifier.CharTypeListLowercaseToUppercase charTypeList upperCharTypeList
  , Identifier.SymbolToCharTypeList upperSymbol upperCharTypeList
  , CheckNotReserved symbol upperSymbol
  ) =>
  CheckSafeName symbol (TypeLevelName symbol)

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

class CheckValidChar (charTypeList :: TList.List' Identifier.CharType) (result :: CheckNameResult) | charTypeList -> result

instance checkValidCharEmpty ::
  CheckValidChar TList.Nil' (NameError (ErrorMessage.Text "Cannot create an Name from an empty Symbol"))
else instance checkValidCharAlphabetUppercase ::
  ( CheckValidCharTail tail PeanoNat.D1 tailResult
  , CheckNameResultJoin head tailResult result
  ) =>
  CheckValidChar (TList.Cons' (Identifier.AlphabetUppercase head) tail) result
else instance checkValidCharAlphabetLowercase ::
  ( CheckValidCharTail tail PeanoNat.D1 tailResult
  , CheckNameResultJoin head tailResult result
  ) =>
  CheckValidChar (TList.Cons' (Identifier.AlphabetLowercase head) tail) result
else instance checkValidCharDigit ::
  ( CheckValidCharTail tail PeanoNat.D1 tailResult
  , CheckNameResultJoin head tailResult result
  ) =>
  CheckValidChar (TList.Cons' (Identifier.Digit head) tail) result
else instance checkValidCharDot ::
  ( CheckValidCharTail tail PeanoNat.D1 tailResult
  , CheckNameResultJoin "." tailSymbol result
  ) =>
  CheckValidChar (TList.Cons' (Identifier.Other ".") tail) result
else instance checkValidCharOther ::
  ( Identifier.CharSymbolToCharType headChar head
  , PrimSymbol.Append "The first letter of the Name must not be " headChar message
  ) =>
  CheckValidChar (TList.Cons' head tail) (NameError (ErrorMessage.Text message))

class CheckValidCharTail (charTypeList :: TList.List' Identifier.CharType) (length :: PeanoNat.Nat) (result :: CheckNameTailResult) | charTypeList -> result

instance checkValidCharTailLength ::
  CheckValidCharTail list PeanoNat.D50 (NameTailError (ErrorMessage.Text "50文字以上です!"))
else instance checkValidCharTailEmpty ::
  CheckValidCharTail TList.Nil' length (NameTailOk "")
else instance checkValidCharTailAlphabetUppercase ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin head tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.AlphabetUppercase head) tail) length result
else instance checkValidCharTailAlphabetLowercase ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin head tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.AlphabetLowercase head) tail) length result
else instance checkValidCharTailAlphabetDigit ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin head tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.Digit head) tail) length result
else instance checkValidCharTailUnderscore ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin "_" tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.Other "_") tail) length result
else instance checkValidCharTailHyphenMinus ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin "-" tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.Other "-") tail) length result
else instance checkValidCharTailHyphenDot ::
  ( CheckValidCharTail tail (PeanoNat.Succ length) tailResult
  , CheckNameTailResultJoin "." tailResult result
  ) =>
  CheckValidCharTail (TList.Cons' (Identifier.Other ".") tail) length result
else instance checkValidCharTailOther ::
  ( Identifier.CharSymbolToCharType headCharSymbol headCharType
  , PrimSymbol.Append "Name cannot contain " headCharSymbol message
  ) =>
  CheckValidCharTail (TList.Cons' headCharType tail) length (NameTailError (ErrorMessage.Text message))

data CheckNameResult

foreign import data NameOk :: Name -> CheckNameResult

foreign import data NameError :: ErrorMessage.ErrorMessage -> CheckNameResult

class IsCheckNameResult (checkNameResult :: CheckNameResult) where
  reflectCheckNameResult :: Proxy checkNameResult -> Either ErrorMessage.ErrorMessage Name

instance isCheckNameResultOk ::
  (IsName name) =>
  IsCheckNameResult (NameOk name) where
  reflectCheckNameResult _ =
    Either.Right
      (reflectName (Proxy :: Proxy name))
else instance isCheckNameResultError ::
  (ErrorMessage.IsErrorMessage errorMessage) =>
  IsCheckNameResult (NameError errorMessage) where
  reflectCheckNameResult _ =
    Either.Left
      (ErrorMessage.reflectErrorMessage (Proxy :: Proxy errorMessage))

class CheckNameResultTrowError (checkNameResult :: CheckNameResult)

instance checkNameResultTrowErrorOk :: CheckNameResultTrowError (NameOk name)
else instance checkNameResultTrowError ::
  ( ErrorMessage.ErrorMessageToTypeErrorDoc error doc
  , TypeError.Fail doc
  ) =>
  CheckNameResultTrowError (NameError error)

class CheckNameResultJoin (head :: Symbol) (checkNameTailResult :: CheckNameTailResult) (checkNameResult :: CheckNameResult) | head checkNameTailResult -> checkNameResult

instance checkNameResultJoinOk :: (PrimSymbol.Append head tail symbol) => CheckNameResultJoin head (NameTailOk tail) (NameOk (TypeLevelName symbol))
else instance checkNameResultJoinError :: CheckNameResultJoin head (NameTailError message) (NameError message)

data CheckNameTailResult

foreign import data NameTailOk :: Symbol -> CheckNameTailResult

foreign import data NameTailError :: ErrorMessage.ErrorMessage -> CheckNameTailResult

class IsCheckNameTailResult (checkNameTailResult :: CheckNameTailResult)

instance isCheckNameTailResultOk ::
  (Symbol.IsSymbol nameTail) =>
  IsCheckNameTailResult (NameTailOk nameTail)
else instance isCheckNameTailResultError ::
  (ErrorMessage.IsErrorMessage errorMessage) =>
  IsCheckNameTailResult (NameTailError errorMessage)

class CheckNameTailResultJoin (head :: Symbol) (isCheckNameTailResult :: CheckNameTailResult) (result :: CheckNameTailResult) | isCheckNameTailResult -> result

instance checkNameTailResultJoinOk :: (PrimSymbol.Append head tail symbol) => CheckNameTailResultJoin head (NameTailOk tail) (NameTailOk symbol)
else instance checkNameTailResultJoinError :: CheckNameTailResultJoin head (NameTailError errorMessage) (NameTailError errorMessage)

toNonEmptyString :: Name -> NonEmptyString
toNonEmptyString (Name str) = str
