module Component.EditorItemSource exposing (EditorItemSource(..))

import Data


type EditorItemSource
    = ProjectRoot
    | ProjectImport
    | Module Data.ModuleId
    | EditorKeyConfig
