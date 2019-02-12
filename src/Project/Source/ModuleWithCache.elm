module Project.Source.ModuleWithCache exposing
    ( DefAndResult
    , Module(..)
    , addDef
    , defAndResultGetCompileResult
    , defAndResultGetDef
    , defAndResultGetEvalResult
    , getDef
    , getDefAndResultList
    , getDefList
    , getDefNum
    , getName
    , getReadMe
    , make
    , mapDef
    , setCompileResult
    , setDefExpr
    , setDefName
    , setDefType
    , setEvalResult
    , setName
    , setReadMe
    )

import Compiler
import Compiler.Marger
import Project.Label as Label
import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr
import Project.Source.Module.Def.Name
import Project.Source.Module.Def.Type
import Project.Source.Module.TypeDef as TypeDef
import Utility.ListExtra
import Utility.Map


type Module
    = Module
        { name : Label.Label
        , typeDefList : List TypeDef.TypeDef
        , defAndCacheList : List DefAndResult
        , readMe : String
        }


type DefAndResult
    = DefAndResult
        { def : Def.Def
        , compileResult : Maybe Compiler.CompileResult
        , evalResult : Maybe Int
        }


make : { name : Label.Label, defList : List Def.Def, readMe : String } -> Module
make { name, defList, readMe } =
    Module
        { name = name
        , typeDefList = []
        , defAndCacheList =
            defList
                |> List.take 65535
                -- 定義の数の上限
                |> List.map
                    (\def ->
                        DefAndResult
                            { def = def
                            , compileResult = Nothing
                            , evalResult = Nothing
                            }
                    )
        , readMe = readMe
        }


{-| Moduleの名前を取得する
-}
getName : Module -> Label.Label
getName (Module { name }) =
    name


{-| Moduleの名前を設定する
-}
setName : Label.Label -> Module -> Module
setName name (Module rec) =
    Module
        { rec | name = name }


{-| ModuleのReadMeを取得する
-}
getReadMe : Module -> String
getReadMe (Module { readMe }) =
    readMe


{-| ModuleのReadMeを設定する
-}
setReadMe : String -> Module -> Module
setReadMe string (Module rec) =
    Module
        { rec | readMe = string }


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果のListを取得する
-}
getDefAndResultList : Module -> List DefAndResult
getDefAndResultList (Module { defAndCacheList }) =
    defAndCacheList


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果のListを設定する
-}
setDefAndResultList : List DefAndResult -> Module -> Module
setDefAndResultList defAndResultList (Module rec) =
    Module
        { rec | defAndCacheList = defAndResultList }


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果のListを加工する
-}
mapDefAndResultList : (List DefAndResult -> List DefAndResult) -> Module -> Module
mapDefAndResultList =
    Utility.Map.toMapper
        getDefAndResultList
        setDefAndResultList


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果を取得する
-}
getDefAndResult : Int -> Module -> Maybe DefAndResult
getDefAndResult index =
    getDefAndResultList >> Utility.ListExtra.getAt index


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果を設定する
-}
setDefAndResult : Int -> DefAndResult -> Module -> Module
setDefAndResult index defAndResult =
    mapDefAndResultList
        (Utility.ListExtra.setAt index defAndResult)


{-| Moduleで定義されているDefとそのコンパイル結果と評価結果を加工する
-}
mapDefAndResult : Int -> (DefAndResult -> DefAndResult) -> Module -> Module
mapDefAndResult index =
    Utility.Map.toMapperGetterMaybe
        (getDefAndResult index)
        (setDefAndResult index)


{-| Moduleで定義されているDefのListを取得する
-}
getDefList : Module -> List Def.Def
getDefList =
    getDefAndResultList >> List.map defAndResultGetDef


{-| Moduleで定義されているDefを取得する
-}
getDef : Int -> Module -> Maybe Def.Def
getDef index module_ =
    getDefList module_
        |> Utility.ListExtra.getAt index


{-| コンパイル結果と評価結果がない定義を設定
-}
setDef : Int -> Def.Def -> Module -> Module
setDef index def (Module rec) =
    Module
        { rec
            | defAndCacheList =
                rec.defAndCacheList
                    |> Utility.ListExtra.setAt index
                        (DefAndResult
                            { def = def
                            , compileResult = Nothing
                            , evalResult = Nothing
                            }
                        )
        }


{-| 定義を加工する
-}
mapDef : Int -> (Def.Def -> Def.Def) -> Module -> Module
mapDef index =
    Utility.Map.toMapperGetterMaybe
        (getDef index)
        (setDef index)


setCompileResult : Int -> Compiler.CompileResult -> Module -> Module
setCompileResult index compileResult =
    mapDefAndResult index
        (defAndResultSetCompileResult compileResult)


setEvalResult : Int -> Int -> Module -> Module
setEvalResult index evalResult =
    mapDefAndResult index
        (defAndResultSetEvalResult evalResult)


{-| 定義の個数
-}
getDefNum : Module -> Int
getDefNum =
    getDefList >> List.length


{-| 指定したindexの定義の名前を設定する。なければ、なにもしない
-}
setDefName : Int -> Project.Source.Module.Def.Name.Name -> Module -> Module
setDefName index name module_ =
    case getDef index module_ of
        Just def ->
            module_
                |> setDef index (def |> Def.setName name)

        Nothing ->
            module_


{-| 指定したindexの定義の型を設定する。なければ、なにもしない
-}
setDefType : Int -> Project.Source.Module.Def.Type.Type -> Module -> Module
setDefType index type_ module_ =
    case getDef index module_ of
        Just def ->
            module_
                |> setDef index (def |> Def.setType type_)

        Nothing ->
            module_


{-| 指定したindexの定義の式を設定する。なければ、なにもしない
-}
setDefExpr : Int -> Project.Source.Module.Def.Expr.Expr -> Module -> Module
setDefExpr index expr module_ =
    case getDef index module_ of
        Just def ->
            module_
                |> setDef index (def |> Def.setExpr expr)

        Nothing ->
            module_


{-| 定義を末尾に追加する
-}
addDef : Def.Def -> Module -> Module
addDef def (Module rec) =
    Module
        { rec
            | defAndCacheList =
                if 65535 <= List.length rec.defAndCacheList then
                    List.take 65535 rec.defAndCacheList

                else
                    rec.defAndCacheList
                        ++ [ DefAndResult
                                { def = def
                                , compileResult = Nothing
                                , evalResult = Nothing
                                }
                           ]
        }


defAndResultGetDef : DefAndResult -> Def.Def
defAndResultGetDef (DefAndResult { def }) =
    def


defAndResultGetCompileResult : DefAndResult -> Maybe Compiler.CompileResult
defAndResultGetCompileResult (DefAndResult { compileResult }) =
    compileResult


defAndResultGetEvalResult : DefAndResult -> Maybe Int
defAndResultGetEvalResult (DefAndResult { evalResult }) =
    evalResult


defAndResultSetDef : Def.Def -> DefAndResult -> DefAndResult
defAndResultSetDef def (DefAndResult rec) =
    DefAndResult
        { rec
            | def = def
        }


defAndResultSetCompileResult : Compiler.CompileResult -> DefAndResult -> DefAndResult
defAndResultSetCompileResult compileResult (DefAndResult rec) =
    DefAndResult
        { rec
            | compileResult = Just compileResult
        }


defAndResultSetEvalResult : Int -> DefAndResult -> DefAndResult
defAndResultSetEvalResult evalResult (DefAndResult rec) =
    DefAndResult
        { rec
            | evalResult = Just evalResult
        }
