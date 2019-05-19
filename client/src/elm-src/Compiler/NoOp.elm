module Compiler.NoOp exposing
    ( CoreEnum(..)
    , NoOp(..)
    , coreEnumToString
    , toString
    )

{-|

    演算子のない形式

-}


{-| 演算子のない形式
-}
type NoOp
    = Core CoreEnum
    | Int Int
    | Ref Int
    | Call1 NoOp NoOp
    | Call2 NoOp NoOp NoOp


type CoreEnum
    = Plus
    | Minus
    | Mul


toString : NoOp -> String
toString noOp =
    case noOp of
        Core coreEnum ->
            coreEnumToString coreEnum

        Int x ->
            String.fromInt x

        Ref defNum ->
            "!" ++ String.fromInt defNum

        Call1 f x ->
            "(" ++ toString f ++ " " ++ toString x ++ ")"

        Call2 f x y ->
            "(" ++ toString f ++ " " ++ toString x ++ " " ++ toString y ++ ")"


coreEnumToString : CoreEnum -> String
coreEnumToString coreEnum =
    case coreEnum of
        Plus ->
            "+"

        Minus ->
            "-"

        Mul ->
            "*"
