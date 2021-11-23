module CreativeRecord.Client (main) where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import Data.Map as Map
import Effect as Effect
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import View.ToVdom as ViewToVdom
import Vdom.Render as Render
import Vdom.RenderState as RenderState
import CreativeRecord.View as CreativeRecordView

main :: Effect.Effect Prelude.Unit
main =
  Render.resetAndRender
    ( ViewToVdom.toVdom
        ( StructuredUrl.pathAndSearchParams
            [ ClientProgramHashValue.clientProgramHashValue ]
            Map.empty
        )
        CreativeRecordView.view
    )
    (RenderState.empty)
