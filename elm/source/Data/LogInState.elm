module Data.LogInState exposing (LogInState(..))

import Data


type LogInState
    = ReadingAccessToken
    | VerifyingAccessToken Data.AccessToken
    | GuestUser
    | Ok
        { user : Data.UserPublic
        , accessToken : Data.AccessToken
        }
