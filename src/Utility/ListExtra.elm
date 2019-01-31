module Utility.ListExtra exposing
    ( insert, insertList
    , getAt, setAt, mapAt, deleteAt
    , getFirstJust, last, headAndLast
    , takeFromJust
    , fromMaybe
    )

{-| 標準のListで足りないListに対する操作をおこなう


# Insert

@docs insert, insertList


# Index Access

@docs getAt, setAt, mapAt, deleteAt


# Take

@docs getFirstJust, last, headAndLast


# Filter

@docs takeFromJust


# From Maybe

@docs fromMaybe

-}

import Array


{-| 指定した位置に指定したものを挿入する
-}
insert : Int -> a -> List a -> List a
insert index element list =
    insertList index [ element ] list


{-| 指定した位置に複数のものを挿入する
-}
insertList : Int -> List a -> List a -> List a
insertList index insertingList insertedList =
    List.take index insertedList
        ++ insertingList
        ++ List.drop index insertedList


{-| 指定した位置の要素を取得
-}
getAt : Int -> List a -> Maybe a
getAt index list =
    Array.get index (Array.fromList list)


{-| 指定した位置に指定したものを置換する
-}
setAt : Int -> a -> List a -> List a
setAt index element list =
    case list of
        [] ->
            []

        head :: others ->
            if index == 0 then
                element :: others

            else
                head :: setAt (index - 1) element others


{-| 指定した位置の要素に関数を適用する
-}
mapAt : Int -> (a -> a) -> List a -> List a
mapAt index fn list =
    if index < 0 then
        list

    else
        let
            head =
                List.take index list

            tail =
                List.drop index list
        in
        case tail of
            x :: xs ->
                head ++ [ fn x ] ++ xs

            _ ->
                list


{-| 指定位置の要素を削除する
-}
deleteAt : Int -> List a -> List a
deleteAt index list =
    List.take index list ++ List.drop (List.length list - index - 1) list


{-|

    最初と最後の値を取得
    headAndLast [1,2,3] == Just (1, 3)
    headAndLast [1,2] == Just (1, 2)
    headAndLast [2] == Just (2, 2)
    headAndLast [] == Nothing

-}
headAndLast : List a -> Maybe ( a, a )
headAndLast list =
    case ( List.head list, last list ) of
        ( Just head, Just lastE ) ->
            Just ( head, lastE )

        _ ->
            Nothing


{-| 最後の値を取得
-}
last : List a -> Maybe a
last list =
    case list of
        [ a ] ->
            Just a

        [] ->
            Nothing

        _ :: others ->
            last others


{-| リストの中で最初に指定した関数がJustなものを取り出す
-}
getFirstJust : (a -> Maybe b) -> List a -> Maybe b
getFirstJust f list =
    case list of
        [] ->
            Nothing

        x :: xs ->
            case f x of
                Just value ->
                    Just value

                Nothing ->
                    getFirstJust f xs


{-| すべての要素がJustのコンストラクタなら取り出す
-}
takeFromJust : List (Maybe a) -> Maybe (List a)
takeFromJust list =
    case list of
        (Just x) :: xs ->
            case takeFromJust xs of
                Just safeXs ->
                    Just (x :: safeXs)

                Nothing ->
                    Nothing

        Nothing :: _ ->
            Nothing

        [] ->
            Just []


{-| Just a なら [a]
Nothing なら []
-}
fromMaybe : Maybe a -> List a
fromMaybe aMaybe =
    case aMaybe of
        Just a ->
            [ a ]

        Nothing ->
            []
