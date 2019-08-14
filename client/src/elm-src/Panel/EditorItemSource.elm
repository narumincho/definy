module Panel.EditorItemSource exposing (EditorItemSource(..))

import Project.ModuleDefinitionIndex


type EditorItemSource
    = ProjectRoot
    | ProjectImport
    | Module Project.ModuleDefinitionIndex.ModuleIndex
    | EditorKeyConfig
