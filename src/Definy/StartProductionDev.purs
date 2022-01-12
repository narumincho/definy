module Definy.StartProductionDev
  ( main
  ) where

import Console as Console
import Data.String.NonEmpty as NonEmptyString
import Definy.Build as Build
import Effect as Effect
import Effect.Aff as Aff
import Prelude as Prelude
import ProductionOrDevelopment as ProductionOrDevelopment
import Type.Proxy (Proxy(..))

main :: Effect.Effect Prelude.Unit
main =
  Aff.runAff_ (Console.logValue "definy build production dev by PureScript:")
    ( Aff.attempt
        ( Build.build ProductionOrDevelopment.Production
            ( NonEmptyString.nes
                (Proxy :: _ "https://definy-dev.web.app")
            )
        )
    )
