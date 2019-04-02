module Project.Source.Module exposing (Module, addEmptyPartDefAndData, allPartDefIndex, existPartDefName, getData, getName, getPartDef, getPartDefAndData, getPartDefAndDataList, getReadMe, make, makeUnit, map, setData, setName, setPartDefAndData, setPartDefExpr, setPartDefName, setPartDefType, setReadMe)

import Array
import Project.Label as Label
import Project.Source.Module.PartDef as PartDef
import Project.Source.Module.PartDef.Expr as Expr
import Project.Source.Module.PartDef.Name as Name
import Project.Source.Module.PartDef.Type as Type
import Project.Source.Module.TypeDef as TypeDef
import Project.Source.ModuleIndex as ModuleIndex


{-| モジュール。aには各パーツ定義(PartDef)に保存しておきたいデータの型を指定する
ModuleWithCacheと違うところは、コンパイル結果を持たない、純粋にモジュールだけを表現するということ


## 制約

  - 型定義で名前がかぶっていはいけない
  - パーツ定義で名前がかぶっていはいけない
  - 型定義の個数は0～255こ
  - パーツ定義の個数は0～65535こ

-}
type Module a
    = Module
        { name : Label.Label
        , readMe : String
        , typeDefList : Array.Array TypeDef.TypeDef
        , partDefAndDataList : Array.Array ( PartDef.PartDef, a )
        }


{-| 空のモジュールを作成する
-}
init : Label.Label -> Module a
init name =
    Module
        { name = name
        , readMe = ""
        , typeDefList = Array.empty
        , partDefAndDataList = Array.empty
        }


{-| デバッグ用。モジュールを作成する
型定義や名前定義で名前がかぶっていたら最初の方を優先する
-}
make : { name : Label.Label, readMe : String, typeDefList : List TypeDef.TypeDef, partDefAndDataList : List ( PartDef.PartDef, a ) } -> Module a
make { name, readMe, typeDefList, partDefAndDataList } =
    Module
        { name = name
        , readMe = readMe
        , typeDefList =
            typeDefList
                |> deleteTypeDefWithDuplicateName
                |> List.take typeDefMaxNum
                |> Array.fromList
        , partDefAndDataList =
            partDefAndDataList
                |> deletePartDefAndDataWithDuplicateName
                |> List.take partDefMaxNum
                |> Array.fromList
        }


{-| デバッグ用。別にデータを持たないモジュールを作成する
型定義や名前定義で名前がかぶっていたら最初の方を優先する
-}
makeUnit : { name : Label.Label, readMe : String, typeDefList : List TypeDef.TypeDef, partDefList : List PartDef.PartDef } -> Module ()
makeUnit { name, readMe, typeDefList, partDefList } =
    make
        { name = name
        , readMe = readMe
        , typeDefList = typeDefList
        , partDefAndDataList = partDefList |> List.map (\s -> ( s, () ))
        }


typeDefMaxNum : Int
typeDefMaxNum =
    255


partDefMaxNum : Int
partDefMaxNum =
    65535


map : (a -> b) -> Module a -> Module b
map f (Module { name, readMe, typeDefList, partDefAndDataList }) =
    Module
        { name = name
        , readMe = readMe
        , typeDefList = typeDefList
        , partDefAndDataList =
            partDefAndDataList
                |> Array.map (Tuple.mapSecond f)
        }


{-| 型定義で名前がかぶっていたら、その型定義を削除する。最初の要素を優先する
-}
deleteTypeDefWithDuplicateName : List TypeDef.TypeDef -> List TypeDef.TypeDef
deleteTypeDefWithDuplicateName =
    List.foldl
        (\typeDef ( nameList, noDupTypeDefList ) ->
            let
                name =
                    TypeDef.getName typeDef
            in
            if List.member name nameList then
                ( nameList, noDupTypeDefList )

            else
                ( name :: nameList, noDupTypeDefList ++ [ typeDef ] )
        )
        ( [], [] )
        >> Tuple.second


{-| パーツの定義で名前がかぶっていたら、そのパーツの定義を削除する。最初の要素を優先する
-}
deletePartDefAndDataWithDuplicateName : List ( PartDef.PartDef, a ) -> List ( PartDef.PartDef, a )
deletePartDefAndDataWithDuplicateName =
    List.foldl
        (\( partDef, result ) ( nameList, noDupPratDefAndDataList ) ->
            let
                name =
                    PartDef.getName partDef
            in
            if List.member name nameList then
                ( nameList, noDupPratDefAndDataList )

            else
                ( name :: nameList, noDupPratDefAndDataList ++ [ ( partDef, result ) ] )
        )
        ( [], [] )
        >> Tuple.second


{-| Moduleの名前を取得する
-}
getName : Module a -> Label.Label
getName (Module { name }) =
    name


{-| Moduleの名前を設定する
-}
setName : Label.Label -> Module a -> Module a
setName label (Module rec) =
    Module { rec | name = label }


{-| ModuleのReadMeを取得する
-}
getReadMe : Module a -> String
getReadMe (Module { readMe }) =
    readMe


{-| ModuleのReadMeを設定する
-}
setReadMe : String -> Module a -> Module a
setReadMe string (Module rec) =
    Module
        { rec | readMe = string }


