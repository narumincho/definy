module Component.Editor.ProjectImport exposing (Model, initModel, view)

import Html.Styled


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Styled.Html msg) }
view =
    { title = "Project Import"
    , body =
        [ Html.Styled.div
            []
            [ Html.Styled.text "ここでは外部から読み込むプロジェクトの一覧を表示する。package.json、package-lock.json、elm.jsonのようなもの" ]
        ]
    }
