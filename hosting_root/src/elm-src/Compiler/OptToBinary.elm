module Compiler.OptToBinary exposing (convert)

import Compiler.BinaryEncoding as BinaryEncoding
import Compiler.Opt as Opt exposing (Opt)


type WatLike
    = I32Const Int
    | Call Int
    | I32Add
    | I32Sub
    | I32Mul


convert : Opt -> List Int
convert opt =
    let
        binary =
            [ 0x00 ]
                ++ (opt
                        |> optToWatLikeList
                        |> List.concatMap watLikeToBinary
                   )
                ++ [ 0x0B ]
    in
    BinaryEncoding.varsUInt32 (List.length binary) ++ binary


optToWatLikeList : Opt -> List WatLike
optToWatLikeList opt =
    case opt of
        Opt.I32Add p0 p1 ->
            optToWatLikeList p0
                ++ optToWatLikeList p1
                ++ [ I32Add ]

        Opt.I32Sub p0 p1 ->
            optToWatLikeList p0
                ++ optToWatLikeList p1
                ++ [ I32Sub ]

        Opt.I32Mul p0 p1 ->
            optToWatLikeList p0
                ++ optToWatLikeList p1
                ++ [ I32Mul ]

        Opt.I32Const v ->
            [ I32Const v ]

        Opt.Call defNum ->
            [ Call defNum ]


watLikeToBinary : WatLike -> List Int
watLikeToBinary watLike =
    case watLike of
        I32Const v ->
            0x41 :: BinaryEncoding.varsInt32 v

        Call defNum ->
            0x10 :: BinaryEncoding.varsInt32 defNum

        I32Add ->
            [ 0x6A ]

        I32Sub ->
            [ 0x6B ]

        I32Mul ->
            [ 0x6C ]
