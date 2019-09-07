module Page.Welcome exposing (Model, Msg, init, view)

import Css
import Panel.Style
import Ui.Panel


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


view : Model -> Ui.Panel.Panel Msg
view (Model rec) =
    Ui.Panel.panel
        []
        []
        (Ui.Panel.RowList
            [ ( Ui.Panel.Fix rec.width, side { width = rec.width } )
            , Panel.Style.verticalGutterPanel False False |> Tuple.mapSecond (Ui.Panel.map (always Msg))
            , ( Ui.Panel.Flex 1, yggdrasil )
            ]
        )


side : { width : Int } -> Ui.Panel.Panel msg
side _ =
    Ui.Panel.panel
        []
        []
        (Ui.Panel.DepthList
            [ Ui.Panel.panel
                []
                []
                (Ui.Panel.Monochromatic (Css.rgb 32 32 32))
            , Ui.Panel.panel
                []
                []
                (Ui.Panel.Text
                    { textAlign = Ui.Panel.TextAlignStart
                    , verticalAlignment = Ui.Panel.CenterY
                    , font =
                        Ui.Panel.Font
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


yggdrasil : Ui.Panel.Panel msg
yggdrasil =
    Ui.Panel.panel
        []
        []
        (Ui.Panel.Text
            { textAlign = Ui.Panel.TextAlignCenter
            , verticalAlignment = Ui.Panel.CenterY
            , text = "ユグドラシル"
            , font =
                Ui.Panel.Font
                    { typeface = "Roboto"
                    , size = 24
                    , letterSpacing = 0
                    , color = Css.rgb 0 255 100
                    }
            }
        )
