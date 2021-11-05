module CreativeRecord.Client (main) where

import Console as Console
import Effect as Effect
import Prelude as Prelude
import CreativeRecord.Top as Top

main :: Effect.Effect Prelude.Unit
main = Console.logValue "topBox" Top.topBox
