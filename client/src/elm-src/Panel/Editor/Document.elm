module Panel.Editor.Document exposing (Model, initModel, view)

import Html


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Html msg) }
view =
    { title = "Document ドキュメント"
    , body = [ Html.text "使い方説明、説明書の意味を持つ。GitHubのREADME.mdみたいなもの。" ]
    }
