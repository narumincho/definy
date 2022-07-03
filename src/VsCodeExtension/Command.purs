module VsCodeExtension.Command
  ( definyWebview
  ) where

import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Type.Prelude (Proxy(..))

definyWebview :: NonEmptyString
definyWebview = NonEmptyString.nes (Proxy :: _ "definy.webview")