{-| パーツ定義とデータのListを取得する
-}
getPartDefAndDataList : Module a -> List ( PartDef.PartDef, a )
getPartDefAndDataList (Module { partDefAndDataList }) =
    partDefAndDataList
        |> Array.toList


{-| 末尾に空のパーツ定義とデータを追加し、追加した末尾のIndexも返す
パーツ定義の個数上限で追加できなかったらNothing
-}
addEmptyPartDefAndData : a -> Module a -> Maybe ( Module a, ModuleIndex.PartDefIndex )
addEmptyPartDefAndData a (Module rec) =
    if partDefMaxNum <= Array.length rec.partDefAndDataList then
        Nothing

    else
        Just
            ( Module
                { rec
                    | partDefAndDataList = Array.append rec.partDefAndDataList (Array.fromList [ ( PartDef.empty, a ) ])
                }
            , ModuleIndex.PartDefIndex (Array.length rec.partDefAndDataList)
            )


{-| 指定した位置にあるパーツ定義とデータを取得する
-}
getPartDefAndData : ModuleIndex.PartDefIndex -> Module a -> Maybe ( PartDef.PartDef, a )
getPartDefAndData (ModuleIndex.PartDefIndex defIndex) (Module { partDefAndDataList }) =
    partDefAndDataList |> Array.get defIndex


{-| 指定した位置にあるパーツ定義とデータを設定する。名前がかぶっていたらNothing
-}
setPartDefAndData : ModuleIndex.PartDefIndex -> ( PartDef.PartDef, a ) -> Module a -> Maybe (Module a)
setPartDefAndData (ModuleIndex.PartDefIndex defIndex) ( partDef, data ) (Module rec) =
    if Module rec |> existPartDefName (partDef |> PartDef.getName) then
        Nothing

    else
        Just
            (Module
                { rec
                    | partDefAndDataList = rec.partDefAndDataList |> Array.set defIndex ( partDef, data )
                }
            )


{-| 指定した位置にあるパーツ定義を取得する
-}
getPartDef : ModuleIndex.PartDefIndex -> Module a -> Maybe PartDef.PartDef
getPartDef (ModuleIndex.PartDefIndex defIndex) (Module { partDefAndDataList }) =
    partDefAndDataList |> Array.get defIndex |> Maybe.map Tuple.first


{-| 指定した位置にあるデータを取得する
-}
getData : ModuleIndex.PartDefIndex -> Module a -> Maybe a
getData (ModuleIndex.PartDefIndex defIndex) (Module { partDefAndDataList }) =
    partDefAndDataList |> Array.get defIndex |> Maybe.map Tuple.second


{-| 指定した位置にあるパーツ定義とデータを設定する
-}
setData : ModuleIndex.PartDefIndex -> a -> Module a -> Module a
setData (ModuleIndex.PartDefIndex defIndex) data (Module rec) =
    case rec.partDefAndDataList |> Array.get defIndex of
        Just ( partDef, _ ) ->
            Module rec
                |> setPartDefAndData (ModuleIndex.PartDefIndex defIndex) ( partDef, data )
                |> Maybe.withDefault (Module rec)

        Nothing ->
            Module rec


{-| すでに指定した名前がモジュールに定義されているか
無名はかぶったとしてみなせれない
-}
existPartDefName : Name.Name -> Module a -> Bool
existPartDefName name =
    case name of
        Name.SafeName safeName ->
            getPartDefAndDataList
                >> List.map (Tuple.first >> PartDef.getName)
                >> List.member (Name.SafeName safeName)

        Name.NoName ->
            always False


{-| すべてのパーツ定義のIndex
-}
allPartDefIndex : Module a -> List ModuleIndex.PartDefIndex
allPartDefIndex module_ =
    List.range
        0
        (List.length (getPartDefAndDataList module_))
        |> List.map ModuleIndex.PartDefIndex



{- ================================================
                     Part Def
   ================================================
-}


{-| 指定した位置にあるパーツ定義の名前を変更する。他の名前とかぶっていた場合はNothing
-}
setPartDefName : ModuleIndex.PartDefIndex -> Name.Name -> Module a -> Maybe (Module a)
setPartDefName partDefIndex name module_ =
    case module_ |> getPartDefAndData partDefIndex of
        Just ( partDef, data ) ->
            module_
                |> setPartDefAndData partDefIndex
                    ( partDef |> PartDef.setName name, data )

        Nothing ->
            Just module_


{-| 指定した位置にあるパーツ定義の型を変更する
-}
setPartDefType : ModuleIndex.PartDefIndex -> Type.Type -> Module a -> Module a
setPartDefType partDefIndex type_ module_ =
    case module_ |> getPartDefAndData partDefIndex of
        Just ( partDef, data ) ->
            module_
                |> setPartDefAndData partDefIndex
                    ( partDef |> PartDef.setType type_, data )
                |> Maybe.withDefault module_

        Nothing ->
            module_


{-| 指定した位置にあるパーツ定義の式を変更する
-}
setPartDefExpr : ModuleIndex.PartDefIndex -> Expr.Expr -> Module a -> Module a
setPartDefExpr partDefIndex expr module_ =
    case module_ |> getPartDefAndData partDefIndex of
        Just ( partDef, data ) ->
            module_
                |> setPartDefAndData partDefIndex
                    ( partDef |> PartDef.setExpr expr, data )
                |> Maybe.withDefault module_

        Nothing ->
            module_
