module Page.User exposing (Message, Model, getUserId, init, update, view)

import Command
import Component.Style
import Data
import Ui


type Model
    = Model Data.UserId


type Message
    = Message


init : Data.UserId -> ( Model, Command.Command )
init userId =
    ( Model userId
    , Command.None
    )


getUserId : Model -> Data.UserId
getUserId (Model userId) =
    userId


update : Message -> Model -> ( Model, Command.Command )
update message model =
    ( model
    , Command.None
    )


view : Model -> Ui.Panel Message
view (Model (Data.UserId userId)) =
    Component.Style.normalText 24 (userId ++ "のユーザー詳細ページ")
