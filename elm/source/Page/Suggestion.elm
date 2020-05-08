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
        , project : Maybe Data.ProjectSnapshot
        , select : Select
        }


type Select
    = TypePart
    | NewTypePartName


type Message
    = InputNewTypePartName String
    | RequestLogInUrl Data.OpenIdConnectProvider


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
                                , project = Nothing
                                , select = TypePart
                                }
                            )
                        , Message.Batch
                            [ Message.GetUser suggestionSnapshot.createUserId
                            , Message.GetProject suggestionSnapshot.projectId
                            ]
                        )

                    Nothing ->
                        ( NotFound suggestionResponse.id
                        , Message.None
                        )

            else
                ( model
                , Message.None
                )

        Message.ResponseProject projectSnapshot ->
            case model of
                Loaded (LoadedModel loadedModel) ->
                    if loadedModel.snapshot.projectId == projectSnapshot.id then
                        case projectSnapshot.snapshotMaybe of
                            Just snapshot ->
                                ( Loaded
                                    (LoadedModel
                                        { loadedModel | project = Just snapshot }
                                    )
                                , Message.GetBlobUrl snapshot.imageHash
                                )

                            Nothing ->
                                ( model
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

        Message.CommonCommand Message.SelectFirstChild ->
            case model of
                Loaded (LoadedModel loadedModelRecord) ->
                    ( Loaded (LoadedModel { loadedModelRecord | select = NewTypePartName })
                    , Message.FocusElement inputId
                    )

                _ ->
                    ( model
                    , Message.None
                    )

        Message.CommonCommand Message.SelectParent ->
            case model of
                Loaded (LoadedModel loadedModelRecord) ->
                    ( Loaded (LoadedModel { loadedModelRecord | select = TypePart })
                    , Message.None
                    )

                _ ->
                    ( model
                    , Message.None
                    )

        _ ->
            ( model
            , Message.None
            )


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case message of
        RequestLogInUrl provider ->
            ( model
            , Message.RequestLogInUrl provider
            )

        _ ->
            ( model
            , Message.None
            )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    Ui.row
        Ui.stretch
        Ui.stretch
        []
        [ CommonUi.sidebarView subModel
            (case model of
                Loaded (LoadedModel loadedModel) ->
                    case loadedModel.project of
                        Just projectSnapshot ->
                            CommonUi.ProjectSuggestion
                                { snapshot = projectSnapshot
                                , id = loadedModel.snapshot.projectId
                                }
                                loadedModel.snapshot.ideaId

                        Nothing ->
                            CommonUi.None

                _ ->
                    CommonUi.None
            )
            |> Ui.map RequestLogInUrl
        , Ui.column
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
        , inputPanel record.select
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


inputPanelHeight : Int
inputPanelHeight =
    300


inputPanel : Select -> Ui.Panel Message
inputPanel select =
    case select of
        TypePart ->
            Ui.column
                Ui.stretch
                (Ui.fix inputPanelHeight)
                []
                [ CommonUi.normalText 16 "Eで新しい型パーツの名前入力"
                ]

        NewTypePartName ->
            Ui.row
                Ui.stretch
                (Ui.fix inputPanelHeight)
                []
                [ candidatesView ]


candidatesView : Ui.Panel Message
candidatesView =
    Ui.column
        (Ui.fix 400)
        Ui.stretch
        []
        [ Ui.textInput
            Ui.stretch
            Ui.auto
            [ Ui.id inputId ]
            (Ui.TextInputAttributes
                { inputMessage = InputNewTypePartName
                , name = "new-type"
                , multiLine = False
                , fontSize = 24
                }
            )
        ]


inputId : String
inputId =
    "input"
