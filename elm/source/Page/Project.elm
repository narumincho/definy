module Page.Project exposing (Message(..), Model, init, update, view)

import Command
import Data
import Ui


type Model
    = Model


type Message
    = Message


init : Data.ProjectId -> ( Model, Command.Command )
init projectId =
    ( Model
    , Command.None
    )


update : Message -> Model -> ( Model, Command.Command )
update _ model =
    ( model
    , Command.None
    )


view : Model -> Ui.Panel Message
view _ =
    Ui.empty []
