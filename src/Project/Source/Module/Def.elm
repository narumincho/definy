module Project.Source.Module.Def exposing
    ( Def, make
    , getName, setName, mapName
    , getType, setType, mapType
    , getExpr, setExpr, mapExpr
    )

{-| Def ある対象について1つの定義をすることができる


# Def

@docs Def, make


# Name

@docs getName, setName, mapName


# Type

@docs getType, setType, mapType


# Expr

@docs getExpr, setExpr, mapExpr

-}

import Project.Source.Module.Def.Expr as Expr exposing (Expr)
import Project.Source.Module.Def.Name as Name exposing (Name)
import Project.Source.Module.Def.Type as Type exposing (Type)
import Utility.Map


{-| 定義
-}
type Def
    = Def
        { name : Name
        , type_ : Type
        , expr : Expr
        }


{-| 新しく定義を作成する
-}
make : { name : Name, type_ : Type, expr : Expr } -> Def
make rec =
    Def rec


{-| 名前を取得する
-}
getName : Def -> Name
getName (Def { name }) =
    name


{-| 名前を設定する
-}
setName : Name -> Def -> Def
setName name (Def rec) =
    Def { rec | name = name }


{-| 名前を加工する
-}
mapName : (Name -> Name) -> Def -> Def
mapName =
    Utility.Map.toMapper getName setName


{-| 型を取得する
-}
getType : Def -> Type
getType (Def { type_ }) =
    type_


{-| 型を設定する
-}
setType : Type -> Def -> Def
setType type_ (Def rec) =
    Def { rec | type_ = type_ }


{-| 型を加工する
-}
mapType : (Type -> Type) -> Def -> Def
mapType =
    Utility.Map.toMapper getType setType


{-| 式を取得する
-}
getExpr : Def -> Expr
getExpr (Def { expr }) =
    expr


{-| 式を設定する
-}
setExpr : Expr -> Def -> Def
setExpr expr (Def rec) =
    Def { rec | expr = expr }


{-| 式を加工する
-}
mapExpr : (Expr -> Expr) -> Def -> Def
mapExpr =
    Utility.Map.toMapper getExpr setExpr
