module Data.Project.PartDef exposing
    ( PartDef
    , Type
    , empty
    , emptyType
    , getExpr
    , getName
    , getType
    , isEmptyType
    , make
    , setExpr
    , setName
    , setType
    , toString
    , typeToString
    )

import Data
import Data.Label as Label
import Data.Project.Expr as Expr


{-| 定義
-}
type PartDef
    = PartDef
        { id : Data.PartId
        , name : Maybe Label.Label
        , type_ : Type
        , expr : Expr.Expr
        }


{-| 新しく定義を作成する
-}
make : { id : Data.PartId, name : Maybe Label.Label, type_ : Type, expr : Expr.Expr } -> PartDef
make =
    PartDef


{-| 空の定義を作成する
-}
empty : PartDef
empty =
    PartDef
        { id = Data.PartId "emptyId" --TODO
        , name = Nothing
        , type_ = Empty
        , expr = Expr.empty
        }


{-| 名前を取得する
-}
getName : PartDef -> Maybe Label.Label
getName (PartDef { name }) =
    name


{-| 名前を設定する
-}
setName : Maybe Label.Label -> PartDef -> PartDef
setName name (PartDef rec) =
    PartDef { rec | name = name }


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


{-| 式を取得する
-}
getExpr : PartDef -> Expr.Expr
getExpr (PartDef { expr }) =
    expr


{-| 式を設定する
-}
setExpr : Expr.Expr -> PartDef -> PartDef
setExpr expr (PartDef rec) =
    PartDef { rec | expr = expr }


{-| 定義を文字列にする。デバッグ用
-}
toString : PartDef -> String
toString (PartDef { name, type_, expr }) =
    (case name of
        Just n ->
            Label.toSmallString n

        Nothing ->
            "[NO NAME]"
    )
        ++ ":"
        ++ typeToString type_
        ++ "="
        ++ Expr.toString expr


type Type
    = Function Type Type
    | Ref Data.TypePartId
    | Empty


emptyType : Type
emptyType =
    Empty


isEmptyType : Type -> Bool
isEmptyType type_ =
    type_ == Empty


typeToString : Type -> String
typeToString type_ =
    case type_ of
        Function inType outType ->
            typeToString inType ++ "→" ++ typeToString outType

        Ref (Data.TypeId id) ->
            "(" ++ id ++ ")"

        Empty ->
            "[Empty]"
