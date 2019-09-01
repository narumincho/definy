module Data.Project exposing
    ( Project
    , getLeaderName
    , getName
    , sample
    )

import Data.IdHash as Id
import Data.Label as Label
import Data.Project.Module
import Time


type Project
    = Project
        { id : Id.ProjectId
        , name : Label.Label
        , leader : Id.UserId
        , editors : List Id.UserId
        , updateAt : Time.Posix
        , createdAt : Time.Posix
        , modules : List Id.ModuleId
        }


getName : Project -> Label.Label
getName (Project { name }) =
    name


getLeaderName : Project -> String
getLeaderName _ =
    "キャッシュから読み込みたい"


sample : Project
sample =
    Project
        { id = Id.ProjectId "sample"
        , name =
            Label.from Label.hs
                [ Label.oa
                , Label.om
                , Label.op
                , Label.ol
                , Label.oe
                , Label.oP
                , Label.or
                , Label.oo
                , Label.oj
                , Label.oe
                , Label.oc
                , Label.ot
                ]
        , leader = Id.UserId "sampleProjectLeader"
        , editors = []
        , updateAt = Time.millisToPosix 0
        , createdAt = Time.millisToPosix 0
        , modules = [ Id.ModuleId "sampleModuleId" ]
        }
