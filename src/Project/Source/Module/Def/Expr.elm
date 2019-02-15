module Project.Source.Module.Def.Expr exposing
    ( Expr(..)
    , Operator(..)
    , Part(..)
    , Term(..)
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
    , termFromMaybeLabel
    , termToString
    , toString
    , termToDescription, allOperator, opToDescription, opToString)

import Project.Label as Label
import Utility.ListExtra as ListExtra


{-| 式。項と演算子が交互に並んだもの。評価して値を作ることができる
-}
type Expr
    = Expr Term (List ( Operator, Term ))


{-| 先頭の項と演算子と項の組のListから式をつくる
-}
make : Term -> List ( Operator, Term ) -> Expr
make head others =
    Expr head others
        |> removeBlankOpNoneTerm


{-| 空の式
-}
empty : Expr
empty =
    Expr None []


{-| 先頭の項を取得する
-}
getHead : Expr -> Term
getHead (Expr head _) =
    head


{-| 先頭以外の演算子と項のListを取得する
-}
getOthers : Expr -> List ( Operator, Term )
getOthers (Expr _ others) =
    others


{-| 先頭以外の演算子と項のListを加工する
-}
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

        ( Blank, None ) :: xs ->
            removeSetBlankOpNoneTermLoop xs expr

        ( Blank, term ) :: xs ->
            case expr of
                Expr None [] ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr term [])

                Expr iHead (( iOp, None ) :: iOthers) ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr iHead (( iOp, term ) :: iOthers))

                Expr iHead iOthers ->
                    removeSetBlankOpNoneTermLoop
                        xs
                        (Expr iHead (( Blank, term ) :: iOthers))

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
    None == head && others == []


