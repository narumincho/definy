module Definy.Version (Version(..)) where

import Data.String.NonEmpty as NonEmptyString

data Version
  = Release NonEmptyString.NonEmptyString
  | Development
