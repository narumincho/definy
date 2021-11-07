module Definy.Start where

import Prelude as Prelude
import Definy.Build as Build
import Definy.Mode as Mode
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console

main :: Effect.Effect Prelude.Unit
main =
  Aff.runAff_ Console.logShow
    ( Aff.attempt
        (Build.build Mode.Develpment)
    )
