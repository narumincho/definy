module Compiler.SafeExpr exposing
    ( SafeExpr(..)
    , SafeOperator(..)
    , SafeTerm(..)
    , bindingOrderLessThanOrEqual
    , concat
    , push
    , toBindingOrder
    , toString
    )

import Data.Id


type SafeExpr
    = SafeExpr SafeTerm (List ( SafeOperator, SafeTerm ))


type SafeTerm
    = Int32Literal Int
    | Part Data.Id.PartId
    | Parentheses SafeExpr


type SafeOperator
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


getHead : SafeExpr -> SafeTerm
getHead (SafeExpr head _) =
    head


getOthers : SafeExpr -> List ( SafeOperator, SafeTerm )
getOthers (SafeExpr _ others) =
    others


toString : SafeExpr -> String
toString (SafeExpr head others) =
    termToString head
        ++ String.concat
            (List.map
                (\( op, term ) ->
                    opToString op ++ termToString term
                )
                others
            )


termToString : SafeTerm -> String
termToString safeTerm =
    case safeTerm of
        Int32Literal i ->
            String.fromInt i

        Part (Data.Id.PartId id) ->
            "!(" ++ id ++ ")"

        Parentheses expr ->
            "(" ++ toString expr ++ ")"


opToString : SafeOperator -> String
opToString safeOperator =
    case safeOperator of
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


type OperatorBindingOrder
    = O0
    | O1
    | O2
    | O3
    | O4
    | O5
    | O6
    | O7


toBindingOrder : SafeOperator -> OperatorBindingOrder
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


push : ( SafeOperator, SafeTerm ) -> SafeExpr -> SafeExpr
push tuple (SafeExpr head others) =
    SafeExpr
        head
        (others ++ [ tuple ])


concat : SafeExpr -> SafeOperator -> SafeExpr -> SafeExpr
concat left centerOp right =
    SafeExpr
        (getHead left)
        (getOthers left ++ [ ( centerOp, getHead right ) ] ++ getOthers right)
