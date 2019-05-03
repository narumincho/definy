module Project.ModuleDefinition exposing
    ( Emit(..)
    , ModuleDefinition
    , Msg(..)
    , allModuleIndex
    , getModule
    , getTypeName
    , init
    , setModule
    , update
    )

import Label as L
import Project.ModuleDefinition.Module.PartDef as Def
import Project.ModuleDefinition.Module.PartDef.Expr as Expr
import Project.ModuleDefinition.Module.PartDef.Name as PartDefName
import Project.ModuleDefinition.Module.PartDef.Type as PartDefType
import Project.ModuleDefinition.Module.TypeDef as TypeDef
import Project.ModuleDefinition.ModuleWithCache as ModuleWithCache
import Project.ModuleDefinitionIndex as ModuleDefinitionIndex


type ModuleDefinition
    = ModuleDefinition
        { sampleModule : ModuleWithCache.ModuleWithResult
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
--type Module
--    = Module
--        { module_ : ModuleWithCache.Module
--        , children : List Module
--        }


init : ( ModuleDefinition, List Emit )
init =
    let
        ( sampleModule, sampleModuleEmit ) =
            initSampleModule
    in
    ( ModuleDefinition
        { sampleModule = sampleModule
        }
    , sampleModuleEmit
    )


type Msg
    = MsgModule
        { moduleIndex : ModuleDefinitionIndex.ModuleIndex
        , moduleMsg : ModuleWithCache.Msg
        }


type Emit
    = EmitModule
        { moduleIndex : ModuleDefinitionIndex.ModuleIndex
        , moduleEmit : ModuleWithCache.Emit
        }


update : Msg -> ModuleDefinition -> ( ModuleDefinition, List Emit )
update msg source =
    case msg of
        MsgModule { moduleIndex, moduleMsg } ->
            let
                ( newModule, emitList ) =
                    source
                        |> getModule moduleIndex
                        |> ModuleWithCache.update moduleMsg
            in
            ( source
                |> setModule moduleIndex newModule
            , emitList
                |> List.map
                    (\e ->
                        EmitModule
                            { moduleIndex = moduleIndex
                            , moduleEmit = e
                            }
                    )
            )



{-
   initCore : ( ModuleWithCache.ModuleWithResult, List ModuleWithCache.Emit )
   initCore =
       ModuleWithCache.init
           { name = L.make L.hc [ L.oo, L.or, L.oe ]
           , readMe = "プログラムに最低限必要なものが含まれている標準ライブラリ。足し算引き算、論理演算などの演算や、リスト、辞書、集合などの基本データ構造を含む"
           , typeDefList = []
           , partDefList =
               [ Def.make
                   { name = PartDefName.fromLabel (L.make L.ha [ L.ob, L.os ])
                   , type_ = PartDefType.empty
                   , expr = Expr.empty
                   }
               ]
           }


   initCoreInt32 : ( ModuleWithCache.ModuleWithResult, List ModuleWithCache.Emit )
   initCoreInt32 =
       ModuleWithCache.init
           { name = L.make L.hi [ L.on, L.ot, L.o3, L.o2 ]
           , readMe = "WebAssemblyでサポートされている32bit符号付き整数を扱えるようになる"
           , typeDefList =
               [ TypeDef.typeDefInt ]
           , partDefList =
               [ Def.make
                   { name =
                       PartDefName.fromLabel
                           (L.make L.ho
                               [ L.on, L.oe, L.oP, L.ol, L.ou, L.os, L.oT, L.ow, L.oo ]
                           )
                   , type_ =
                       PartDefType.Valid
                           (ModuleDefinitionIndex.TypeIndex
                               { moduleIndex = ModuleDefinitionIndex.CoreInt32
                               , typeIndex = ModuleIndex.TypeDefIndex 0
                               }
                           )
                   , expr =
                       Expr.make
                           (Expr.Int32Literal 1)
                           [ ( Expr.Add
                             , Expr.Int32Literal 2
                             )
                           ]
                   }
               , Def.make
                   { name =
                       PartDefName.fromLabel
                           (L.make L.ha
                               [ L.od, L.od ]
                           )
                   , type_ = PartDefType.empty
                   , expr =
                       Expr.empty
                   }
               ]
           }
-}


initSampleModule : ( ModuleWithCache.ModuleWithResult, List Emit )
initSampleModule =
    ModuleWithCache.init
        { name = sampleModuleName
        , readMe = ""
        , typeDefList = []
        , partDefList =
            [ Def.make
                { name =
                    PartDefName.fromLabel
                        (L.make L.hp
                            [ L.oo, L.oi, L.on, L.ot ]
                        )
                , type_ = PartDefType.empty
                , expr =
                    Expr.make
                        (Expr.Int32Literal 1)
                        [ ( Expr.Add
                          , Expr.Int32Literal 2
                          )
                        , ( Expr.Mul
                          , Expr.Parentheses
                                (Expr.make
                                    (Expr.Int32Literal 3)
                                    [ ( Expr.Add
                                      , Expr.Int32Literal 4
                                      )
                                    , ( Expr.Sub
                                      , Expr.Parentheses
                                            (Expr.make
                                                (Expr.Int32Literal 5)
                                                [ ( Expr.Add
                                                  , Expr.Parentheses
                                                        (Expr.make
                                                            (Expr.Parentheses (Expr.make (Expr.Int32Literal 6) []))
                                                            [ ( Expr.Add
                                                              , Expr.Int32Literal 7
                                                              )
                                                            ]
                                                        )
                                                  )
                                                ]
                                            )
                                      )
                                    , ( Expr.Add, Expr.Int32Literal 8 )
                                    ]
                                )
                          )
                        , ( Expr.Add, Expr.Int32Literal 9 )
                        ]
                }
            ]
        }
        |> Tuple.mapSecond (List.map (\moduleEmit -> EmitModule { moduleIndex = ModuleDefinitionIndex.SampleModule, moduleEmit = moduleEmit }))


{-| SampleModule
-}
sampleModuleName : L.Label
sampleModuleName =
    L.make
        L.hs
        [ L.oa, L.om, L.op, L.ol, L.oe, L.oM, L.oo, L.od, L.ou, L.ol, L.oe ]


{-| 参照からモジュールを取得する
-}
getModule : ModuleDefinitionIndex.ModuleIndex -> ModuleDefinition -> ModuleWithCache.ModuleWithResult
getModule moduleRef (ModuleDefinition source) =
    case moduleRef of
        ModuleDefinitionIndex.SampleModule ->
            source.sampleModule


{-| 参照からモジュールを設定する
-}
setModule : ModuleDefinitionIndex.ModuleIndex -> ModuleWithCache.ModuleWithResult -> ModuleDefinition -> ModuleDefinition
setModule moduleRef module_ (ModuleDefinition rec) =
    case moduleRef of
        ModuleDefinitionIndex.SampleModule ->
            ModuleDefinition
                { rec | sampleModule = module_ }


allModuleIndex : ModuleDefinition -> List ModuleDefinitionIndex.ModuleIndex
allModuleIndex _ =
    [ ModuleDefinitionIndex.SampleModule
    ]


getTypeName : PartDefType.Type -> ModuleDefinition -> Maybe L.Label
getTypeName type_ source =
    case type_ of
        PartDefType.Valid (ModuleDefinitionIndex.TypeIndex { moduleIndex, typeIndex }) ->
            source
                |> getModule moduleIndex
                |> ModuleWithCache.getTypeDef typeIndex
                |> Maybe.map TypeDef.getName

        PartDefType.Empty ->
            Nothing
