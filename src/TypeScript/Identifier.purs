module TypeScript.Identifier
  ( IdentifierIndex
  , TsIdentifier(..)
  , createIdentifier
  , fromSymbolProxyUnsafe
  , initialIdentifierIndex
  , isSafePropertyName
  , toNonEmptyString
  , toString
  ) where

import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Set as Set
import Data.String as String
import Data.String.CodePoints as CodePoints
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.NonEmpty.CodePoints as NonEmptyCodePoints
import Data.UInt as UInt
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import Util as Util

newtype TsIdentifier
  = TsIdentifier NonEmptyString

derive instance eqTsIdentifier :: Prelude.Eq TsIdentifier

derive instance ordTsIdentifier :: Prelude.Ord TsIdentifier

instance showTsIdentifier :: Prelude.Show TsIdentifier where
  show (TsIdentifier nonEmpty) =
    Prelude.append
      (Prelude.append "TsIdentifier(" (NonEmptyString.toString nonEmpty))
      ")"

toNonEmptyString :: TsIdentifier -> NonEmptyString
toNonEmptyString (TsIdentifier nonEmptyString) = nonEmptyString

toString :: TsIdentifier -> String
toString (TsIdentifier nonEmptyString) = (NonEmptyString.toString nonEmptyString)

-- | ```ts
-- | ({ await: 32 }.await)
-- | ({ "": "empty"}[""])
-- | ```
-- |
-- | プロパティ名として直接コードで指定できるかどうか
-- | isIdentifier とは予約語を指定できるかの面で違う
isSafePropertyName :: String -> Boolean
isSafePropertyName word = case String.uncons word of
  Just { head, tail } ->
    if Prelude.not (String.contains (String.Pattern (CodePoints.singleton head)) "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_") then
      false
    else
      Array.all
        ( \tailChar ->
            Prelude.not (String.contains (String.Pattern (CodePoints.singleton tailChar)) "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789")
        )
        (String.toCodePointArray tail)
  Nothing -> false

-- | JavaScriptやTypeScriptによって決められた予約語と、できるだけ使いたくない語
reservedByLanguageWordSet :: Set.Set NonEmptyString
reservedByLanguageWordSet =
  Set.fromFoldable
    [ NonEmptyString.nes (Proxy :: _ "await")
    , NonEmptyString.nes (Proxy :: _ "break")
    , NonEmptyString.nes (Proxy :: _ "case")
    , NonEmptyString.nes (Proxy :: _ "catch")
    , NonEmptyString.nes (Proxy :: _ "class")
    , NonEmptyString.nes (Proxy :: _ "const")
    , NonEmptyString.nes (Proxy :: _ "continue")
    , NonEmptyString.nes (Proxy :: _ "debugger")
    , NonEmptyString.nes (Proxy :: _ "default")
    , NonEmptyString.nes (Proxy :: _ "delete")
    , NonEmptyString.nes (Proxy :: _ "do")
    , NonEmptyString.nes (Proxy :: _ "else")
    , NonEmptyString.nes (Proxy :: _ "export")
    , NonEmptyString.nes (Proxy :: _ "extends")
    , NonEmptyString.nes (Proxy :: _ "finally")
    , NonEmptyString.nes (Proxy :: _ "for")
    , NonEmptyString.nes (Proxy :: _ "function")
    , NonEmptyString.nes (Proxy :: _ "if")
    , NonEmptyString.nes (Proxy :: _ "import")
    , NonEmptyString.nes (Proxy :: _ "in")
    , NonEmptyString.nes (Proxy :: _ "instanceof")
    , NonEmptyString.nes (Proxy :: _ "new")
    , NonEmptyString.nes (Proxy :: _ "return")
    , NonEmptyString.nes (Proxy :: _ "super")
    , NonEmptyString.nes (Proxy :: _ "switch")
    , NonEmptyString.nes (Proxy :: _ "this")
    , NonEmptyString.nes (Proxy :: _ "throw")
    , NonEmptyString.nes (Proxy :: _ "try")
    , NonEmptyString.nes (Proxy :: _ "typeof")
    , NonEmptyString.nes (Proxy :: _ "var")
    , NonEmptyString.nes (Proxy :: _ "void")
    , NonEmptyString.nes (Proxy :: _ "while")
    , NonEmptyString.nes (Proxy :: _ "with")
    , NonEmptyString.nes (Proxy :: _ "yield")
    , NonEmptyString.nes (Proxy :: _ "let")
    , NonEmptyString.nes (Proxy :: _ "static")
    , NonEmptyString.nes (Proxy :: _ "enum")
    , NonEmptyString.nes (Proxy :: _ "implements")
    , NonEmptyString.nes (Proxy :: _ "package")
    , NonEmptyString.nes (Proxy :: _ "protected")
    , NonEmptyString.nes (Proxy :: _ "interface")
    , NonEmptyString.nes (Proxy :: _ "private")
    , NonEmptyString.nes (Proxy :: _ "public")
    , NonEmptyString.nes (Proxy :: _ "null")
    , NonEmptyString.nes (Proxy :: _ "true")
    , NonEmptyString.nes (Proxy :: _ "false")
    , NonEmptyString.nes (Proxy :: _ "any")
    , NonEmptyString.nes (Proxy :: _ "boolean")
    , NonEmptyString.nes (Proxy :: _ "constructor")
    , NonEmptyString.nes (Proxy :: _ "declare")
    , NonEmptyString.nes (Proxy :: _ "get")
    , NonEmptyString.nes (Proxy :: _ "module")
    , NonEmptyString.nes (Proxy :: _ "require")
    , NonEmptyString.nes (Proxy :: _ "number")
    , NonEmptyString.nes (Proxy :: _ "set")
    , NonEmptyString.nes (Proxy :: _ "string")
    , NonEmptyString.nes (Proxy :: _ "symbol")
    , NonEmptyString.nes (Proxy :: _ "type")
    , NonEmptyString.nes (Proxy :: _ "from")
    , NonEmptyString.nes (Proxy :: _ "of")
    , NonEmptyString.nes (Proxy :: _ "as")
    , NonEmptyString.nes (Proxy :: _ "unknown")
    , NonEmptyString.nes (Proxy :: _ "Infinity")
    , NonEmptyString.nes (Proxy :: _ "NaN")
    , NonEmptyString.nes (Proxy :: _ "undefined")
    , NonEmptyString.nes (Proxy :: _ "top")
    , NonEmptyString.nes (Proxy :: _ "closed")
    , NonEmptyString.nes (Proxy :: _ "self")
    ]

