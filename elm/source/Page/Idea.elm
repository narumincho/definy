module Page.Idea exposing (Message(..), Model, getIdeaId, init, update, updateByCommonMessage, view)

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
    , Message.GetIdea ideaId
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


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage message model =
    case message of
        Message.ResponseIdea idea ->
            case idea.snapshotMaybe of
                Just snapshot ->
                    ( Loaded { id = idea.id, snapshot = snapshot }
                    , Message.GetUser snapshot.createUser
                    )

                Nothing ->
                    ( NotFound idea.id
                    , Message.None
                    )

        _ ->
            ( model
            , Message.None
            )


update : Message -> Model -> ( Model, Message.Command )
update _ model =
    ( model
    , Message.None
    )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case model of
        Loading ideaId ->
            loadingView ideaId

        NotFound ideaId ->
            notFoundView ideaId

        Loaded ideaSnapshotAndId ->
            mainView subModel ideaSnapshotAndId


loadingView : Data.IdeaId -> Ui.Panel Message
loadingView (Data.IdeaId ideaIdAsString) =
    CommonUi.normalText 16 ("ideaId = " ++ ideaIdAsString ++ " を読込中")


notFoundView : Data.IdeaId -> Ui.Panel Message
notFoundView (Data.IdeaId ideaIdAsString) =
    CommonUi.normalText 16 ("ideaId = " ++ ideaIdAsString ++ " が見つからなかった")


mainView : Message.SubModel -> Data.IdeaSnapshotAndId -> Ui.Panel Message
mainView subModel ideaSnapshotAndId =
    let
        (Data.IdeaId ideaIdAsString) =
            ideaSnapshotAndId.id
    in
    Ui.column
        [ Ui.width (Ui.stretchWithMaxSize 800), Ui.gap 8 ]
        [ CommonUi.subText ideaIdAsString
        , CommonUi.normalText 24 ideaSnapshotAndId.snapshot.name
        , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "いいだしっぺ"
            , CommonUi.userView subModel ideaSnapshotAndId.snapshot.createUser
            ]
        , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "作成日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                ideaSnapshotAndId.snapshot.createTime
            ]
        , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "更新日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                ideaSnapshotAndId.snapshot.updateTime
            ]
        , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "取得日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                ideaSnapshotAndId.snapshot.getTime
            ]
        , Ui.column
            []
            (List.map (itemView subModel) ideaSnapshotAndId.snapshot.itemList)
        ]


itemView : Message.SubModel -> Data.IdeaItem -> Ui.Panel Message
itemView subModel ideaItem =
    case ideaItem of
        Data.IdeaItemComment comment ->
            CommonUi.normalText 16 "コメント"

        Data.IdeaItemSuggestion suggestion ->
            CommonUi.normalText 16 "提案"
