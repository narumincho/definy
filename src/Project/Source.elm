module Project.Source exposing (ModuleRef(..), Source, allModuleRef, getModule, init, mapModule, setModule)

import Project.Label as Label
import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Expr.Operator as Op
import Project.Source.Module.Def.Expr.Term as Term
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Source.ModuleWithCache as ModuleWithCache
import Utility.Map


type Source
    = Source
        { core : ModuleWithCache.Module
        , coreInt32 : ModuleWithCache.Module
        , sampleModule : ModuleWithCache.Module
        }



{-
   type RootModule
       = RootModuleLibrary
           { name : Label.Label
           , author : Label.Label
           , originalName : Label.Label
           , version : String
           }
       | RootModuleModule Module
-}


{-| モジュールの参照
-}
type ModuleRef
    = Core
    | CoreInt32
    | SampleModule



--type Module
--    = Module
--        { module_ : ModuleWithCache.Module
--        , children : List Module
--        }


init : Source
init =
    Source
        { core =
            ModuleWithCache.make
                { name = Label.make Label.hc [ Label.oo, Label.or, Label.oe ]
                , defList =
                    [ Def.make
                        { name = Name.fromLabel (Label.make Label.ha [ Label.ob, Label.os ])
                        , type_ = Type.empty
                        , expr = Expr.empty
                        }
                    ]
                , readMe = "プログラムに最低限必要なものが含まれている標準ライブラリ。足し算引き算、論理演算などの演算や、リスト、辞書、集合などの基本データ構造を含む"
                }
        , coreInt32 =
            ModuleWithCache.make
                { name = Label.make Label.hi [ Label.on, Label.ot, Label.o3, Label.o2 ]
                , defList =
                    [ Def.make
                        { name =
                            Name.fromLabel
                                (Label.make Label.ho
                                    [ Label.on, Label.oe, Label.oP, Label.ol, Label.ou, Label.os, Label.oT, Label.ow, Label.oo ]
                                )
                        , type_ = Type.int
                        , expr =
                            Expr.make
                                (Term.fromInt 1)
                                [ ( Op.add
                                  , Term.fromInt 2
                                  )
                                ]
                        }
                    , Def.make
                        { name =
                            Name.fromLabel
                                (Label.make Label.ha
                                    [ Label.od, Label.od ]
                                )
                        , type_ = Type.int
                        , expr =
                            Expr.empty
                        }
                    ]
                , readMe = "WebAssemblyでサポートされている32bit符号付き整数を扱えるようになる"
                }
        , sampleModule =
            ModuleWithCache.make
                { name = sampleModuleName
                , defList =
                    [ Def.make
                        { name =
                            Name.fromLabel
                                (Label.make Label.hp
                                    [ Label.oo, Label.oi, Label.on, Label.ot ]
                                )
                        , type_ = Type.empty
                        , expr = Expr.empty
                        }
                    ]
                , readMe = ""
                }
        }


{-| SampleModule
-}
sampleModuleName : Label.Label
sampleModuleName =
    Label.make
        Label.hs
        [ Label.oa, Label.om, Label.op, Label.ol, Label.oe, Label.oM, Label.oo, Label.od, Label.ou, Label.ol, Label.oe ]


{-| 参照からモジュールを取得する
-}
getModule : ModuleRef -> Source -> ModuleWithCache.Module
getModule moduleRef (Source source) =
    case moduleRef of
        Core ->
            source.core

        CoreInt32 ->
            source.coreInt32

        SampleModule ->
            source.sampleModule


{-| 参照からモジュールを設定する
-}
setModule : ModuleRef -> ModuleWithCache.Module -> Source -> Source
setModule moduleRef module_ (Source rec) =
    case moduleRef of
        Core ->
            Source
                { rec | core = module_ }

        CoreInt32 ->
            Source
                { rec | coreInt32 = module_ }

        SampleModule ->
            Source
                { rec | sampleModule = module_ }


{-| 参照からモジュールを加工する
-}
mapModule : ModuleRef -> (ModuleWithCache.Module -> ModuleWithCache.Module) -> Source -> Source
mapModule moduleRef =
    Utility.Map.toMapper
        (getModule moduleRef)
        (setModule moduleRef)


allModuleRef : Source -> List ModuleRef
allModuleRef _ =
    [ Core
    , CoreInt32
    , SampleModule
    ]
