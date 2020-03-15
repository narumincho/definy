module Data.LogInState exposing (LogInState(..))

import Data


type LogInState
    = GuestUser
    | RequestLogInUrl Data.OpenIdConnectProvider
    | VerifyingAccessToken Data.AccessToken
    | Ok
        { user : Data.UserPublic
        , accessToken : Data.AccessToken
        }
