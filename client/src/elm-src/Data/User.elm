module Data.User exposing (User, from, fromName, getId, getImageUrl, getName)

import Data.IdHash as Id
import Time


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
