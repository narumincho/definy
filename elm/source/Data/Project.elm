module Data.Project exposing
    ( Project
    , SimpleProject
    , getLeaderName
    , getName
    , sample
    , simpleFrom
    )

import Data
import Data.Label as Label
import Time


type SimpleProject
    = SimpleProject
        { id : Data.ProjectId
        , name : Label.Label
        , leader : Data.UserId
        }


type Project
    = Project
        { id : Data.ProjectId
        , name : Label.Label
        , leader : Data.UserId
        , editors : List Data.UserId
        , updateAt : Time.Posix
        , createdAt : Time.Posix
        , modules : List Data.ModuleId
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
        { id = Data.ProjectId "sample"
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
        , leader = Data.UserId "sampleProjectLeader"
        , editors = []
        , updateAt = Time.millisToPosix 0
        , createdAt = Time.millisToPosix 0
        , modules = [ Data.ModuleId "sampleModuleId" ]
        }


simpleFrom : { id : Data.ProjectId, name : Label.Label, leader : Data.UserId } -> SimpleProject
simpleFrom =
    SimpleProject
