module Page.Project exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import Component.Style
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
view (Model (Data.ProjectId projectId)) =
    Component.Style.normalText 24 (projectId ++ "のプロジェクト詳細ページ")
