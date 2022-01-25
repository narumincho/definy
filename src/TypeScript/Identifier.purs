module TypeScript.Identifier
  ( TsIdentifier(..)
  , isSafePropertyName
  , toNonEmptyString
  , toString
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.CodePoints as CodePoints
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude

newtype TsIdentifier
  = TsIdentifier NonEmptyString

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
