module User exposing (User)

import Label as L
import Project


type User
    = User
        { id : L.Label
        , displayName : String
        , description : String
        , createdProject : List Project.Project
        }


definy : User
definy =
    User
        { id =
            L.make
                L.hd
                [ L.oe, L.of_, L.oi, L.on, L.oy ]
        , displayName = "narumincho"
        , description = "Definyの開発者"
        , createdProject = [ Tuple.first (Project.init (L.make L.hc [ L.oo, L.or, L.oe ])) ]
        }


sampleUser : User
sampleUser =
    User
        { id =
            L.make
                L.hs
                [ L.oa, L.om, L.op, L.ol, L.oe, L.oU, L.os, L.oe, L.or ]
        , displayName = "サンプルユーザー"
        , description = "デバッグ目的で作られたアカウント"
        , createdProject = []
        }
