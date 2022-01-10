module TypeScript.ModuleName
  ( ModuleName
  , fromNonEmptyString
  , toNonEmptyString
  ) where

import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags

newtype ModuleName
  = ModuleName NonEmptyString

safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-zA-Z0-9-_]+$" RegexFlags.unicode

fromNonEmptyString :: NonEmptyString -> Maybe ModuleName
fromNonEmptyString name = case safePatternEither of
  Either.Right safePattern ->
    if Regex.test safePattern (NonEmptyString.toString name) then
      Just
        (ModuleName name)
    else
      Nothing
  Either.Left _ -> Nothing

toNonEmptyString :: ModuleName -> NonEmptyString
toNonEmptyString (ModuleName str) = str
