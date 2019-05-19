module Panel.CommandPalette exposing (Model, initModel, view)

import Html
import Html.Attributes


type Model
    = Model


initModel : Model
initModel =
    Model


view : Model -> Html.Html msg
view model =
    Html.div
        [ Html.Attributes.class "commandPalette" ]
        [ Html.text
            "コマンドパレット。でもメッセージを送信する機能だからメッセージポストかな。単に送るだけじゃなくてマクロを組み立てられるようにしたい"
        ]
