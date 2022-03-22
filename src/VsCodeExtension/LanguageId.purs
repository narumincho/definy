module VsCodeExtension.LanguageId
  ( languageId
  ) where

import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Type.Proxy (Proxy(..))

languageId :: NonEmptyString
languageId = NonEmptyString.nes (Proxy :: Proxy "definy")
