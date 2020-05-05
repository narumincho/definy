module Page.Suggestion exposing (Message, Model, getSuggestionId, init, update, updateByCommonMessage, view)

import CommonUi
import Css
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
    = InputNewPartName String


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
        Ui.stretch
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
    Ui.column
        Ui.stretch
        Ui.stretch
        []
        [ Ui.scroll
            Ui.stretch
            Ui.stretch
            []
            (Ui.column
                Ui.stretch
                Ui.auto
                []
                [ CommonUi.table
                    [ ( "提案名", CommonUi.normalText 16 record.snapshot.name )
                    , ( "変更理由", CommonUi.normalText 16 record.snapshot.reason )
                    , ( "作成者", CommonUi.userView subModel record.snapshot.createUserId )
                    , ( "取得日時", CommonUi.timeView subModel record.snapshot.getTime )
                    ]
                , addPartView
                ]
            )
        , inputPanel
        ]


addPartView : Ui.Panel Message
addPartView =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        [ Ui.row
            Ui.stretch
            Ui.auto
            []
            [ Ui.empty
                (Ui.fix 256)
                (Ui.fix 32)
                [ borderStyle ]
            , CommonUi.normalText 24 ":"
            , Ui.empty
                (Ui.fix 256)
                (Ui.fix 32)
                [ borderStyle ]
            ]
        , Ui.row
            Ui.stretch
            Ui.auto
            []
            [ CommonUi.normalText 24 "="
            , Ui.empty
                (Ui.fix 512)
                (Ui.fix 32)
                [ borderStyle ]
            ]
        ]


borderStyle : Ui.Style
borderStyle =
    Ui.border
        (Ui.BorderStyle
            { color = Css.rgb 27 227 2
            , width =
                { top = 1
                , right = 1
                , left = 1
                , bottom = 1
                }
            }
        )


inputPanel : Ui.Panel message
inputPanel =
    Ui.column
        Ui.stretch
        (Ui.fix 300)
        []
        [ CommonUi.normalText 16 "入力パネル"
        , CommonUi.normalText 16 "WASDで移動…したい"
        ]
