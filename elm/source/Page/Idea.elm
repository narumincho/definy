module Page.Idea exposing (Message(..), Model, getIdeaId, init, update, updateByCommonMessage, view)

import CommonUi
import Data
import Data.LogInState
import Message
import Ui


type Model
    = Loading Data.IdeaId
    | NotFound Data.IdeaId
    | Loaded LoadedModel


type alias LoadedModel =
    { id : Data.IdeaId
    , snapshot : Data.IdeaSnapshot
    , comment : Comment
    }


type Comment
    = Inputting String
    | Sending


type Message
    = InputComment String
    | Comment
    | Suggestion


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
                    ( Loaded
                        { id = idea.id
                        , snapshot = snapshot
                        , comment = Inputting ""
                        }
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
update message model =
    case ( message, model ) of
        ( InputComment comment, Loaded loadedModel ) ->
            ( Loaded
                { loadedModel | comment = Inputting comment }
            , Message.None
            )

        ( Comment, Loaded loadedModel ) ->
            case loadedModel.comment of
                Sending ->
                    ( model
                    , Message.None
                    )

                Inputting comment ->
                    ( Loaded
                        { loadedModel | comment = Sending }
                    , Message.AddComment
                        { ideaId = loadedModel.id
                        , comment = comment
                        }
                    )

        ( _, _ ) ->
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


mainView : Message.SubModel -> LoadedModel -> Ui.Panel Message
mainView subModel loadedModel =
    let
        (Data.IdeaId ideaIdAsString) =
            loadedModel.id
    in
    Ui.column
        [ Ui.width (Ui.stretchWithMaxSize 800), Ui.gap 8 ]
        ([ CommonUi.subText ideaIdAsString
         , CommonUi.normalText 24 loadedModel.snapshot.name
         , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "いいだしっぺ"
            , CommonUi.userView subModel loadedModel.snapshot.createUser
            ]
         , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "作成日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                loadedModel.snapshot.createTime
            ]
         , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "更新日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                loadedModel.snapshot.updateTime
            ]
         , Ui.row
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            [ CommonUi.normalText 16 "取得日時"
            , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel)
                loadedModel.snapshot.getTime
            ]
         , Ui.column
            [ Ui.width Ui.stretch, Ui.gap 8 ]
            (List.map (itemView subModel) loadedModel.snapshot.itemList)
         ]
            ++ (case Message.getLogInState subModel of
                    Data.LogInState.Ok _ ->
                        [ Ui.column
                            [ Ui.width Ui.stretch ]
                            [ Ui.textInput
                                [ Ui.width Ui.stretch ]
                                (Ui.TextInputAttributes
                                    { inputMessage = InputComment
                                    , name = "comment"
                                    , multiLine = True
                                    , fontSize = 16
                                    }
                                )
                            , CommonUi.button
                                Comment
                                "コメントする"
                            ]
                        , CommonUi.button
                            Suggestion
                            "編集提案をする"
                        ]

                    _ ->
                        []
               )
        )


itemView : Message.SubModel -> Data.IdeaItem -> Ui.Panel Message
itemView subModel ideaItem =
    case ideaItem of
        Data.IdeaItemComment comment ->
            Ui.row
                [ Ui.width Ui.stretch ]
                [ CommonUi.userView subModel comment.createdBy
                , Ui.column
                    [ Ui.width Ui.stretch ]
                    [ CommonUi.stretchText 24 comment.body
                    , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel) comment.createdAt
                    ]
                ]

        Data.IdeaItemSuggestion suggestion ->
            CommonUi.normalText 24 "提案"



--addCommentButton : Message.SubModel
