module Data.Project.Module exposing
    ( Module
    , addEmptyPartDefAndData
    , addTypeDef
    , allPartDefIndex
    , existPartDefName
    , getData
    , getName
    , getPartDef
    , getPartDefAndData
    , getPartDefAndDataList
    , getTypeDef
    , getTypeDefList
    , make
    , setData
    , setName
    , setPartDefAndData
    , setPartDefExpr
    , setPartDefName
    , setPartDefType
    )

import Array
import Data.Label as Label
import Project.ModuleDefinition.Module.TypeDef as TypeDef


{-| モジュール。aには各パーツ定義(PartDef)に保存しておきたいデータの型を指定する
ModuleWithCacheと違うところは、コンパイル結果を持たない、純粋にモジュールだけを表現するということ


## 制約

  - 型定義で名前がかぶっていはいけない
  - パーツ定義で名前がかぶっていはいけない
  - 型定義の個数は0～255こ
  - パーツ定義の個数は0～65535こ

-}
type Module
    = Module
        { id : ModuleId
        , name : List Label.Label
        , description : String
        , typeDefinitions : List TypeDef.TypeDef
        , partDefinitions : List PartDef.PartDef
        }


type ModuleId
    = ModuleId String


{-| 空のモジュールを作成する
-}
init : List Label.Label -> Module
init name =
    Module
        { id = ModuleId "emptyId"
        , name = name
        , description = ""
        , typeDefinitions = []
        , partDefinitions = []
        }


{-| モジュールを作成する
-}
make :
    { id : ModuleId
    , name : List Label.Label
    , description : String
    , typeDefinitions : List TypeDef.TypeDef
    , partDefinitions : List PartDef.PartDef
    }
    -> Module
make =
    Module


typeDefMaxNum : Int
typeDefMaxNum =
    255


partDefMaxNum : Int
partDefMaxNum =
    65535


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
getName : Module -> List Label.Label
getName (Module { name }) =
    name


{-| Moduleの名前を設定する
-}
setName : List Label.Label -> Module -> Module
setName name (Module rec) =
    Module { rec | name = name }


{-| ModuleのDescriptionを取得する
-}
getDescription : Module -> String
getDescription (Module { description }) =
    description


{-| ModuleのDescriptionを設定する
-}
setDescription : String -> Module -> Module
setDescription description (Module rec) =
    Module
        { rec | description = description }


{-| 型定義TypeDefのListを取得する
-}
getTypeDefList : Module a -> List TypeDef.TypeDef
getTypeDefList (Module { typeDefList }) =
    typeDefList |> Array.toList


{-| 指定した位置にある型定義TypeDefを取得する
-}
getTypeDef : ModuleIndex.TypeDefIndex -> Module a -> Maybe TypeDef.TypeDef
getTypeDef (ModuleIndex.TypeDefIndex index) (Module { typeDefList }) =
    typeDefList |> Array.get index


{-| 末尾に型定義を追加する
-}
addTypeDef : Label.Label -> Module a -> Maybe (Module a)
addTypeDef nameLabel (Module rec) =
    if typeDefMaxNum <= Array.length rec.typeDefList then
        Nothing

    else if existTypeDefName Nothing nameLabel (Module rec) then
        Nothing

    else
        Just
            (Module
                { rec
                    | typeDefList = Array.append rec.typeDefList (Array.fromList [ TypeDef.make nameLabel ])
                }
            )


{-| 指定した名前の型定義がモジュールにすでに定義されているか
TypeDefIndexは前と同じ名前を設定した場合検知しないようにするため
-}
existTypeDefName : Maybe ModuleIndex.TypeDefIndex -> Label.Label -> Module a -> Bool
existTypeDefName passIndexMaybe name =
    case passIndexMaybe of
        Just passIndex ->
            getTypeDefList
                >> List.indexedMap
                    (\i typeDef ->
                        if ModuleIndex.TypeDefIndex i == passIndex then
                            []

                        else
                            [ TypeDef.getName typeDef ]
                    )
                >> List.concat
                >> List.member name

        Nothing ->
            getTypeDefList
                >> List.map TypeDef.getName
                >> List.member name


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
    if Module rec |> existPartDefName (ModuleIndex.PartDefIndex defIndex) (partDef |> PartDef.getName) then
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
getPartDef : ModuleIndex.PartDefIndex -> Module -> Maybe PartDef.PartDef
getPartDef (ModuleIndex.PartDefIndex defIndex) (Module { partDefAndDataList }) =
    partDefAndDataList |> Array.get defIndex |> Maybe.map Tuple.first


{-| 指定した位置にあるデータを取得する
-}
getData : ModuleIndex.PartDefIndex -> Module -> Maybe a
getData (ModuleIndex.PartDefIndex defIndex) (Module { partDefAndDataList }) =
    partDefAndDataList |> Array.get defIndex |> Maybe.map Tuple.second


{-| 指定した位置にあるパーツ定義とデータを設定する
-}
setData : ModuleIndex.PartDefIndex -> a -> Module -> Module
setData (ModuleIndex.PartDefIndex defIndex) data (Module rec) =
    case rec.partDefAndDataList |> Array.get defIndex of
        Just ( partDef, _ ) ->
            Module rec
                |> setPartDefAndData (ModuleIndex.PartDefIndex defIndex) ( partDef, data )
                |> Maybe.withDefault (Module rec)

        Nothing ->
            Module rec


{-| すでに指定した名前がモジュールに定義されているか
無名はかぶったとしてみなせれない。PartDefIndexは前と同じ位置で同じ名前を設定した場合検知しないようにするため
-}
existPartDefName : ModuleIndex.PartDefIndex -> Name.Name -> Module -> Bool
existPartDefName passIndex name =
    case name of
        Name.SafeName safeName ->
            getPartDefAndDataList
                >> List.indexedMap
                    (\i ( partDef, _ ) ->
                        if ModuleIndex.PartDefIndex i == passIndex then
                            Name.NoName

                        else
                            PartDef.getName partDef
                    )
                >> List.member (Name.SafeName safeName)

        Name.NoName ->
            always False


{-| すべてのパーツ定義のIndex
-}
allPartDefIndex : Module -> List ModuleIndex.PartDefIndex
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
setPartDefName : ModuleIndex.PartDefIndex -> Name.Name -> Module -> Maybe Module
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
setPartDefType : ModuleIndex.PartDefIndex -> Type.Type -> Module -> Module
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
setPartDefExpr : ModuleIndex.PartDefIndex -> Expr.Expr -> Module -> Module
setPartDefExpr partDefIndex expr module_ =
    case module_ |> getPartDefAndData partDefIndex of
        Just ( partDef, data ) ->
            module_
                |> setPartDefAndData partDefIndex
                    ( partDef |> PartDef.setExpr expr, data )
                |> Maybe.withDefault module_

        Nothing ->
            module_
