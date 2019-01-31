module Suggestion exposing
    ( name
    , type_
    )

import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Label as L


name : Name.Name -> List ( L.Label, String )
name _ =
    [ ( L.make L.hg [ L.oa, L.om, L.oe ], "ゲーム" )
    , ( L.make L.hh [ L.oe, L.or, L.oo ], "主人公" )
    , ( L.make L.hb [ L.oe, L.oa, L.ou, L.ot, L.of_, L.ou, L.ol, L.oG, L.oi, L.or, L.ol ], "美少女" )
    , ( L.make L.hm [ L.oo, L.on, L.os, L.ot, L.oe, L.or ], "モンスター" )
    , ( L.make L.hw [ L.oo, L.or, L.ol, L.od ], "世界" )
    ]


type_ : Type.Type -> List ( Type.ValidType, String )
type_ _ =
    [ ( Type.int, "32bit整数" ) ]
