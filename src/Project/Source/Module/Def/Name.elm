module Project.Source.Module.Def.Name exposing
    ( Name
    , fromLabel
    , isNoName
    , noName
    , toString
    , toTextAreaValue
    )

import Project.Label as Label


type Name
    = NoName
    | Name Label.Label


{-| 名前を指定しない
-}
noName : Name
noName =
    NoName


{-| Labelから名前をつくる
-}
fromLabel : Label.Label -> Name
fromLabel =
    Name


{-| 名前を文字列で表現
-}
toString : Name -> Maybe String
toString name =
    case name of
        NoName ->
            Nothing

        Name l ->
            Just (Label.toSmallString l)


{-| 名前を決めていない名前かどうか
-}
isNoName : Name -> Bool
isNoName name =
    name == NoName


{-| 入力欄の値に変換する
-}
toTextAreaValue : Name -> List ( Char, Bool )
toTextAreaValue name =
    case name of
        NoName ->
            []

        Name label ->
            Label.toSmallString label
                |> String.toList
                |> List.map (\x -> ( x, True ))
