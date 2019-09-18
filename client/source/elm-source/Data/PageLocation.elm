module Data.PageLocation exposing (InitPageLocation(..), initFromUrl)

import Data.User
import Dict
import Erl
import Url


type InitPageLocation
    = InitWelcome


initFromUrl : Url.Url -> ( Maybe Data.User.AccessToken, InitPageLocation )
initFromUrl url =
    let
        { path, hash } =
            url
                |> Url.toString
                |> Erl.parse

        fragmentDict =
            (Erl.parse ("?" ++ hash)).query
                |> Dict.fromList
    in
    ( fragmentDict
        |> Dict.get "accessToken"
        |> Maybe.map Data.User.accessTokenFromString
    , InitWelcome
    )
