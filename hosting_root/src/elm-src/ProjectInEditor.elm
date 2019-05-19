module ProjectInEditor exposing (ProjectInEditor)

import Project


type ProjectInEditor
    = ProjectInEditor


type Emit
    = Emit


init : Project.Project -> ( ProjectInEditor, List Emit )
init project =
    ( ProjectInEditor
    , []
    )
