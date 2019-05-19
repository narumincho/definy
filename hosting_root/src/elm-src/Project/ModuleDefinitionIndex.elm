module Project.ModuleDefinitionIndex exposing
    ( ModuleIndex(..)
    , PartIndex(..)
    , TypeIndex(..)
    , moduleIndexFromListInt
    , moduleIndexToListInt
    )

import Project.ModuleDefinition.ModuleIndex as ModuleIndex


{-| プロジェクトのモジュール定義の中でのモジュールの位置、参照、インデックス
-}
type ModuleIndex
    = SampleModule


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


{-| JSとやり取りするする形式から扱いやすい形式にする
-}
moduleIndexFromListInt : List Int -> Maybe ModuleIndex
moduleIndexFromListInt intList =
    case intList of
        [ 0 ] ->
            Just SampleModule

        _ ->
            Nothing
