module Page.CreateIdea exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import CommonUi
import Data
import Ui


type Model
    = Model Data.ProjectId


type Message
    = Message


init : Data.ProjectId -> ( Model, Command.Command )
init projectId =
    ( Model projectId
    , Command.None
    )


getProjectId : Model -> Data.ProjectId
getProjectId (Model projectId) =
    projectId


update : Message -> Model -> ( Model, Command.Command )
update _ model =
    ( model
    , Command.None
    )


view : Model -> Ui.Panel Message
view _ =
    CommonUi.normalText 16 "アイデア作成ページ"
