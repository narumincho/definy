module Data.Id exposing
    ( ModuleId(..)
    , PartId(..)
    , ProjectId(..)
    , TypeId(..)
    , UserId(..)
    )

{-| ユーザーを識別するためのID
-}


type UserId
    = UserId String


{-| プロジェクトを識別するためのID
-}
type ProjectId
    = ProjectId String


{-| モジュールを識別するためのID
-}
type ModuleId
    = ModuleId String


{-| 型を識別するためのID
-}
type TypeId
    = TypeId String


{-| パーツを識別するためのID
-}
type PartId
    = PartId String
