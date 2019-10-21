module Data.Project.Module exposing
    ( Module
    , from
    , getDescription
    , getName
    , getPartDefinitionIds
    , getTypeDefinitionIds
    , sampleModule
    , setDescription
    , setName
    )

import Data.IdHash as Id
import Data.Label as Label
import Data.Project.PartDef as PartDef
import Data.Project.TypeDef as TypeDef


{-| モジュール


## 制約

  - 型定義で名前がかぶっていはいけない
  - パーツ定義で名前がかぶっていはいけない
  - 型定義の個数は0～300こ
  - パーツ定義の個数は0～5000こ

-}
type Module
    = Module
        { id : Id.ModuleId
        , name : List Label.Label
        , description : String
        , typeDefinitionIds : List Id.TypeId
        , partDefinitionIds : List Id.PartId
        }


{-| 空のモジュールを作成する
-}
init : List Label.Label -> Module
init name =
    Module
        { id = Id.ModuleId "emptyId"
        , name = name
        , description = ""
        , typeDefinitionIds = []
        , partDefinitionIds = []
        }


{-| モジュールを作成する
-}
from :
    { id : Id.ModuleId
    , name : List Label.Label
    , description : String
    , typeDefinitionIds : List Id.TypeId
    , partDefinitionIds : List Id.PartId
    }
    -> Module
from =
    Module


sampleModule : Module
sampleModule =
    Module
        { id = Id.ModuleId "sampleModuleId"
        , name =
            [ Label.from Label.hs
                [ Label.oa
                , Label.om
                , Label.op
                , Label.ol
                , Label.oe
                , Label.oM
                , Label.oo
                , Label.od
                , Label.ou
                , Label.ol
                , Label.ol
                , Label.oe
                ]
            ]
        , description = "サンプルモジュール。読み込む処理のために一時的に用意したもの"
        , typeDefinitionIds = []
        , partDefinitionIds = []
        }


typeDefMaxNum : Int
typeDefMaxNum =
    300


partDefMaxNum : Int
partDefMaxNum =
    5000


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


getPartDefinitionIds : Module -> List Id.PartId
getPartDefinitionIds (Module { partDefinitionIds }) =
    partDefinitionIds


getTypeDefinitionIds : Module -> List Id.TypeId
getTypeDefinitionIds (Module { typeDefinitionIds }) =
    typeDefinitionIds
