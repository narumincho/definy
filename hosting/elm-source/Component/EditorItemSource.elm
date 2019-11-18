module Component.EditorItemSource exposing (EditorItemSource(..))

import Data.IdHash


type EditorItemSource
    = ProjectRoot
    | ProjectImport
    | Module Data.IdHash.ModuleId
    | EditorKeyConfig
