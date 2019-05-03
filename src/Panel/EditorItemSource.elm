module Panel.EditorItemSource exposing (EditorItemSource(..))

import Project.ModuleDefinitionIndex


type EditorItemSource
    = ProjectRoot
    | Document
    | ProjectImport
    | ModuleDefinition
    | Module Project.ModuleDefinitionIndex.ModuleIndex
    | EditorKeyConfig