{-| 文字列で表現(デバッグ用)
-}
toString : Expr -> String
toString (Expr head others) =
    termToString head
        ++ (others
                |> List.map
                    (\( op, term ) ->
                        opToString op
                            ++ termToString term
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
        left : ( Operator, Term )
        left =
            ( others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.first
                |> Maybe.withDefault Blank
            , term
            )

        right : ( Operator, Term )
        right =
            ( op
            , others
                |> ListExtra.getAt index
                |> Maybe.map Tuple.second
                |> Maybe.withDefault None
            )
    in
    Expr
        head
        (others
            |> ListExtra.setAt index left
            |> ListExtra.insert index right
        )


{-| 先頭の項を置き換え、挿入する。最後が項で終わる用

    [| ]+2+3
    input: 5+6+7

    5+6+[7| ]+2+3

-}
replaceAndInsertHeadLastTerm : Term -> List ( Operator, Term ) -> Expr -> Expr
replaceAndInsertHeadLastTerm term list (Expr _ others) =
    Expr
        term
        (list ++ others)


{-| 先頭の項を置き換え、挿入する。最後が演算子で終わる用

    [| ]+2+3
    input: 5+6+

    5+6[+| ]✗+2+3

-}
replaceAndInsertHeadLastOp : Term -> List ( Operator, Term ) -> Operator -> Expr -> Expr
replaceAndInsertHeadLastOp headTerm list lastOp (Expr _ others) =
    Expr
        headTerm
        (list ++ [ ( lastOp, None ) ] ++ others)
        |> removeBlankOpNoneTerm


{-|

        指定位置にOperatorとList(Term,Operator)とTermを追加する

-}
replaceAndInsertOpLastTerm : Int -> Operator -> List ( Term, Operator ) -> Term -> Expr -> Expr
replaceAndInsertOpLastTerm index op termOpList lastTerm expr =
    let
        targetTerm : Term
        targetTerm =
            expr |> getTermAt index |> Maybe.withDefault None

        replaceAndInsertElement : { replace : ( Operator, Term ), insert : List ( Operator, Term ) }
        replaceAndInsertElement =
            case ListExtra.headAndLast termOpList of
                Nothing ->
                    { replace = ( op, lastTerm )
                    , insert =
                        if targetTerm == None then
                            []

                        else
                            [ ( Blank, targetTerm ) ]
                    }

                Just ( ( headTerm, _ ), ( _, lastOp ) ) ->
                    { replace = ( op, headTerm )
                    , insert =
                        offsetTermOpList [] termOpList
                            ++ [ ( lastOp, lastTerm ), ( Blank, targetTerm ) ]
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
            expr |> getTermAt index |> Maybe.withDefault None

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
            expr |> getOperatorAt index |> Maybe.withDefault Blank
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
            expr |> getOperatorAt index |> Maybe.withDefault Blank
    in
    expr
        |> mapOthers
            (ListExtra.setAt index ( targetOp, headTerm )
                >> ListExtra.insertList (index + 1) (opTermList ++ [ ( lastOp, None ) ])
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
                |> Maybe.withDefault None
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
                |> Maybe.withDefault Blank
    in
    Expr
        head
        (others |> ListExtra.setAt index ( op, term ))



{- ===================================
                   Term
   ===================================
-}


type Term
    = Int32Literal Int
    | Part Part
    | Parentheses Expr
    | None


type Part
    = ValidPart Int
    | InvalidPart Label.Label


integerToListCharBool : Int -> List ( Char, Bool )
integerToListCharBool i =
    String.fromInt i
        |> String.toList
        |> List.map (\char -> ( char, True ))


{-| ラベルから名前による参照の項をつくるが、 NothingならNoneという項を返す
-}
termFromMaybeLabel : Maybe Label.Label -> Term
termFromMaybeLabel mLabel =
    case mLabel of
        Just label ->
            Part (InvalidPart label)

        Nothing ->
            None


termToString : Term -> String
termToString term =
    case term of
        Int32Literal i ->
            String.fromInt i

        Part (ValidPart ref) ->
            "!(" ++ String.fromInt ref ++ ")"

        Part (InvalidPart label) ->
            Label.toSmallString label

        None ->
            "✗"

        Parentheses expr ->
            "(" ++ toString expr ++ ")"


termToDescription : Term -> ( String, String )
termToDescription term =
    case term of
        Int32Literal i ->
            ( String.fromInt i, "Int32リテラル" )

        Part (ValidPart ref) ->
            ( "正しい参照=" ++ String.fromInt ref, "パーツによる参照" )

        Part (InvalidPart label) ->
            ( "不正な参照=" ++ Label.toSmallString label, "パーツによる参照" )

        None ->
            ( "不正な項", "" )

        Parentheses expr ->
            ( "かっこ", "優先的に中身を計算する" )



{- ===================================
               Operator
   ===================================
-}


{-| 決めていないというBlankを含む
-}
type Operator
    = Pipe
    | Or
    | And
    | Equal
    | NotEqual
    | LessThan
    | LessThanOrEqual
    | Concat
    | Add
    | Sub
    | Mul
    | Div
    | Factorial
    | Compose
    | App
    | Blank


allOperator : List Operator
allOperator =
    [ Pipe
    , Or
    , And
    , Equal
    , NotEqual
    , LessThan
    , LessThanOrEqual
    , Concat
    , Add
    , Sub
    , Mul
    , Div
    , Factorial
    , Compose
    , App
    ]


opToDescription : Operator -> ( String, String )
opToDescription op =
    ( opToString op, opToShortDescription op )


opToString : Operator -> String
opToString operator =
    case operator of
        Pipe ->
            ">"

        Or ->
            "|"

        And ->
            "&"

        Equal ->
            "="

        NotEqual ->
            "/="

        LessThan ->
            "<"

        LessThanOrEqual ->
            "<="

        Concat ->
            "++"

        Add ->
            "+"

        Sub ->
            "-"

        Mul ->
            "*"

        Div ->
            "/"

        Factorial ->
            "^"

        Compose ->
            ">>"

        App ->
            " "

        Blank ->
            "?"


opToShortDescription : Operator -> String
opToShortDescription op =
    case op of
        Pipe ->
            "パイプライン"

        Or ->
            "または"

        And ->
            "かつ"

        Equal ->
            "同じ"

        NotEqual ->
            "同じじゃない"

        LessThan ->
            "右辺が大きいか?"

        LessThanOrEqual ->
            "右辺が大きいか等しいか"

        Concat ->
            "結合"

        Add ->
            "足し算"

        Sub ->
            "引き算"

        Mul ->
            "かけ算"

        Div ->
            "割り算"

        Factorial ->
            "べき乗"

        Compose ->
            "関数合成"

        App ->
            "関数適用"

        Blank ->
            "不正な演算子"


type OperatorBindingOrder
    = O0
    | O1
    | O2
    | O3
    | O4
    | O5
    | O6
    | O7


toBindingOrder : Operator -> OperatorBindingOrder
toBindingOrder op =
    case op of
        Pipe ->
            O0

        Or ->
            O1

        And ->
            O2

        Equal ->
            O3

        NotEqual ->
            O3

        LessThan ->
            O3

        LessThanOrEqual ->
            O3

        Concat ->
            O4

        Add ->
            O4

        Sub ->
            O4

        Mul ->
            O5

        Div ->
            O5

        Factorial ->
            O6

        Compose ->
            O6

        App ->
            O7

        Blank ->
            O0


bindingOrderLessThanOrEqual : OperatorBindingOrder -> OperatorBindingOrder -> Bool
bindingOrderLessThanOrEqual by target =
    bindingOrderToInt target <= bindingOrderToInt by


bindingOrderToInt : OperatorBindingOrder -> Int
bindingOrderToInt order =
    case order of
        O0 ->
            0

        O1 ->
            1

        O2 ->
            2

        O3 ->
            3

        O4 ->
            4

        O5 ->
            5

        O6 ->
            6

        O7 ->
            7
