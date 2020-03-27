module Data.UrlData exposing (urlDataToString)

import Data


urlDataToString : Data.UrlData -> String
urlDataToString urlData =
    clientModeToString urlData.clientMode
        ++ locationToString urlData.location
        ++ languageToQueryString urlData.language


clientModeToString : Data.ClientMode -> String
clientModeToString clientMode =
    case clientMode of
        Data.ClientModeDebugMode int ->
            "http://[::1]:" ++ String.fromInt int

        Data.ClientModeRelease ->
            "https://definy.app"


locationToString : Data.Location -> String
locationToString location =
    case location of
        Data.LocationHome ->
            "/"

        Data.LocationCreateProject ->
            "/create-project"

        Data.LocationUser (Data.UserId userId) ->
            "/user/" ++ userId

        Data.LocationProject (Data.ProjectId projectId) ->
            "/project" ++ projectId


languageToQueryString : Data.Language -> String
languageToQueryString language =
    "?hl=" ++ languageToIdString language


languageToIdString : Data.Language -> String
languageToIdString language =
    case language of
        Data.LanguageJapanese ->
            "ja"

        Data.LanguageEnglish ->
            "en"

        Data.LanguageEsperanto ->
            "eo"
