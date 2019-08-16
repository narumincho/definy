module Data.Project exposing (Project(..), ProjectId)

import Data.Id as Id
import Data.Label as Label
import Time


type Project
    = Project
        { id : ProjectId
        , name : Label.Label
        , leader : Id.UserId
        , editors : List Id.UserId
        , updateAt : Time.Posix
        , createdAt : Time.Posix
        , modules : List Id.ModuleId
        }


type ProjectId
    = ProjectId String
