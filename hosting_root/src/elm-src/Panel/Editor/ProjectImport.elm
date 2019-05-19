module Panel.Editor.ProjectImport exposing (Model, initModel, view)

import Html


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Html msg) }
view =
    { title = "Project Import"
    , body =
        [ Html.ul []
            [ Html.li [] [ Html.text "ここでは外部から読み込むプロジェクトの一覧を表示する。package.json、package-lock.json、elm.jsonのようなもの" ]
            ]
        ]
    }
