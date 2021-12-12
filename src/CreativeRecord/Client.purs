module CreativeRecord.Client (main) where

import Prelude
import CreativeRecord.Location as Location
import CreativeRecord.View as CreativeRecordView
import CreativeRecord.State as State
import Data.Maybe (Maybe)
import Effect (Effect)
import StructuredUrl as StructuredUrl
import View.App as ViewApp

main :: Effect Unit
main = do
  location <- getLocationAsPath
  ViewApp.startApp
    ( ViewApp.App
        { initStateAndMessageList:
            ViewApp.StateAndMessageList
              { state: State.initState location
              , messageList: []
              }
        , update: State.update
        , stateToView: \state -> (CreativeRecordView.view state)
        }
    )

foreign import getLocation :: Effect String

getLocationAsPath :: Effect (Maybe Location.Location)
getLocationAsPath =
  map Location.fromPath
    (map StructuredUrl.pathAndSearchParamsFromString getLocation)
