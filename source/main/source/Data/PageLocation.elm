module Data.PageLocation exposing (InitPageLocation(..), initFromUrl, initToUrlAsString)

import Data.User
import Dict
import Erl
import Url


type InitPageLocation
    = InitWelcome


initFromUrl : String -> ( Maybe Data.User.AccessToken, Maybe InitPageLocation )
initFromUrl url =
    let
        { path, hash } =
            url
                |> Erl.parse

        fragmentDict =
            (Erl.parse ("?" ++ hash)).query
                |> Dict.fromList
    in
    ( fragmentDict
        |> Dict.get "accessToken"
        |> Maybe.map Data.User.accessTokenFromString
    , [ ( welcomeParser, always InitWelcome ) ]
        |> oneOf path
    )


oneOf : List String -> List ( List String -> Maybe a, a -> b ) -> Maybe b
oneOf path list =
    case list of
        ( parser, resultFunc ) :: xs ->
            case parser path of
                Just result ->
                    Just (resultFunc result)

                Nothing ->
                    oneOf path xs

        [] ->
            Nothing


welcomeParser : List String -> Maybe ()
welcomeParser path =
    if path == [] then
        Just ()

    else
        Nothing


initToUrlAsString : InitPageLocation -> String
initToUrlAsString location =
    case location of
        InitWelcome ->
            "/"
