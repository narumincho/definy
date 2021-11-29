module CreativeRecord.Client (main) where

import Prelude
import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Location as Location
import CreativeRecord.View as CreativeRecordView
import Data.Map as Map
import Effect (Effect)
import StructuredUrl as StructuredUrl
import Vdom.Render as Render
import Vdom.RenderState as RenderState
import View.ToVdom as ViewToVdom

main :: Effect Unit
main = do
  location <- getLocationAsPath
  Render.resetAndRender
    ( ViewToVdom.toVdom
        ( StructuredUrl.pathAndSearchParams
            [ ClientProgramHashValue.clientProgramHashValue ]
            Map.empty
        )
        (CreativeRecordView.view (Location.fromPath location))
    )
    (RenderState.empty)

foreign import getLocation :: Effect String

getLocationAsPath :: Effect StructuredUrl.PathAndSearchParams
getLocationAsPath = map StructuredUrl.pathAndSearchParamsFromString getLocation
