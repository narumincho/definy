module Data.User exposing
    ( AccessToken(..)
    , AccessTokenError(..)
    , LogInState(..)
    , User
    , accessTokenFromString
    , accessTokenToString
    , from
    , fromName
    , getId
    , getImageUrl
    , getName
    )

import Data.IdHash as Id
import Time


type LogInState
    = ReadAccessToken
    | VerifyingAccessToken AccessToken
    | GuestUser (Maybe AccessTokenError)
    | Ok User


type AccessTokenError
    = FailToReadIndexedDB
    | AccessTokenIsInvalid


type AccessToken
    = AccessToken String


type User
    = User
        { id : Id.UserId
        , name : String
        , imageId : String
        , introduction : String
        , createdAt : Time.Posix
        , leaderProjectIds : List Id.ProjectId
        , editingProjectIds : List Id.ProjectId
        }


from :
    { id : Id.UserId
    , name : String
    , imageId : String
    , introduction : String
    , createdAt : Time.Posix
    , leaderProjectIds : List Id.ProjectId
    , editingProjectIds : List Id.ProjectId
    }
    -> User
from =
    User


fromName : String -> User
fromName name =
    User
        { id = Id.UserId "sampleUser"
        , name = name
        , imageId = ""
        , introduction = ""
        , createdAt = Time.millisToPosix 0
        , leaderProjectIds = []
        , editingProjectIds = []
        }


getId : User -> Id.UserId
getId (User { id }) =
    id


getName : User -> String
getName (User { name }) =
    name


getImageUrl : User -> String
getImageUrl (User { imageId }) =
    "https://us-central1-definy-lang.cloudfunctions.net/file/user-image/" ++ imageId


accessTokenFromString : String -> AccessToken
accessTokenFromString =
    AccessToken


accessTokenToString : AccessToken -> String
accessTokenToString (AccessToken string) =
    string
