module Panel.CommandPalette exposing (Model, initModel, view)

import Css
import Html.Styled
import Html.Styled.Attributes
import Panel.Style as Style


type Model
    = Model


initModel : Model
initModel =
    Model


view : Model -> Html.Styled.Html msg
view model =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.position Css.absolute
            , Style.textColor
            , Css.backgroundColor (Css.rgb 0 0 0)
            , Css.width (Css.px 560)
            , Css.padding (Css.px 32)
            , Css.zIndex (Css.int 2)
            ]
        ]
        [ Html.Styled.text
            "コマンドパレット。でもメッセージを送信する機能だからメッセージポストかな。単に送るだけじゃなくてマクロを組み立てられるようにしたい"
        ]
