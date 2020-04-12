module Page.Idea exposing (Message(..), Model, getIdeaId, init, update, view)

import Command
import CommonUi
import Data
import Ui


type Model
    = Model Data.IdeaId


type Message
    = Message


init : Data.IdeaId -> ( Model, Command.Command )
init ideaId =
    ( Model ideaId
    , Command.None
    )


getIdeaId : Model -> Data.IdeaId
getIdeaId (Model ideaId) =
    ideaId


update : Message -> Model -> ( Model, Command.Command )
update _ model =
    ( model
    , Command.None
    )


view : Model -> Ui.Panel Message
view _ =
    CommonUi.normalText 16 "アイデアの詳細ページ"
