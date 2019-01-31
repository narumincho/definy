module Compiler.NoOpToOpt exposing (convert)

import Compiler.NoOp as NoOp exposing (NoOp)
import Compiler.Opt as Opt exposing (Opt)


convert : NoOp -> Maybe Opt
convert noOp =
    case noOp of
        NoOp.Int v ->
            Just (Opt.I32Const v)

        NoOp.Ref defNum ->
            Just (Opt.Call defNum)

        NoOp.Call2 (NoOp.Core NoOp.Plus) p0 p1 ->
            case ( convert p0, convert p1 ) of
                ( Just opt0, Just opt1 ) ->
                    Just (Opt.I32Add opt0 opt1)

                _ ->
                    Nothing

        NoOp.Call2 (NoOp.Core NoOp.Minus) p0 p1 ->
            case ( convert p0, convert p1 ) of
                ( Just opt0, Just opt1 ) ->
                    Just (Opt.I32Sub opt0 opt1)

                _ ->
                    Nothing

        NoOp.Call2 (NoOp.Core NoOp.Mul) p0 p1 ->
            case ( convert p0, convert p1 ) of
                ( Just opt0, Just opt1 ) ->
                    Just (Opt.I32Mul opt0 opt1)

                _ ->
                    Nothing

        _ ->
            Nothing



--    = Core CoreEnum
--    | Int Int
--    | Ref Int
--    | Call1 NoOp NoOp
--    | Call2 NoOp NoOp NoOp
--
--    type CoreEnum
--        = Plus
--        | Minus
--        | Mul
