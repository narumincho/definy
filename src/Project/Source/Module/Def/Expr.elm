module Project.Source.Module.Def.Expr exposing
    ( Expr
    , empty
    , getHead
    , getOthers
    , indexedMap
    , insertABetweenOpAndTerm
    , insertAt
    , insertHead
    , isEmpty
    , make
    , map
    , removeBlankOpNoneTerm
    , replaceAndInsertHeadLastOp
    , replaceAndInsertHeadLastTerm
    , replaceAndInsertOpLastOp
    , replaceAndInsertOpLastTerm
    , replaceAndInsertTermLastOp
    , replaceAndInsertTermLastTerm
    , setOperatorAtOther
    , setTermAtOther
    , toString
    )

import Project.Source.Module.Def.Expr.Operator as Op exposing (Operator)
import Project.Source.Module.Def.Expr.Term as Term exposing (Term)
import Utility.ListExtra as ListExtra


type Expr
    = Expr Term (List ( Operator, Term ))


make : Term -> List ( Operator, Term ) -> Expr
make head others =
    Expr head others
        |> removeBlankOpNoneTerm


empty : Expr
empty =
    Expr Term.none []


getHead : Expr -> Term
getHead (Expr head _) =
    head


getOthers : Expr -> List ( Operator, Term )
getOthers (Expr _ others) =
    others


mapOthers : (List ( Operator, Term ) -> List ( Operator, Term )) -> Expr -> Expr
mapOthers f (Expr head others) =
    Expr
        head
        (f others)


{-| 空の演算子と項の連続を取り除く
-}
removeBlankOpNoneTerm : Expr -> Expr
removeBlankOpNoneTerm (Expr head others) =
    removeSetBlankOpNoneTermLoop
        others
        (Expr head [])


removeSetBlankOpNoneTermLoop : List ( Operator, Term ) -> Expr -> Expr
removeSetBlankOpNoneTermLoop rest expr =
    case rest of
        [] ->
            expr |> mapOthers List.reverse

        ( Op.Blank, Term.None ) :: xs ->
            removeSetBlankOpNoneTermLoop xs expr

        ( Op.Blank, term ) :: xs ->
            case expr of
                Expr Term.None [] ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr term [])

                Expr iHead (( iOp, Term.None ) :: iOthers) ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr iHead (( iOp, term ) :: iOthers))

                Expr iHead iOthers ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr iHead (( Op.blank, term ) :: iOthers))

        x :: xs ->
            case expr of
                Expr iHead iOthers ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr iHead (x :: iOthers))


{-| 指定位置の演算子を取得
-}
getOperatorAt : Int -> Expr -> Maybe Operator
getOperatorAt index (Expr _ others) =
    others
        |> ListExtra.getAt index
        |> Maybe.map Tuple.first


{-| 指定位置の項を取得
-}
getTermAt : Int -> Expr -> Maybe Term
getTermAt index (Expr _ others) =
    others
        |> ListExtra.getAt index
        |> Maybe.map Tuple.second


{-| 空かどうか判断
-}
isEmpty : Expr -> Bool
isEmpty (Expr head others) =
    Term.none == head && others == []


{-| 文字列で表現(デバッグ用)
-}
toString : Expr -> String
toString (Expr head others) =
    Term.toString head
        ++ (others
                |> List.map
                    (\( op, term ) ->
                        Maybe.withDefault "(?)" (Op.toString op)
                            ++ Term.toString term
                    )
                |> String.concat
           )


map : (Term -> a) -> (Operator -> a) -> Expr -> List a
map termF opF (Expr head others) =
    termF head
        :: (others
                |> List.concatMap (\( op, term ) -> [ opF op, termF term ])
           )


indexedMap : (Int -> Term -> a) -> (Int -> Operator -> a) -> Expr -> List a
indexedMap termF opF (Expr head others) =
    termF 0 head
        :: (others
                |> List.indexedMap (\i ( op, term ) -> [ opF i op, termF (1 + i) term ])
                |> List.concat
           )


insertHead : Term -> Operator -> Expr -> Expr
insertHead term op (Expr head others) =
    Expr
        term
        (( op, head ) :: others)


insertAt : Int -> Operator -> Term -> Expr -> Expr
insertAt index op term (Expr head others) =
    Expr
        head
        (ListExtra.insert index ( op, term ) others)


insertABetweenOpAndTerm : Int -> Term -> Operator -> Expr -> Expr
insertABetweenOpAndTerm index term op (Expr head others) =
    let
        left : ( Op.Operator, Term.Term )
        left =
            ( others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.first
                |> Maybe.withDefault Op.blank
            , term
            )

        right : ( Op.Operator, Term.Term )
        right =
            ( op
            , others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.second
                |> Maybe.withDefault Term.none
            )
    in
    Expr
        head
        (others
            |> ListExtra.setAt index left
            |> ListExtra.insert index right
        )


{-|
先頭の項を置き換え、挿入する。最後が項で終わる用

    [| ]+2+3
    input: 5+6+7

    5+6+[7| ]+2+3

-}
replaceAndInsertHeadLastTerm : Term -> List ( Operator, Term ) -> Expr -> Expr
replaceAndInsertHeadLastTerm term list (Expr _ others) =
    Expr
        term
        (list ++ others)


