module Compiler.SafeExprToNoOp exposing (convert)

import Compiler.NoOp as NoOp exposing (NoOp)
import Compiler.SafeExpr as SafeExpr exposing (SafeExpr(..))
import Project.Source.Module.Def.Expr.Operator as Op exposing (OperatorBindingOrder(..), SafeOperator)
import Project.Source.Module.Def.Expr.Term as Term exposing (SafeTerm)


convert : SafeExpr -> NoOp
convert (SafeExpr { head, others }) =
    case others of
        [] ->
            termToNoOp head

        ( op, term ) :: xs ->
            let
                a =
                    convertLoop
                        { left =
                            SafeExpr
                                { head = head
                                , others = []
                                }
                        , centerOp = op
                        , leftCandidate =
                            SafeExpr
                                { head = term
                                , others = []
                                }
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
            if Op.toBindingOrder op |> Op.bindingOrderLessThanOrEqual (Op.toBindingOrder centerOp) then
                convertLoop
                    { left = SafeExpr.concat left centerOp leftCandidate
                    , centerOp = op
                    , leftCandidate = SafeExpr { head = term, others = [] }
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


termToNoOp : SafeTerm -> NoOp
termToNoOp safeTerm =
    case safeTerm of
        Term.SIntLiteral x ->
            NoOp.Int x

        Term.SRef ref ->
            NoOp.Ref ref


opToNoOp : SafeOperator -> NoOp
opToNoOp op =
    case op of
        Op.Add ->
            NoOp.Core NoOp.Plus

        Op.Sub ->
            NoOp.Core NoOp.Minus

        Op.Mul ->
            NoOp.Core NoOp.Mul

        _ ->
            NoOp.Core NoOp.Plus
