module Page.Welcome exposing (Model, init, view)

import Palette.X11
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


view : Model -> Ui.Panel.GrowGrow msg
view model =
    Ui.Panel.Text
        { textAlign = Ui.Panel.TextAlignStart
        , verticalAlignment = Ui.Panel.centerY
        , font =
            Ui.Panel.Font
                { typeface = "Roboto"
                , size = 24
                , letterSpacing = 0
                , color = Palette.X11.skyBlue
                }
        , text = "welcomeページ"
        }
