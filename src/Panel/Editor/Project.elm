module Panel.Editor.Project exposing (Model, initModel, view)

import Html


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Html msg) }
view =
    { title = "Project"
    , body =
        [ Html.div []
            [ Html.ul []
                [ Html.li [] [ Html.text "プロジェクトの全体の設定をする。実行回数、いいね数、フォーク数、検索用タグ" ]
                , Html.li [] [ Html.text "短い説明文、スクリーンショット、アイコン、イメージ画像、ライセンス" ]
                ]
            ]
        ]
    }
