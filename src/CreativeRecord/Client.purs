module CreativeRecord.Client (main) where

import Prelude
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import CreativeRecord.State as State
import CreativeRecord.View as CreativeRecordView
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
        , urlChangeMessageData: Message.ChangeLocation
        , pathAndSearchParamsToLocation: Location.fromPath
        , locationToPathAndSearchParams: Location.toPath
        }
    )

foreign import getLocation :: Effect String

getLocationAsPath :: Effect (Location.Location)
getLocationAsPath =
  map Location.fromPath
    (map StructuredUrl.pathAndSearchParamsFromString getLocation)
