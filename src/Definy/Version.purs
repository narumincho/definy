module Definy.Version (Version(..)) where

import Data.String.NonEmpty (NonEmptyString)

data Version
  = Release NonEmptyString
  | Development
