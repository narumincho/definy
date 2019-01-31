module Compiler.SafeExpr exposing
    ( SafeExpr(..)
    , concat
    , push
    , toString
    )

import Project.Source.Module.Def.Expr.Operator as Op exposing (SafeOperator)
import Project.Source.Module.Def.Expr.Term as Term exposing (SafeTerm)


type SafeExpr
    = SafeExpr
        { head : SafeTerm
        , others : List ( SafeOperator, SafeTerm )
        }


getHead : SafeExpr -> SafeTerm
getHead (SafeExpr { head }) =
    head


getOthers : SafeExpr -> List ( SafeOperator, SafeTerm )
getOthers (SafeExpr { others }) =
    others


toString : SafeExpr -> String
toString (SafeExpr { head, others }) =
    Term.safeToString head
        ++ String.concat (List.map (\( op, term ) -> Op.safeToString op ++ Term.safeToString term) others)


push : ( SafeOperator, SafeTerm ) -> SafeExpr -> SafeExpr
push tuple (SafeExpr { head, others }) =
    SafeExpr
        { head = head
        , others = others ++ [ tuple ]
        }


concat : SafeExpr -> SafeOperator -> SafeExpr -> SafeExpr
concat left centerOp right =
    SafeExpr
        { head = getHead left
        , others = getOthers left ++ [ ( centerOp, getHead right ) ] ++ getOthers right
        }
