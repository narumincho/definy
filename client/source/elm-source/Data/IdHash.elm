module Data.IdHash exposing
    ( ModuleId(..)
    , PartHash(..)
    , PartId(..)
    , ProjectId(..)
    , TypeHash(..)
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


{-| 型のスナップショットを識別するためのハッシュ値
-}
type TypeHash
    = TypeHash String


{-| パーツのスナップショットを識別するためのハッシュ値
-}
type PartHash
    = PartHash String
