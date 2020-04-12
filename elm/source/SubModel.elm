module SubModel exposing (SubModel, WindowSize, addImageBlobUrl, from, getClientMode, getImageBlobUrl, getLanguage, getLogInState, getTimeZoneAndNameMaybe, getWindowSize, setClientMode, setLanguageAndClientMode, setLogInState, setTimeZoneAndName, setWindowSize)

import Data
import Data.LogInState
import Data.TimeZoneAndName
import Dict


type SubModel
    = SubModel
        { logInState : Data.LogInState.LogInState
        , language : Data.Language
        , clientMode : Data.ClientMode
        , imageFileBlobDict : Dict.Dict String String
        , timeZoneAndNameMaybe : Maybe Data.TimeZoneAndName.TimeZoneAndName
        , windowSize : WindowSize
        }


type alias WindowSize =
    { width : Int, height : Int }


from :
    { logInState : Data.LogInState.LogInState
    , language : Data.Language
    , clientMode : Data.ClientMode
    , timeZoneAndNameMaybe : Maybe Data.TimeZoneAndName.TimeZoneAndName
    , windowSize : WindowSize
    }
    -> SubModel
from record =
    SubModel
        { logInState = record.logInState
        , language = record.language
        , clientMode = record.clientMode
        , imageFileBlobDict = Dict.empty
        , timeZoneAndNameMaybe = record.timeZoneAndNameMaybe
        , windowSize = record.windowSize
        }


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


addImageBlobUrl : Data.FileHash -> String -> SubModel -> SubModel
addImageBlobUrl (Data.FileHash hash) blobUrl (SubModel record) =
    SubModel
        { record | imageFileBlobDict = Dict.insert hash blobUrl record.imageFileBlobDict }


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


getImageBlobUrl : Data.FileHash -> SubModel -> Maybe String
getImageBlobUrl (Data.FileHash hash) (SubModel record) =
    Dict.get hash record.imageFileBlobDict
