module Data.LogInState exposing (LogInState(..))

import Data


type LogInState
    = GuestUser
    | RequestLogInUrl Data.OpenIdConnectProvider
    | VerifyingAccessToken Data.AccessToken
    | Ok
        { accessToken : Data.AccessToken
        , userId : Data.UserId
        , user : Data.UserPublic
        }
