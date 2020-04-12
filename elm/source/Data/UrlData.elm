module Data.UrlData exposing (urlDataFromUrl, urlDataToUrl)

import Data
import Dict
import Url
import Url.Parser
import Url.Parser.Query


urlDataFromUrl : Url.Url -> Data.UrlData
urlDataFromUrl url =
    { clientMode = clientModeFromUrl url
    , location = locationFromPath url.path
    , language =
        Url.Parser.parse (Url.Parser.query languageParser) url
            |> Maybe.withDefault Data.LanguageEnglish
    }


clientModeFromUrl : Url.Url -> Data.ClientMode
clientModeFromUrl url =
    case ( url.protocol, url.host, url.port_ ) of
        ( Url.Http, "localhost", Just 2520 ) ->
            Data.ClientModeDebugMode

        ( _, _, _ ) ->
            Data.ClientModeRelease


locationFromPath : String -> Data.Location
locationFromPath path =
    case String.split "/" path of
        [ "", "create-project" ] ->
            Data.LocationCreateProject

        [ "", "create-idea", id ] ->
            if isIdString id then
                Data.LocationCreateIdea (Data.ProjectId id)

            else
                Data.LocationHome

        [ "", "user", id ] ->
            if isIdString id then
                Data.LocationUser (Data.UserId id)

            else
                Data.LocationHome

        [ "", "project", id ] ->
            if isIdString id then
                Data.LocationProject (Data.ProjectId id)

            else
                Data.LocationHome

        [ "", "idea", id ] ->
            if isIdString id then
                Data.LocationIdea (Data.IdeaId id)

            else
                Data.LocationHome

        _ ->
            Data.LocationHome


languageParser : Url.Parser.Query.Parser Data.Language
languageParser =
    Url.Parser.Query.enum
        "hl"
        (Dict.fromList
            [ ( "ja", Data.LanguageJapanese )
            , ( "en", Data.LanguageEnglish )
            , ( "eo", Data.LanguageEsperanto )
            ]
        )
        |> Url.Parser.Query.map (Maybe.withDefault Data.LanguageEnglish)


isIdString : String -> Bool
isIdString string =
    (String.length string == 32)
        && String.all (\char -> String.contains (String.fromChar char) "0123456789abcdef") string


urlDataToUrl : Data.UrlData -> Url.Url
urlDataToUrl urlData =
    { protocol =
        case urlData.clientMode of
            Data.ClientModeDebugMode ->
                Url.Http

            Data.ClientModeRelease ->
                Url.Https
    , host =
        case urlData.clientMode of
            Data.ClientModeDebugMode ->
                "localhost"

            Data.ClientModeRelease ->
                "definy.app"
    , port_ =
        case urlData.clientMode of
            Data.ClientModeDebugMode ->
                Just 2520

            Data.ClientModeRelease ->
                Nothing
    , path = "/" ++ String.join "/" (locationToPathStringList urlData.location)
    , query = Just ("hl=" ++ languageToIdString urlData.language)
    , fragment = Nothing
    }


locationToPathStringList : Data.Location -> List String
locationToPathStringList location =
    case location of
        Data.LocationHome ->
            []

        Data.LocationCreateProject ->
            [ "create-project" ]

        Data.LocationCreateIdea (Data.ProjectId projectId) ->
            [ "create-idea", projectId ]

        Data.LocationUser (Data.UserId userId) ->
            [ "user", userId ]

        Data.LocationProject (Data.ProjectId projectId) ->
            [ "project", projectId ]

        Data.LocationIdea (Data.IdeaId ideaId) ->
            [ "idea", ideaId ]


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
