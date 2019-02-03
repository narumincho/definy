module Project.Source.ModuleWithCache exposing
    ( Module(..)
    , addDef
    , deleteDefAt
    , getDefList
    , getDefName
    , getDefNum
    , getName
    , getReadMe
    , getWasmBinary
    , make
    , mapDefList
    , setDefName
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
        , defList : List ( Def.Def, Maybe Compiler.CompileResult )
        , readMe : String
        }


make : { name : Label.Label, defList : List ( Def.Def, Maybe Compiler.CompileResult ), readMe : String } -> Module
make { name, defList, readMe } =
    Module
        { name = name
        , typeDefList = []
        , defList = List.take 65535 defList -- 定義の数の上限
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


{-| ModuleのList (Def,Maybe CompileResult)を取得
-}
getDefList : Module -> List ( Def.Def, Maybe Compiler.CompileResult )
getDefList (Module { defList }) =
    defList


setDefList : List ( Def.Def, Maybe Compiler.CompileResult ) -> Module -> Module
setDefList defList (Module rec) =
    Module
        { rec | defList = defList }


setDefListAt : Int -> ( Def.Def, Maybe Compiler.CompileResult ) -> Module -> Module
setDefListAt index def (Module rec) =
    Module
        { rec | defList = rec.defList |> Utility.ListExtra.setAt index def }


mapDefList : (List ( Def.Def, Maybe Compiler.CompileResult ) -> List ( Def.Def, Maybe Compiler.CompileResult )) -> Module -> Module
mapDefList =
    Utility.Map.toMapper
        getDefList
        setDefList


{-| 定義の個数
-}
getDefNum : Module -> Int
getDefNum =
    getDefList >> List.length


{-| 指定したindexの定義の名前を取得する。なければNoName
-}
getDefName : Int -> Module -> Project.Source.Module.Def.Name.Name
getDefName index (Module { defList }) =
    defList
        |> Utility.ListExtra.getAt index
        |> Maybe.map (Tuple.first >> Def.getName)
        |> Maybe.withDefault Project.Source.Module.Def.Name.noName


{-| 指定したindexの定義の名前を設定する なければ、なにもしない
-}
setDefName : Int -> Project.Source.Module.Def.Name.Name -> Module -> Module
setDefName index name module_ =
    case Utility.ListExtra.getAt index (getDefList module_) of
        Just ( x, _ ) ->
            module_
                |> setDefListAt index ( Def.setName name x, Nothing )

        Nothing ->
            module_


{-| 定義を末尾に追加する
-}
addDef : Def.Def -> Module -> Module
addDef def (Module rec) =
    Module
        { rec
            | defList =
                if 65535 <= List.length rec.defList then
                    rec.defList

                else
                    rec.defList ++ [ ( def, Nothing ) ]
        }


{-| 指定位置の定義を削除する。TODO 参照番号のズレを解消
-}
deleteDefAt : Int -> Module -> Module
deleteDefAt index (Module rec) =
    Module
        { rec
            | defList =
                Utility.ListExtra.deleteAt index rec.defList
        }


getWasmBinary : Module -> Maybe (List Int)
getWasmBinary (Module { defList }) =
    defList
        |> List.map Tuple.second
        |> Utility.ListExtra.takeFromJust
        |> Maybe.andThen (List.map Compiler.getBinary >> Utility.ListExtra.takeFromJust)
        |> Maybe.map Compiler.Marger.marge
