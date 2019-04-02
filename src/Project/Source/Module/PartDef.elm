module Project.Source.Module.PartDef exposing
    ( PartDef, make
    , getName, setName, mapName
    , getType, setType, mapType
    , getExpr, setExpr, mapExpr
    , empty, toString
    )

{-| PartDef ある対象について1つの定義をすることができる


# PartDef

@docs PartDef, make


# Name

@docs getName, setName, mapName


# Type

@docs getType, setType, mapType


# Expr

@docs getExpr, setExpr, mapExpr

-}

import Project.Source.Module.PartDef.Expr as Expr exposing (Expr)
import Project.Source.Module.PartDef.Name as Name exposing (Name)
import Project.Source.Module.PartDef.Type as Type exposing (Type)
import Utility.Map


{-| 定義
-}
type PartDef
    = PartDef
        { name : Name
        , type_ : Type
        , expr : Expr
        }


{-| 新しく定義を作成する
-}
make : { name : Name, type_ : Type, expr : Expr } -> PartDef
make rec =
    PartDef rec


{-| 空の定義を作成する
-}
empty : PartDef
empty =
    PartDef
        { name = Name.noName
        , type_ = Type.empty
        , expr = Expr.empty
        }


{-| 名前を取得する
-}
getName : PartDef -> Name
getName (PartDef { name }) =
    name


{-| 名前を設定する
-}
setName : Name -> PartDef -> PartDef
setName name (PartDef rec) =
    PartDef { rec | name = name }


{-| 名前を加工する
-}
mapName : (Name -> Name) -> PartDef -> PartDef
mapName =
    Utility.Map.toMapper getName setName


{-| 型を取得する
-}
getType : PartDef -> Type
getType (PartDef { type_ }) =
    type_


{-| 型を設定する
-}
setType : Type -> PartDef -> PartDef
setType type_ (PartDef rec) =
    PartDef { rec | type_ = type_ }


{-| 型を加工する
-}
mapType : (Type -> Type) -> PartDef -> PartDef
mapType =
    Utility.Map.toMapper getType setType


{-| 式を取得する
-}
getExpr : PartDef -> Expr
getExpr (PartDef { expr }) =
    expr


{-| 式を設定する
-}
setExpr : Expr -> PartDef -> PartDef
setExpr expr (PartDef rec) =
    PartDef { rec | expr = expr }


{-| 式を加工する
-}
mapExpr : (Expr -> Expr) -> PartDef -> PartDef
mapExpr =
    Utility.Map.toMapper getExpr setExpr


{-| 定義を文字列にする。デバッグ用
-}
toString : PartDef -> String
toString (PartDef { name, type_, expr }) =
    Name.toString name
        ++ ":"
        ++ (Type.toString type_ |> Maybe.withDefault "[NO TYPE]")
        ++ "="
        ++ Expr.toString expr