fromSymbolProxyUnsafe ::
  forall (symbol :: Symbol).
  NonEmptyString.MakeNonEmpty symbol => Proxy symbol -> TsIdentifier
fromSymbolProxyUnsafe _ = TsIdentifier (NonEmptyString.nes (Proxy :: Proxy symbol))

newtype IdentifierIndex
  = IdentifierIndex UInt.UInt

-- | 初期インデックス
initialIdentifierIndex :: IdentifierIndex
initialIdentifierIndex = IdentifierIndex (UInt.fromInt 0)

nextIdentifierIndex :: IdentifierIndex -> IdentifierIndex
nextIdentifierIndex (IdentifierIndex index) =
  IdentifierIndex
    (Prelude.add index (UInt.fromInt 1))

-- | 識別子を生成する
-- |  @param reserved 言語の予約語と別に使わない識別子
createIdentifier ::
  IdentifierIndex ->
  Set.Set TsIdentifier ->
  { identifier :: TsIdentifier, nextIdentifierIndex :: IdentifierIndex }
createIdentifier index reserved =
  let
    result = createIdentifierByIndex index
  in
    if Prelude.(&&)
      (Prelude.not (Set.member (TsIdentifier result) reserved))
      (Prelude.not (Set.member result reservedByLanguageWordSet)) then
      { identifier: TsIdentifier result
      , nextIdentifierIndex: nextIdentifierIndex index
      }
    else
      createIdentifier (nextIdentifierIndex index) reserved

headIdentifierCharTable :: NonEmptyArray CodePoints.CodePoint
headIdentifierCharTable =
  NonEmptyCodePoints.toNonEmptyCodePointArray
    (NonEmptyString.nes (Proxy :: _ "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"))

tailIdentifierCharTable :: NonEmptyArray CodePoints.CodePoint
tailIdentifierCharTable =
  NonEmptyArray.appendArray
    headIdentifierCharTable
    (String.toCodePointArray "0123456789")

-- | indexから識別子を生成する (予約語を考慮しない)
createIdentifierByIndex :: IdentifierIndex -> NonEmptyString
createIdentifierByIndex (IdentifierIndex index) = case NonEmptyArray.index
    headIdentifierCharTable
    (UInt.toInt index) of
  Just headChar -> NonEmptyCodePoints.singleton headChar
  Nothing ->
    createIdentifierByIndexLoop
      (Prelude.sub index (UInt.fromInt (NonEmptyArray.length headIdentifierCharTable)))

createIdentifierByIndexLoop :: UInt.UInt -> NonEmptyString
createIdentifierByIndexLoop index =
  let
    quotient =
      UInt.fromInt
        ( Prelude.div
            (UInt.toInt index)
            (NonEmptyArray.length tailIdentifierCharTable)
        )

    second = Util.nonEmptyArrayGetAtLoop tailIdentifierCharTable index
  in
    case NonEmptyArray.index headIdentifierCharTable (UInt.toInt quotient) of
      Just head ->
        NonEmptyString.appendString
          (NonEmptyCodePoints.singleton head)
          (String.singleton second)
      Nothing ->
        Prelude.append
          ( createIdentifierByIndexLoop
              ( Prelude.sub
                  quotient
                  (UInt.fromInt (NonEmptyArray.length headIdentifierCharTable))
              )
          )
          (NonEmptyString.singleton second)
