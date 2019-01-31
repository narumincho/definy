module Compiler exposing
    ( CompileResult(..)
    , compile
    , compileResultToString
    , getBinary
    )

import Array exposing (Array)
import Project.Source.Module.Def as Def
import Compiler.DefToSafeExpr as DefToSafeExpr
import Compiler.NoOp as NoOp
import Compiler.NoOpToOpt as NoOpToOpt
import Compiler.Opt as Opt
import Compiler.OptToBinary as OptToBinary
import Compiler.SafeExpr as SafeExpr
import Compiler.SafeExprToNoOp as SafeExprToNoOp


type CompileResult
    = Success
        { noOp : NoOp.NoOp
        , opt : Opt.Opt
        , binary : List Int
        }
    | FailureAtNoOpToOpt
        { noOp : NoOp.NoOp
        }
    | FailureAll


compile : Def.Def -> CompileResult
compile def =
    case DefToSafeExpr.convert def of
        Just safeExpr ->
            let
                noOp =
                    SafeExprToNoOp.convert safeExpr
            in
            case NoOpToOpt.convert noOp of
                Just opt ->
                    Success
                        { noOp = noOp
                        , opt = opt
                        , binary = OptToBinary.convert opt
                        }

                Nothing ->
                    FailureAtNoOpToOpt
                        { noOp = noOp
                        }

        Nothing ->
            FailureAll


compileResultToString : CompileResult -> String
compileResultToString result =
    case result of
        Success { opt } ->
            "成功" ++ Opt.toString opt

        FailureAtNoOpToOpt { noOp } ->
            "途中で失敗" ++ NoOp.toString noOp

        FailureAll ->
            "空欄の部分があるかも"


getBinary : CompileResult -> Maybe (List Int)
getBinary result =
    case result of
        Success { binary } ->
            Just binary

        _ ->
            Nothing
