module Panel.Editor.Config exposing (Model, initModel, view)

import Html


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Html msg) }
view =
    { title = "Input Config 入力設定"
    , body =
        [ Html.ul []
            [ Html.li [] [ Html.text "デフォルトのIO設定。キーボードとゲームパッドのデフォルトの設定。カメラや位置情報を使うという権限を表示する" ]
            ]
        ]
    }
