module VsCodeExtension.Command
  ( Command(..)
  , commandToCommandUri
  , definyOpenTextFile
  , definyOpenTextFileWithParameterUrl
  , definyWebview
  ) where

import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import Type.Prelude (Proxy(..))

definyWebview :: NonEmptyString
definyWebview = NonEmptyString.nes (Proxy :: _ "definy.webview")

definyOpenTextFile :: NonEmptyString
definyOpenTextFile = NonEmptyString.nes (Proxy :: _ "definy.openTextFile")

definyOpenTextFileWithParameterUrl :: String -> Command
definyOpenTextFileWithParameterUrl content =
  Command
    { command: definyOpenTextFile
    , params: [ Argonaut.encodeJson content ]
    }

newtype Command
  = Command
  { command :: NonEmptyString, params :: Array Argonaut.Json }

commandToCommandUri :: Command -> NonEmptyString
commandToCommandUri (Command { command, params }) =
  NonEmptyString.appendString
    ( Prelude.append
        (NonEmptyString.nes (Proxy :: _ "command:"))
        command
    )
    ( if Array.null params then
        ""
      else
        ( Prelude.append "?"
            ( encodeUriComponent
                (Argonaut.stringify (Argonaut.encodeJson params))
            )
        )
    )

foreign import encodeUriComponent :: String -> String
