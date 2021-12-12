module CreativeRecord.Client (main) where

import Prelude
import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
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
              { state: 0
              , messageList: []
              }
        , update:
            ( case _ of
                Message.CountUp -> (\state -> add state 1)
            )
        , stateToView: \state -> (CreativeRecordView.view (Location.fromPath location) state)
        }
    )

foreign import getLocation :: Effect String

getLocationAsPath :: Effect StructuredUrl.PathAndSearchParams
getLocationAsPath = map StructuredUrl.pathAndSearchParamsFromString getLocation
