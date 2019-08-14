module Project.ModuleDefinition.Module.PartDef.Type exposing
    ( Type(..)
    , ValidType
    , empty
    , fromLabel
    , isEmpty
    , toString
    , validInt
    , validTypeToString
    )

import Data.Label as Label
import Project.ModuleDefinitionIndex as SourceIndex


type Type
    = Valid SourceIndex.TypeIndex
    | Empty


type ValidType
    = TypeInt


{-| Noneではない32bit整数
-}
validInt : ValidType
validInt =
    TypeInt


{-| 正しい型を文字列にする
-}
validTypeToString : ValidType -> String
validTypeToString =
    validTypeToLabel >> Label.toCapitalString


validTypeToLabel : ValidType -> Label.Label
validTypeToLabel validType =
    case validType of
        TypeInt ->
            Label.make Label.hi [ Label.on, Label.ot ]


{-| 空の型
-}
empty : Type
empty =
    Empty


{-| 型が空かどうか
-}
isEmpty : Type -> Bool
isEmpty type_ =
    type_ == Empty


{-| Labelから型をつくる
TODO この情報だけからじゃ作れない
-}
fromLabel : Label.Label -> Type
fromLabel label =
    Empty


{-| 型を文字列にする
TODO この情報だけからじゃ作れない
-}
toString : Type -> Maybe String
toString type_ =
    case type_ of
        Valid _ ->
            Just "TYPE"

        Empty ->
            Nothing
