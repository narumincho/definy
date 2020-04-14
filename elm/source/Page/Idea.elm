module Page.Idea exposing (Message(..), Model, getIdeaId, init, update, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Loading Data.IdeaId
    | NotFound Data.IdeaId
    | Loaded Data.IdeaSnapshotAndId


type Message
    = Message


init : Data.IdeaId -> ( Model, Message.Command )
init ideaId =
    ( Loading ideaId
    , Message.None
    )


getIdeaId : Model -> Data.IdeaId
getIdeaId model =
    case model of
        Loading ideaId ->
            ideaId

        NotFound ideaId ->
            ideaId

        Loaded ideaSnapshotAndId ->
            ideaSnapshotAndId.id


update : Message -> Model -> ( Model, Message.Command )
update _ model =
    ( model
    , Message.None
    )


view : Model -> Ui.Panel Message
view _ =
    CommonUi.normalText 16 "アイデアの詳細ページ"
