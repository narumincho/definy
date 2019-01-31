module Compiler.DefToSafeExpr exposing (convert)

import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Expr.Operator as Op
import Project.Source.Module.Def.Expr.Term as Term
import Compiler.SafeExpr exposing (SafeExpr(..))


convert : Def.Def -> Maybe SafeExpr
convert def =
    let
        expr =
            Def.getExpr def
    in
    case Term.toSafe (Expr.getHead expr) of
        Just safeHead ->
            Just
                (SafeExpr
                    { head = safeHead
                    , others =
                        Expr.getOthers expr
                            |> List.filterMap
                                (\( op, term ) ->
                                    case ( Op.toSafe op, Term.toSafe term ) of
                                        ( Just safeOp, Just safeTerm ) ->
                                            Just ( safeOp, safeTerm )
                                            
                                        _ ->
                                            Nothing
                                )
                    }
                )

        Nothing ->
            Nothing
