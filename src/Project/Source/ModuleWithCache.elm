module Project.Source.ModuleWithCache exposing
    ( Module(..)
    , addDef
    , deleteDefAt
    , getDefList
    , getName
    , getWasmBinary
    , make
    , mapDefList
    , setName
    , getReadMe, setReadMe)

import Project.Source.Module.Def as Def
import Project.Label as Label
import Project.Source.Module.TypeDef as TypeDef
import Compiler
import Compiler.Marger
import Utility.ListExtra


type Module
    = Module
        { name : Label.Label
        , typeDefList : List TypeDef.TypeDef
        , defList : List ( Def.Def, Maybe Compiler.CompileResult )
        , readMe : String
        }


make : { name : Label.Label, defList : List ( Def.Def, Maybe Compiler.CompileResult ), readMe: String } -> Module
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
getReadMe (Module {readMe}) =
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


mapDefList : (List ( Def.Def, Maybe Compiler.CompileResult ) -> List ( Def.Def, Maybe Compiler.CompileResult )) -> Module -> Module
mapDefList f (Module rec) =
    Module
        { rec
            | defList =
                f rec.defList
        }


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