{-|
先頭の項を置き換え、挿入する。最後が演算子で終わる用

    [| ]+2+3
    input: 5+6+

    5+6[+| ]✗+2+3

-}
replaceAndInsertHeadLastOp : Term -> List ( Operator, Term ) -> Operator -> Expr -> Expr
replaceAndInsertHeadLastOp headTerm list lastOp (Expr _ others) =
    Expr
        headTerm
        (list ++ [ ( lastOp, Term.none ) ] ++ others)
        |> removeBlankOpNoneTerm


{-|

        指定位置にOperatorとList(Term,Operator)とTermを追加する

-}
replaceAndInsertOpLastTerm : Int -> Operator -> List ( Term, Operator ) -> Term -> Expr -> Expr
replaceAndInsertOpLastTerm index op termOpList lastTerm expr =
    let
        targetTerm : Term
        targetTerm =
            expr |> getTermAt index |> Maybe.withDefault Term.none

        replaceAndInsertElement : { replace : ( Operator, Term ), insert : List ( Operator, Term ) }
        replaceAndInsertElement =
            case ListExtra.headAndLast termOpList of
                Nothing ->
                    { replace = ( op, lastTerm )
                    , insert =
                        if targetTerm == Term.none then
                            []

                        else
                            [ ( Op.blank, targetTerm ) ]
                    }

                Just ( ( headTerm, _ ), ( _, lastOp ) ) ->
                    { replace = ( op, headTerm )
                    , insert =
                        offsetTermOpList [] termOpList
                            ++ [ ( lastOp, lastTerm ), ( Op.blank, targetTerm ) ]
                    }
    in
    expr
        |> mapOthers
            (ListExtra.setAt index replaceAndInsertElement.replace
                >> ListExtra.insertList (index + 1) replaceAndInsertElement.insert
            )
        |> removeBlankOpNoneTerm


{-|

    指定位置にOperatorとList(Term,Operator)を追加する

-}
replaceAndInsertOpLastOp : Int -> Operator -> List ( Term, Operator ) -> Expr -> Expr
replaceAndInsertOpLastOp index headOp termOpList expr =
    let
        targetTerm : Term
        targetTerm =
            expr |> getTermAt index |> Maybe.withDefault Term.none

        replaceAndInsertElement : { replace : ( Operator, Term ), insert : List ( Operator, Term ) }
        replaceAndInsertElement =
            case ListExtra.headAndLast termOpList of
                Nothing ->
                    { replace = ( headOp, targetTerm )
                    , insert = []
                    }

                Just ( ( headTerm, _ ), ( _, lastOp ) ) ->
                    { replace = ( headOp, headTerm )
                    , insert =
                        offsetTermOpList [] termOpList
                            ++ [ ( lastOp, targetTerm ) ]
                    }
    in
    expr
        |> mapOthers
            (ListExtra.setAt index replaceAndInsertElement.replace
                >> ListExtra.insertList (index + 1) replaceAndInsertElement.insert
            )


offsetTermOpList : List ( Operator, Term ) -> List ( Term, Operator ) -> List ( Operator, Term )
offsetTermOpList intermediate list =
    case list of
        ( _, r ) :: second :: others ->
            case second of
                ( l, _ ) ->
                    offsetTermOpList
                        (intermediate ++ [ ( r, l ) ])
                        (second :: others)

        _ ->
            intermediate


{-|

        指定位置にTermとList(Operator,Term)を追加する

-}
replaceAndInsertTermLastTerm : Int -> Term -> List ( Operator, Term ) -> Expr -> Expr
replaceAndInsertTermLastTerm index headTerm opTermList expr =
    let
        targetOp : Operator
        targetOp =
            expr |> getOperatorAt index |> Maybe.withDefault Op.blank
    in
    expr
        |> mapOthers
            (ListExtra.setAt index ( targetOp, headTerm )
                >> ListExtra.insertList (index + 1) opTermList
            )


{-|

        指定位置にTermとList(Operator,Term)とOperatorを追加する

-}
replaceAndInsertTermLastOp : Int -> Term -> List ( Operator, Term ) -> Operator -> Expr -> Expr
replaceAndInsertTermLastOp index headTerm opTermList lastOp expr =
    let
        targetOp : Operator
        targetOp =
            expr |> getOperatorAt index |> Maybe.withDefault Op.blank
    in
    expr
        |> mapOthers
            (ListExtra.setAt index ( targetOp, headTerm )
                >> ListExtra.insertList (index + 1) (opTermList ++ [ ( lastOp, Term.none ) ])
            )
        |> removeBlankOpNoneTerm


{-|

    指定位置の演算子を置き換える

-}
setOperatorAtOther : Int -> Operator -> Expr -> Expr
setOperatorAtOther index op (Expr head others) =
    let
        term =
            others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.second
                |> Maybe.withDefault Term.none
    in
    Expr
        head
        (others |> ListExtra.setAt index ( op, term ))


{-| 指定位置の項を置き換える
-}
setTermAtOther : Int -> Term -> Expr -> Expr
setTermAtOther index term (Expr head others) =
    let
        op =
            others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.first
                |> Maybe.withDefault Op.blank
    in
    Expr
        head
        (others |> ListExtra.setAt index ( op, term ))
