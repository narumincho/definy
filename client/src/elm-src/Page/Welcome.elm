module Page.Welcome exposing (Model, Msg, init, view)

import Css
import Panel.Style
import Ui


type Model
    = Model { width : Int }


type Msg
    = Msg


type Cmd
    = Cmd


init : Model
init =
    Model
        { width = 250 }


update : Msg -> Model -> ( Model, List Cmd )
update msg model =
    ( model
    , []
    )


view : Model -> Ui.Panel Msg
view (Model rec) =
    Ui.row
        []
        []
        [ side { width = rec.width }
        , Panel.Style.gutterPanel False False |> Ui.map (always Msg)
        , yggdrasil
        ]


side : { width : Int } -> Ui.Panel msg
side { width } =
    Ui.depth
        []
        [ Ui.Width (Ui.Fix width) ]
        [ Ui.monochromatic
            []
            []
            (Css.rgb 32 32 32)
        , Ui.text
            []
            []
            { textAlign = Ui.TextAlignStart
            , verticalAlignment = Ui.CenterY
            , font =
                Ui.Font
                    { typeface = "Roboto"
                    , size = 24
                    , letterSpacing = 0
                    , color = Css.rgb 255 192 0
                    }
            }
            "Definyのロゴ、ログイン状態、検索欄、お気に入りのブランチ(プロジェクトでグループ)"
        ]


yggdrasil : Ui.Panel msg
yggdrasil =
    Ui.text
        []
        []
        { textAlign = Ui.TextAlignCenter
        , verticalAlignment = Ui.CenterY
        , font =
            Ui.Font
                { typeface = "Roboto"
                , size = 24
                , letterSpacing = 0
                , color = Css.rgb 0 255 100
                }
        }
        "ユグドラシル。Definy全てのプロジェクトの依存関係がグラフになるモニュメント"
