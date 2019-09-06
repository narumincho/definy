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


view : Model -> Ui.Panel.GrowGrow Msg
view (Model rec) =
    Ui.Panel.panel
        []
        0
        (Ui.Panel.RowList
            [ Ui.Panel.FixGrowOrGrowGrowFixGrow (side { width = rec.width })
            , Ui.Panel.FixGrowOrGrowGrowFixGrow (Panel.Style.verticalGutterPanel False False |> Ui.Panel.mapFixGrow (always Msg))
            , Ui.Panel.FixGrowOrGrowGrowGrowGrow yggdrasil
            ]
        )


side : { width : Int } -> Ui.Panel.FixGrow msg
side { width } =
    Ui.Panel.FixGrowFromGrowGrow
        { width = 500
        , growGrow =
            Ui.Panel.panel
                []
                0
                (Ui.Panel.DepthList
                    [ Ui.Panel.panel
                        []
                        0
                        (Ui.Panel.Monochromatic (Css.rgb 32 32 32))
                    , Ui.Panel.panel
                        []
                        0
                        (Ui.Panel.Text
                            { textAlign = Ui.Panel.TextAlignStart
                            , verticalAlignment = Ui.Panel.centerY
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
        }


yggdrasil : Ui.Panel.GrowGrow msg
yggdrasil =
    Ui.Panel.panel
        []
        0
        (Ui.Panel.Text
            { textAlign = Ui.Panel.TextAlignCenter
            , verticalAlignment = Ui.Panel.centerY
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
