module Page.CreateProject exposing (Message, Model, init, update, view)

import Command
import Component.Style
import Css
import Ui


type Model
    = Model { decodedProjectName : Maybe String }


type Message
    = Message


init : ( Model, Command.Command )
init =
    ( Model
        { decodedProjectName = Nothing }
    , Command.none
    )


update : Message -> Model -> ( Model, Command.Command )
update _ model =
    ( model
    , Command.none
    )


view : Model -> Ui.Panel message
view (Model record) =
    Ui.text
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.TextAttributes
            { text = "プロジェクト作成ページ"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )
