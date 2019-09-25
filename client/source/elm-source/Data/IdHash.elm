module Data.IdHash exposing
    ( BranchId(..)
    , CommitHash(..)
    , ImageFileHash(..)
    , ModuleId(..)
    , PartHash(..)
    , PartId(..)
    , ProjectId(..)
    , TypeHash(..)
    , TypeId(..)
    , UserId(..)
    )

{-| 様々なデータを識別するためのIDやハッシュ値の型が定義されている
-}


{-| ユーザーを識別するためのID
-}
type UserId
    = UserId String


{-| 画像ファイルのハッシュ値
-}
type ImageFileHash
    = ImageFileHash String


{-| プロジェクトを識別するためのID
-}
type ProjectId
    = ProjectId String


{-| ブランチを識別するためのID
-}
type BranchId
    = BranchId String


{-| コミットを識別するためのHash
-}
type CommitHash
    = CommitHash String


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
