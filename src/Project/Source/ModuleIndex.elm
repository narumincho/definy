module Project.Source.ModuleIndex exposing
    ( PartDefIndex(..)
    , TypeDefIndex(..)
    , partDefIndexToInt
    )

{-| モジュール内での型の参照
-}


type TypeDefIndex
    = TypeDefIndex Int


{-| モジュール内でのパースの参照
-}
type PartDefIndex
    = PartDefIndex Int


{-| パーツの位置をJSで扱いやすい形式に変換する
-}
partDefIndexToInt : PartDefIndex -> Int
partDefIndexToInt (PartDefIndex index) =
    index
