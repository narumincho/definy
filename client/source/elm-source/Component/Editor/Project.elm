module Component.Editor.Project exposing (Model, initModel, view)

import Html.Styled


type Model
    = Model


initModel : Model
initModel =
    Model


view : { title : String, body : List (Html.Styled.Html msg) }
view =
    { title = "Project"
    , body =
        [ Html.Styled.div []
            [ Html.Styled.text "プロジェクトの全体の設定をする。実行回数、いいね数、フォーク数、検索用タグ、短い説明文、スクリーンショット、アイコン、イメージ画像、ライセンス" ]
        ]
    }
