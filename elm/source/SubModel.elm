module SubModel exposing (SubModel, WindowSize, from, getClientMode, getImageStore, getLanguage, getLogInState, getTimeZoneAndNameMaybe, getWindowSize, mapImageStore, setClientMode, setLanguageAndClientMode, setLogInState, setTimeZoneAndName, setWindowSize)

import Data
import Data.LogInState
import Data.TimeZoneAndName
import ImageStore


type SubModel
    = SubModel
        { logInState : Data.LogInState.LogInState
        , language : Data.Language
        , clientMode : Data.ClientMode
        , imageStore : ImageStore.ImageStore
        , timeZoneAndNameMaybe : Maybe Data.TimeZoneAndName.TimeZoneAndName
        , windowSize : WindowSize
        }


type alias WindowSize =
    { width : Int, height : Int }


from :
    { logInState : Data.LogInState.LogInState
    , language : Data.Language
    , clientMode : Data.ClientMode
    , imageStore : ImageStore.ImageStore
    , timeZoneAndNameMaybe : Maybe Data.TimeZoneAndName.TimeZoneAndName
    , windowSize : WindowSize
    }
    -> SubModel
from =
    SubModel


getLogInState : SubModel -> Data.LogInState.LogInState
getLogInState (SubModel record) =
    record.logInState


setLogInState : Data.LogInState.LogInState -> SubModel -> SubModel
setLogInState logInState (SubModel record) =
    SubModel { record | logInState = logInState }


getLanguage : SubModel -> Data.Language
getLanguage (SubModel record) =
    record.language


getClientMode : SubModel -> Data.ClientMode
getClientMode (SubModel record) =
    record.clientMode


setClientMode : Data.ClientMode -> SubModel -> SubModel
setClientMode clientMode (SubModel record) =
    SubModel
        { record | clientMode = clientMode }


setLanguageAndClientMode : Data.Language -> Data.ClientMode -> SubModel -> SubModel
setLanguageAndClientMode language clientMode (SubModel record) =
    SubModel
        { record | language = language, clientMode = clientMode }


getImageStore : SubModel -> ImageStore.ImageStore
getImageStore (SubModel record) =
    record.imageStore


mapImageStore : (ImageStore.ImageStore -> ImageStore.ImageStore) -> SubModel -> SubModel
mapImageStore imageStoreFunction (SubModel record) =
    SubModel
        { record | imageStore = imageStoreFunction record.imageStore }


getTimeZoneAndNameMaybe : SubModel -> Maybe Data.TimeZoneAndName.TimeZoneAndName
getTimeZoneAndNameMaybe (SubModel record) =
    record.timeZoneAndNameMaybe


setTimeZoneAndName : Data.TimeZoneAndName.TimeZoneAndName -> SubModel -> SubModel
setTimeZoneAndName timeZoneAndName (SubModel record) =
    SubModel { record | timeZoneAndNameMaybe = Just timeZoneAndName }


getWindowSize : SubModel -> WindowSize
getWindowSize (SubModel record) =
    record.windowSize


setWindowSize : WindowSize -> SubModel -> SubModel
setWindowSize windowSize (SubModel record) =
    SubModel { record | windowSize = windowSize }
