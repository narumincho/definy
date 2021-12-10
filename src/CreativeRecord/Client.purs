module CreativeRecord.Client (main) where

import Prelude
import CreativeRecord.Location as Location
import CreativeRecord.View as CreativeRecordView
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
              { state: unit
              , messageList: []
              }
        , update: \_ _ -> unit
        , stateToView: \_ -> (CreativeRecordView.view (Location.fromPath location))
        }
    )

foreign import getLocation :: Effect String

getLocationAsPath :: Effect StructuredUrl.PathAndSearchParams
getLocationAsPath = map StructuredUrl.pathAndSearchParamsFromString getLocation
