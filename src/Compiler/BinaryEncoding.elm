module Compiler.BinaryEncoding exposing
    ( varsInt32
    , varsUInt32
    )

import Bitwise as B


{-|

    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#primitive-encoding-types"

    符号付き32bit整数1byte ～ 5 byteの可変長のバイナリに変換する

-}
varsInt32 : Int -> List Int
varsInt32 x =
    let
        b0 =
            x |> B.and 0x7F

        b1 =
            x |> B.shiftRightBy 7 |> B.and 0x7F

        b2 =
            x |> B.shiftRightBy 14 |> B.and 0x7F

        b3 =
            x |> B.shiftRightBy 21 |> B.and 0x7F
    in
    if ((-(2 ^ 7) // 2) <= x) && (x <= 2 ^ 7 // 2 - 1) then
        [ b0 ]

    else if ((-(2 ^ 14) // 2) <= x) && (x <= 2 ^ 14 // 2 - 1) then
        [ B.or b0 0x80, b1 ]

    else if ((-(2 ^ 21) // 2) <= x) && (x <= 2 ^ 21 // 2 - 1) then
        [ B.or b0 0x80, B.or b1 0x80, b2 ]

    else if ((-(2 ^ 28) // 2) <= x) && (x <= 2 ^ 28 // 2 - 1) then
        [ B.or b0 0x80, B.or b1 0x80, B.or b2 0x80, b3 ]

    else if 0 <= x then
        let
            b4 =
                x |> B.shiftRightBy 28 |> B.and 0x7F
        in
        [ B.or b0 0x80, B.or b1 0x80, B.or b2 0x80, B.or b3 0x80, b4 ]

    else
        let
            b4 =
                x |> B.shiftRightBy 28 |> B.and 0x7F |> B.or 0x70
        in
        [ B.or b0 0x80, B.or b1 0x80, B.or b2 0x80, B.or b3 0x80, b4 ]


{-|

    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#primitive-encoding-types"

    符号なし32bit整数を1byte ～ 5 byteの可変長のバイナリに変換する

-}
varsUInt32 : Int -> List Int
varsUInt32 x =
    let
        b0 =
            x |> B.and 0x7F

        b1 =
            x |> B.shiftRightBy 7 |> B.and 0x7F

        b2 =
            x |> B.shiftRightBy 14 |> B.and 0x7F

        b3 =
            x |> B.shiftRightBy 21 |> B.and 0x7F

        b4 =
            x |> B.shiftRightBy 28 |> B.and 0x7F
    in
    if b1 == 0 && b2 == 0 && b3 == 0 && b4 == 0 then
        [ b0 ]

    else if b2 == 0 && b3 == 0 && b4 == 0 then
        [ B.or b0 0x80, b1 ]

    else if b3 == 0 && b4 == 0 then
        [ B.or b0 0x80, B.or b1 0x80, b2 ]

    else if b4 == 0 then
        [ B.or b0 0x80, B.or b1 0x80, B.or b2 0x80, b3 ]

    else
        [ B.or b0 0x80, B.or b1 0x80, B.or b2 0x80, B.or b3 0x80, b4 ]
