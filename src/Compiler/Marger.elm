module Compiler.Marger exposing (codeSection, exportSection, functionSection, marge, typeSection, wasmBinaryMagic, wasmBinaryVersion)

import Array exposing (Array)
import Compiler.BinaryEncoding as BinaryEncoding


marge : List (List Int) -> List Int
marge binaryList =
    let
        length =
            List.length binaryList
    in
    List.concat
        [ wasmBinaryMagic
        , wasmBinaryVersion
        , typeSection
        , functionSection length
        , exportSection length
        , codeSection binaryList
        ]


{-|

    WASM_BINARY_MAGIC

    magic_cookie

    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#module-contents"

-}
wasmBinaryMagic : List Int
wasmBinaryMagic =
    [ 0x00, 0x61, 0x73, 0x6D ]


{-|

    WASM_BINARY_VERSION

    version

    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#module-contents"

-}
wasmBinaryVersion : List Int
wasmBinaryVersion =
    [ 0x01, 0x00, 0x00, 0x00 ]


{-|

    使われる型の組み合わせを指定する
    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#type-section"

-}
typeSection : List Int
typeSection =
    let
        numberOfType =
            [ 1 ]

        -- とりあえず ():i32 だけ
        body =
            [ 0x60, 0x00, 0x01, 0x7F ]

        length =
            List.length numberOfType + List.length body
    in
    List.concat
        [ [ 0x01 ]
        , BinaryEncoding.varsUInt32 length
        , numberOfType
        , body
        ]


{-|

    関数の型をTypeSectionで指定した番号で指定する
    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#function-section"

-}
functionSection : Int -> List Int
functionSection numberOfFunction =
    let
        numberOfFunctionBinary =
            [ numberOfFunction ]

        -- とりあえず、すべての関数の型はTypeSectionで指定した0番にしよう
        body =
            List.repeat numberOfFunction 0x00

        length =
            List.length numberOfFunctionBinary + List.length body
    in
    List.concat
        [ [ 0x03 ]
        , BinaryEncoding.varsUInt32 length
        , numberOfFunctionBinary
        , body
        ]


{-|

    エキスポートする関数を指定する。
    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#export-section"

-}
exportSection : Int -> List Int
exportSection numberOfFunction =
    let
        numberOfFunctionBinary =
            [ numberOfFunction ]

        body =
            List.range 0 (numberOfFunction - 1)
                |> List.concatMap exportFunctionName

        length =
            List.length numberOfFunctionBinary + List.length body
    in
    List.concat
        [ [ 0x07 ]
        , BinaryEncoding.varsUInt32 length
        , numberOfFunctionBinary
        , body
        ]


exportFunctionName : Int -> List Int
exportFunctionName index =
    let
        digitList =
            toDigitList index
    in
    List.length digitList
        -- 文字数
        :: (digitList |> List.map ((+) 0x30))
        -- 文字本体
        ++ [ 0x00 -- 文字の終わり示す
           , index -- エキスポートする関数の番号
           ]


toDigitList : Int -> List Int
toDigitList x =
    if x <= 0 then
        [ 0 ]

    else
        toDigitListLoop x


toDigitListLoop : Int -> List Int
toDigitListLoop x =
    if x <= 0 then
        []

    else if x < 10 then
        [ x ]

    else
        toDigitList (x // 10) ++ [ x |> modBy 10 ]


{-|

    それぞれの関数の中身をしていする
    "https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md#code-section"

-}
codeSection : List (List Int) -> List Int
codeSection codeList =
    let
        numberOfFunctionBinary =
            [ List.length codeList ]

        -- TODO 雑な実装 これでちゃんと複数の定義に対応できているのか?
        body =
            List.concat codeList

        length =
            List.length numberOfFunctionBinary
                + List.length body
    in
    List.concat
        [ [ 0x0A ]
        , BinaryEncoding.varsUInt32 length
        , numberOfFunctionBinary
        , body
        ]
