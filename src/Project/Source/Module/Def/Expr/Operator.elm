module Project.Source.Module.Def.Expr.Operator exposing
    ( Operator(..)
    , OperatorBindingOrder(..), SafeOperator(..), add, and, app, bindingOrderLessThanOrEqual, blank, compose, concat, div, equal, factorial, lessThan, lessThanOrEqual, mul, notEqual, or, pipe, safeToString, sub, toBindingOrder, toSafe, toString, toTextAreaValue
    )

{-|

@docs Operator

-}


{-| 決めていないというBlankを含む
-}
type Operator
    = Safe SafeOperator
    | Blank


{-| エラーのない演算子
-}
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


pipe : Operator
pipe =
    Safe Pipe


or : Operator
or =
    Safe Or


and : Operator
and =
    Safe And


equal : Operator
equal =
    Safe Equal


notEqual : Operator
notEqual =
    Safe NotEqual


lessThan : Operator
lessThan =
    Safe LessThan


lessThanOrEqual : Operator
lessThanOrEqual =
    Safe LessThanOrEqual


concat : Operator
concat =
    Safe Concat


add : Operator
add =
    Safe Add


sub : Operator
sub =
    Safe Sub


mul : Operator
mul =
    Safe Mul


div : Operator
div =
    Safe Div


factorial : Operator
factorial =
    Safe Factorial


compose : Operator
compose =
    Safe Compose


app : Operator
app =
    Safe App


blank : Operator
blank =
    Blank


toString : Operator -> Maybe String
toString operator =
    case operator of
        Safe safeOp ->
            Just (safeToString safeOp)

        Blank ->
            Nothing


safeToString : SafeOperator -> String
safeToString safeOperator =
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


toTextAreaValue : Operator -> List ( Char, Bool )
toTextAreaValue =
    toString >> Maybe.withDefault "" >> String.toList >> List.map (\c -> ( c, True ))


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


type OperatorBindingOrder
    = O0
    | O1
    | O2
    | O3
    | O4
    | O5
    | O6
    | O7


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


toSafe : Operator -> Maybe SafeOperator
toSafe op =
    case op of
        Safe so ->
            Just so

        Blank ->
            Nothing
