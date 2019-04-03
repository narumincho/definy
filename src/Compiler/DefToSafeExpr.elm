module Compiler.DefToSafeExpr exposing (convert)

import Compiler.SafeExpr exposing (SafeExpr(..), SafeOperator(..), SafeTerm(..))
import Project.SocrceIndex as SourceIndex
import Project.Source.Module.PartDef as Def
import Project.Source.Module.PartDef.Expr as Expr
import Project.Source.ModuleIndex as ModuleIndex


convert : Def.PartDef -> Maybe SafeExpr
convert def =
    exprToSafeExpr (Def.getExpr def)


exprToSafeExpr : Expr.Expr -> Maybe SafeExpr
exprToSafeExpr (Expr.ExprTermOp head others) =
    let
        safeHeadMaybe : Maybe SafeTerm
        safeHeadMaybe =
            termToSafeTerm head

        safeOthersMaybe : Maybe (List ( SafeOperator, SafeTerm ))
        safeOthersMaybe =
            others
                |> List.foldl
                    (\( op, term ) listMaybe ->
                        case ( listMaybe, opToSafeOp op, termToSafeTerm term ) of
                            ( Just list, Just safeOp, Just safeTerm ) ->
                                Just (list ++ [ ( safeOp, safeTerm ) ])

                            _ ->
                                Nothing
                    )
                    (Just [])
    in
    case ( safeHeadMaybe, safeOthersMaybe ) of
        ( Just safeHead, Just safeOthers ) ->
            Just
                (SafeExpr
                    safeHead
                    safeOthers
                )

        _ ->
            Nothing


termToSafeTerm : Expr.Term -> Maybe SafeTerm
termToSafeTerm term =
    case term of
        Expr.Int32Literal int ->
            Just (Int32Literal int)

        Expr.Part (SourceIndex.PartIndex { partIndex }) ->
            let
                (ModuleIndex.PartDefIndex index) =
                    partIndex
            in
            Just (Part index)

        Expr.Parentheses expr ->
            case exprToSafeExpr expr of
                Just safeExpr ->
                    Just (Parentheses safeExpr)

                Nothing ->
                    Nothing

        _ ->
            Nothing


opToSafeOp : Expr.Operator -> Maybe SafeOperator
opToSafeOp op =
    case op of
        Expr.Pipe ->
            Just Pipe

        Expr.Or ->
            Just Or

        Expr.And ->
            Just And

        Expr.Equal ->
            Just Equal

        Expr.NotEqual ->
            Just NotEqual

        Expr.LessThan ->
            Just LessThan

        Expr.LessThanOrEqual ->
            Just LessThanOrEqual

        Expr.Concat ->
            Just Concat

        Expr.Add ->
            Just Add

        Expr.Sub ->
            Just Sub

        Expr.Mul ->
            Just Mul

        Expr.Div ->
            Just Div

        Expr.Factorial ->
            Just Factorial

        Expr.Compose ->
            Just Compose

        Expr.App ->
            Just App

        Expr.Blank ->
            Nothing
