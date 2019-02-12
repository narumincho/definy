module Project.Source.Module.Def.Type exposing
    ( Type
    , ValidType
    , empty
    , fromLabel
    , int
    , isEmpty
    , toString
    , toTextAreaValue
    , validInt
    , validTypeToString
    )

import Project.Label as Label


type Type
    = Valid ValidType
    | Invalid Label.Label
    | Empty


type ValidType
    = TypeInt


{-| Noneではない32bit整数
-}
validInt : ValidType
validInt =
    TypeInt


{-| 32bit整数
-}
int : Type
int =
    Valid validInt


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
-}
fromLabel : Label.Label -> Type
fromLabel label =
    if label == Label.make Label.hi [ Label.on, Label.ot ] then
        Valid TypeInt

    else
        Invalid label


{-| 型を文字列にする
-}
toString : Type -> Maybe String
toString type_ =
    case type_ of
        Valid validType ->
            Just (Label.toCapitalString (validTypeToLabel validType))

        Invalid label ->
            Just (Label.toCapitalString label)

        Empty ->
            Nothing


{-| 入力欄の値に変換する
-}
toTextAreaValue : Type -> List ( Char, Bool )
toTextAreaValue type_ =
    case toString type_ of
        Just text ->
            text
                |> String.toList
                |> List.map (\x -> ( x, True ))

        Nothing ->
            []
