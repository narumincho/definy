module Page.Idea exposing (Message(..), Model, getIdeaId, init, update, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Model Data.IdeaId


type Message
    = Message


init : Data.IdeaId -> ( Model, Message.Command )
init ideaId =
    ( Model ideaId
    , Message.None
    )


getIdeaId : Model -> Data.IdeaId
getIdeaId (Model ideaId) =
    ideaId


update : Message -> Model -> ( Model, Message.Command )
update _ model =
    ( model
    , Message.None
    )


view : Model -> Ui.Panel Message
view _ =
    CommonUi.normalText 16 "アイデアの詳細ページ"
