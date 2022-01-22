module Definy.Identifier
  ( AccountName
  , accountNameFromNonEmptyString
  ) where

import Prelude as Prelude
import Data.Maybe (Maybe)
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString

data AccountName
  = AccountName NonEmptyString

accountNameFromNonEmptyString :: NonEmptyString -> Maybe AccountName
accountNameFromNonEmptyString raw = Prelude.map AccountName (NonEmptyString.trim raw)
