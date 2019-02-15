module Compiler.SafeExprToNoOp exposing (convert)

import Compiler.NoOp as NoOp exposing (NoOp)
import Compiler.SafeExpr as SafeExpr exposing (SafeExpr(..), SafeOperator(..), SafeTerm(..))


convert : SafeExpr -> NoOp
convert (SafeExpr head others) =
    case others of
        [] ->
            termToNoOp head

        ( op, term ) :: xs ->
            let
                a =
                    convertLoop
                        { left = SafeExpr head []
                        , centerOp = op
                        , leftCandidate = SafeExpr term []
                        , right = xs
                        }
            in
            NoOp.Call2 (opToNoOp a.centerOp) (convert a.left) (convert a.right)


convertLoop : { left : SafeExpr, centerOp : SafeOperator, leftCandidate : SafeExpr, right : List ( SafeOperator, SafeTerm ) } -> { left : SafeExpr, centerOp : SafeOperator, right : SafeExpr }
convertLoop { left, centerOp, leftCandidate, right } =
    case right of
        [] ->
            { left = left, centerOp = centerOp, right = leftCandidate }

        ( op, term ) :: xs ->
            if SafeExpr.toBindingOrder op |> SafeExpr.bindingOrderLessThanOrEqual (SafeExpr.toBindingOrder centerOp) then
                convertLoop
                    { left = SafeExpr.concat left centerOp leftCandidate
                    , centerOp = op
                    , leftCandidate = SafeExpr term []
                    , right = xs
                    }

            else
                convertLoop
                    { left = left
                    , centerOp = centerOp
                    , leftCandidate = leftCandidate |> SafeExpr.push ( op, term )
                    , right = xs
                    }


type alias State =
    { left : SafeExpr
    , centerOp : SafeOperator
    , right : SafeExpr
    }


{-| TODO かっこ(Parentheses)も正しくNoOpに変換する
-}
termToNoOp : SafeTerm -> NoOp
termToNoOp safeTerm =
    case safeTerm of
        Int32Literal int ->
            NoOp.Int int

        Part ref ->
            NoOp.Ref ref

        Parentheses safeExpr ->
            NoOp.Int 100


{-| TODO 他の演算子も正しくNoOpに変換する
-}
opToNoOp : SafeOperator -> NoOp
opToNoOp op =
    case op of
        Add ->
            NoOp.Core NoOp.Plus

        Sub ->
            NoOp.Core NoOp.Minus

        Mul ->
            NoOp.Core NoOp.Mul

        _ ->
            NoOp.Core NoOp.Plus
