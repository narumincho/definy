module Panel.Editor.Source exposing (Model, initModel, view)

import Html


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Html msg) }
view =
    { title = "Source ソース"
    , body =
        [ Html.text "ここではソースの概要を表示する。バージョン管理、更新のバグ修正と新機能、エラーの一覧(TODOリスト),view,update,initの設定…"
        ]
    }
