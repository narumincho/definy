module Data.User exposing
    ( AccessToken(..)
    , AccessTokenError(..)
    , LogInState(..)
    , User
    , accessTokenFromString
    , accessTokenToString
    , from
    , getId
    , getImageUrl
    , getName
    )

import Data.IdHash as Id
import Time


type LogInState
    = ReadingAccessToken
    | VerifyingAccessToken AccessToken
    | GuestUser (Maybe AccessTokenError)
    | Ok { user : User, accessToken : AccessToken }


type AccessTokenError
    = FailToReadIndexedDB -- IndexDBから正常にアクセストークンを読み取れなかった
    | AccessTokenIsInvalid -- 無効なアクセストークンが含まれていた


type AccessToken
    = AccessToken String


type User
    = User
        { id : Id.UserId
        , name : String
        , imageFileHash : Id.ImageFileHash
        , introduction : String
        , createdAt : Time.Posix
        , branches : List Id.BranchId
        }


from :
    { id : Id.UserId
    , name : String
    , imageFileHash : Id.ImageFileHash
    , introduction : String
    , createdAt : Time.Posix
    , branches : List Id.BranchId
    }
    -> User
from =
    User


getId : User -> Id.UserId
getId (User { id }) =
    id


getName : User -> String
getName (User { name }) =
    name


getImageUrl : User -> String
getImageUrl (User { imageFileHash }) =
    let
        (Id.ImageFileHash hashString) =
            imageFileHash
    in
    "https://us-central1-definy-lang.cloudfunctions.net/file/" ++ hashString


accessTokenFromString : String -> AccessToken
accessTokenFromString =
    AccessToken


accessTokenToString : AccessToken -> String
accessTokenToString (AccessToken string) =
    string
