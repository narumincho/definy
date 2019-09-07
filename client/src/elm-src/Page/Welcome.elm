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
    Ui.panel
        []
        []
        (Ui.RowList
            [ ( Ui.Fix rec.width, side { width = rec.width } )
            , Panel.Style.verticalGutterPanel False False |> Tuple.mapSecond (Ui.map (always Msg))
            , ( Ui.Flex 1, yggdrasil )
            ]
        )


side : { width : Int } -> Ui.Panel msg
side _ =
    Ui.panel
        []
        []
        (Ui.DepthList
            [ Ui.panel
                []
                []
                (Ui.Monochromatic (Css.rgb 32 32 32))
            , Ui.panel
                []
                []
                (Ui.Text
                    { textAlign = Ui.TextAlignStart
                    , verticalAlignment = Ui.CenterY
                    , font =
                        Ui.Font
                            { typeface = "Roboto"
                            , size = 24
                            , letterSpacing = 0
                            , color = Css.rgb 255 192 0
                            }
                    , text = "Definyのロゴ、ログイン状態、検索欄、お気に入りのブランチ(プロジェクトでグループ)"
                    }
                )
            ]
        )


yggdrasil : Ui.Panel msg
yggdrasil =
    Ui.panel
        []
        []
        (Ui.Text
            { textAlign = Ui.TextAlignCenter
            , verticalAlignment = Ui.CenterY
            , text = "ユグドラシル"
            , font =
                Ui.Font
                    { typeface = "Roboto"
                    , size = 24
                    , letterSpacing = 0
                    , color = Css.rgb 0 255 100
                    }
            }
        )
