module Page.Welcome exposing (Model, init, view)

import Css
import Ui.Panel


type Model
    = Model


type Msg
    = Msg


type Cmd
    = Cmd


init : Model
init =
    Model


update : Msg -> Model -> ( Model, List Cmd )
update msg model =
    ( model
    , []
    )


view : Model -> Ui.Panel.FixGrow msg
view model =
    Ui.Panel.FixGrowFromGrowGrow
        { width = 200
        , growGrow =
            Ui.Panel.DepthList
                [ Ui.Panel.Box
                    { padding = 0
                    , border = Ui.Panel.borderNone
                    , color = Css.rgb 32 32 32
                    }
                , Ui.Panel.Text
                    { textAlign = Ui.Panel.TextAlignStart
                    , verticalAlignment = Ui.Panel.centerY
                    , font =
                        Ui.Panel.Font
                            { typeface = "Roboto"
                            , size = 24
                            , letterSpacing = 0
                            , color = Css.rgb 255 192 0
                            }
                    , text = "サイドパネル"
                    }
                ]
        }
