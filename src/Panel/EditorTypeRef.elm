module Panel.EditorTypeRef exposing (EditorTypeRef(..))

import Project


type EditorTypeRef
    = EditorProject Project.ProjectRef
    | EditorKeyConfig
