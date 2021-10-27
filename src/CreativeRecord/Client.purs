module CreativeRecord.Client (main) where

import Effect as Effect
import Prelude as Prelude
import View.Render as Render

main :: Effect.Effect Prelude.Unit
main = Render.render
