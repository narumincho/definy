module Data.LogInState exposing (LogInState(..))

import Data


type LogInState
    = GuestUser
    | RequestLogInUrl Data.OpenIdConnectProvider
    | VerifyingAccessToken Data.AccessToken
    | Ok
        { accessToken : Data.AccessToken
        , userSnapshotAndId : Data.UserSnapshotAndId
        }
