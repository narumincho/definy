module Page.Suggestion exposing (Message, Model, getSuggestionId, init, update, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Model Data.SuggestionId


type Message
    = Message


init : Data.SuggestionId -> ( Model, Message.Command )
init suggestionId =
    ( Model suggestionId
    , Message.None
    )


getSuggestionId : Model -> Data.SuggestionId
getSuggestionId (Model suggestionId) =
    suggestionId


update : Message -> Model -> ( Model, Message.Command )
update message model =
    ( model
    , Message.None
    )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    CommonUi.normalText 16 "ここは提案の編集ページ"
