module Utility exposing (arraySetLength, deleteAt, fromMaybe, getAt, getFirstJust, getFirstSatisfyElement, headAndLast, insert, insertList, last, listTupleListToTupleList, mapAt, sequenceMaybeList, setAt, takeAllWithFilter, takeFromMaybeList)

{-| 標準のListで足りないListに対する操作をおこなう
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
        [] ->
            Nothing

        [ a ] ->
            Just a

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


{-| Just aの要素を取り出す
-}
takeFromMaybeList : List (Maybe a) -> List a
takeFromMaybeList list =
    case list of
        (Just x) :: xs ->
            x :: takeFromMaybeList xs

        Nothing :: xs ->
            takeFromMaybeList xs

        [] ->
            []


{-| List (Maybe a)の中身が全てJust aならJust [a,a,a]にして1つでもNothingが入っていればNothing

<http://hackage.haskell.org/package/base-4.12.0.0/docs/Data-Traversable.html#v:sequenceA>

<https://pursuit.purescript.org/packages/purescript-foldable-traversable/4.1.1/docs/Data.Traversable#v:sequence>

-}
sequenceMaybeList : List (Maybe a) -> Maybe (List a)
sequenceMaybeList list =
    case list of
        (Just x) :: xs ->
            case sequenceMaybeList xs of
                Just xss ->
                    Just (x :: xss)

                Nothing ->
                    Nothing

        Nothing :: _ ->
            Nothing

        [] ->
            Just []


{-| filterMapですべてJustだったときの値を取り出す
-}
takeAllWithFilter : (a -> Maybe b) -> List a -> Maybe (List b)
takeAllWithFilter func list =
    case list of
        x :: xs ->
            case ( func x, takeAllWithFilter func xs ) of
                ( Just xOk, Just xsOk ) ->
                    Just (xOk :: xsOk)

                ( _, _ ) ->
                    Nothing

        [] ->
            Nothing


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


{-| それぞれがリストのタプルのリストを、リストが入ったタプルにする
-}
listTupleListToTupleList : List ( List a, List b ) -> ( List a, List b )
listTupleListToTupleList list =
    case list of
        ( a, b ) :: xs ->
            let
                tail =
                    listTupleListToTupleList xs
            in
            ( a ++ Tuple.first tail
            , b ++ Tuple.second tail
            )

        [] ->
            ( [], [] )


{-| 要素を先頭から関数に適用して、Trueになった最初の要素を取得する。
-}
getFirstSatisfyElement : (a -> Bool) -> List a -> Maybe a
getFirstSatisfyElement f list =
    case list of
        x :: xs ->
            if f x then
                Just x

            else
                getFirstSatisfyElement f xs

        [] ->
            Nothing


{-| 配列の長さを変更する
足りない分は指定した要素で補い、多かった分は末尾の方を捨てる
-}
arraySetLength : Int -> a -> Array.Array a -> Array.Array a
arraySetLength length fillElement array =
    if length < Array.length array then
        array |> Array.slice 0 length

    else
        arraySetLength length fillElement (Array.append array (Array.fromList [ fillElement ]))
