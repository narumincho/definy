module Compiler.Opt exposing (Opt(..), toString)

import Data.IdHash


type Opt
    = I32Add Opt Opt
    | I32Sub Opt Opt
    | I32Mul Opt Opt
    | I32Const Int
    | Call Data.IdHash.PartId


toString : Opt -> String
toString opt =
    case opt of
        I32Add p0 p1 ->
            "(i32.add " ++ toString p0 ++ " " ++ toString p1 ++ ")"

        I32Sub p0 p1 ->
            "(i32.sub " ++ toString p0 ++ " " ++ toString p1 ++ ")"

        I32Mul p0 p1 ->
            "(i32.mul" ++ toString p0 ++ " " ++ toString p1 ++ ")"

        I32Const v ->
            "[i32.const " ++ String.fromInt v ++ "]"

        Call (Data.IdHash.PartId partId) ->
            "(call" ++ partId ++ ")"
