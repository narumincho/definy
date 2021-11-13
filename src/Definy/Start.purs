module Definy.Start where

import Data.String.NonEmpty as NonEmptyString
import Definy.Build as Build
import Effect as Effect
import Effect.Aff as Aff
import Effect.Console as Console
import Prelude as Prelude
import Type.Proxy as Proxy
import ProductionOrDevelopment as ProductionOrDevelopment

main :: Effect.Effect Prelude.Unit
main =
  Aff.runAff_ Console.logShow
    ( Aff.attempt
        ( Build.build ProductionOrDevelopment.Develpment
            ( NonEmptyString.nes
                (Proxy.Proxy :: Proxy.Proxy "http://localhost:2520")
            )
        )
    )
