module Project.SourceIndex exposing
    ( ModuleIndex(..)
    , PartIndex(..)
    , TypeIndex(..)
    , moduleIndexFromListInt
    , moduleIndexToListInt
    )

import Project.Source.ModuleIndex as ModuleIndex


{-| ソース内でのモジュールの位置、参照、インデックス
TODO その時々で変わるものを固定にしている
-}
type ModuleIndex
    = Core
    | CoreInt32
    | SampleModule


{-| 型の参照
-}
type TypeIndex
    = TypeIndex
        { moduleIndex : ModuleIndex
        , typeIndex : ModuleIndex.TypeDefIndex
        }


{-| パーツへの参照
-}
type PartIndex
    = PartIndex
        { moduleIndex : ModuleIndex
        , partIndex : ModuleIndex.PartDefIndex
        }


{-| JSとやり取りするするときに形式に変換する
-}
moduleIndexToListInt : ModuleIndex -> List Int
moduleIndexToListInt index =
    case index of
        SampleModule ->
            [ 0 ]

        Core ->
            [ 1 ]

        CoreInt32 ->
            [ 1, 0 ]


{-| JSとやり取りするする形式から扱いやすい形式にする
-}
moduleIndexFromListInt : List Int -> Maybe ModuleIndex
moduleIndexFromListInt intList =
    case intList of
        [ 0 ] ->
            Just SampleModule

        [ 1 ] ->
            Just Core

        [ 1, 0 ] ->
            Just CoreInt32

        _ ->
            Nothing
