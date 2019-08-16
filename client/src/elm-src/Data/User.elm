module Data.User exposing (User, getId, getName, make)

import Data.ProjectId as ProjectId
import Data.UserId as UserId
import Time


type User
    = User
        { id : UserId.UserId
        , name : String
        , image : String
        , introduction : String
        , createdAt : Time.Posix
        , leaderProjectIds : List ProjectId.ProjectId
        , editingProjectIds : List ProjectId.ProjectId
        }


make :
    { id : UserId.UserId
    , name : String
    , image : String
    , introduction : String
    , createdAt : Time.Posix
    , leaderProjectIds : List ProjectId.ProjectId
    , editingProjectIds : List ProjectId.ProjectId
    }
    -> User
make =
    User


getId : User -> UserId.UserId
getId (User { id }) =
    id


getName : User -> String
getName (User { name }) =
    name
