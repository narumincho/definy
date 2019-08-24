module Panel.EditorItemSource exposing (EditorItemSource(..))

import Data.Id


type EditorItemSource
    = ProjectRoot
    | ProjectImport
    | Module Data.Id.ModuleId
    | EditorKeyConfig
