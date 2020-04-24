module Page.Suggestion exposing (Message, Model, getSuggestionId, init, update, updateByCommonMessage, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Loading Data.SuggestionId
    | Loaded LoadedModel
    | NotFound Data.SuggestionId


type LoadedModel
    = LoadedModel
        { id : Data.SuggestionId
        , snapshot : Data.SuggestionSnapshot
        }


type Message
    = Message


init : Data.SuggestionId -> ( Model, Message.Command )
init suggestionId =
    ( Loading suggestionId
    , Message.GetSuggestion suggestionId
    )


getSuggestionId : Model -> Data.SuggestionId
getSuggestionId model =
    case model of
        Loading suggestionId ->
            suggestionId

        Loaded (LoadedModel { id }) ->
            id

        NotFound suggestionId ->
            suggestionId


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage commonMessage model =
    case commonMessage of
        Message.ResponseSuggestion suggestionResponse ->
            if suggestionResponse.id == getSuggestionId model then
                case suggestionResponse.snapshotMaybe of
                    Just suggestionSnapshot ->
                        ( Loaded
                            (LoadedModel
                                { id = suggestionResponse.id
                                , snapshot = suggestionSnapshot
                                }
                            )
                        , Message.GetUser suggestionSnapshot.createUserId
                        )

                    Nothing ->
                        ( NotFound suggestionResponse.id
                        , Message.None
                        )

            else
                ( model
                , Message.None
                )

        _ ->
            ( model
            , Message.None
            )


update : Message -> Model -> ( Model, Message.Command )
update message model =
    ( model
    , Message.None
    )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        [ case model of
            Loading (Data.SuggestionId suggestionIdAsString) ->
                CommonUi.normalText 16 ("Suggestionを読込中. id=" ++ suggestionIdAsString)

            Loaded loadedModel ->
                mainView subModel loadedModel

            NotFound (Data.SuggestionId suggestionIdAsString) ->
                CommonUi.normalText 16 ("Suggestionが見つからなかった id=" ++ suggestionIdAsString)
        ]


mainView : Message.SubModel -> LoadedModel -> Ui.Panel Message
mainView subModel (LoadedModel record) =
    CommonUi.table
        [ ( "提案名", CommonUi.normalText 16 record.snapshot.name )
        , ( "変更理由", CommonUi.normalText 16 record.snapshot.reason )
        , ( "作成者", CommonUi.userView subModel record.snapshot.createUserId )
        , ( "取得日時", CommonUi.timeView subModel record.snapshot.getTime )
        ]
