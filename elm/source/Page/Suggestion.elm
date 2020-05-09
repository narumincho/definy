module Page.Suggestion exposing (Message, Model, getBrowserUiState, getSuggestionId, init, update, updateByCommonMessage, view)

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
        , typeNameList : List String
        , newTypeName : String
        }


type Select
    = TypePart Int
    | TypePartName Int
    | NewTypePart
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


getBrowserUiState : Model -> Message.BrowserUiState
getBrowserUiState model =
    case model of
        Loaded (LoadedModel { select }) ->
            case select of
                TypePart _ ->
                    Message.NotFocus

                TypePartName _ ->
                    Message.FocusInput

                NewTypePart ->
                    Message.NotFocus

                NewTypePartName ->
                    Message.FocusInput

        _ ->
            Message.NotFocus


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage commonMessage model =
    case ( commonMessage, model ) of
        ( Message.ResponseSuggestion suggestionResponse, _ ) ->
            if suggestionResponse.id == getSuggestionId model then
                case suggestionResponse.snapshotMaybe of
                    Just suggestionSnapshot ->
                        ( Loaded
                            (LoadedModel
                                { id = suggestionResponse.id
                                , snapshot = suggestionSnapshot
                                , project = Nothing
                                , select = NewTypePart
                                , typeNameList = []
                                , newTypeName = ""
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

        ( Message.ResponseProject projectSnapshot, _ ) ->
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

        ( Message.CommonCommand Message.SelectUp, Loaded (LoadedModel record) ) ->
            ( Loaded
                (LoadedModel
                    { record | select = selectUp record.typeNameList record.select }
                )
            , Message.FocusElement inputId
            )

        ( Message.CommonCommand Message.SelectDown, Loaded (LoadedModel record) ) ->
            ( Loaded
                (LoadedModel
                    { record | select = selectDown record.typeNameList record.select }
                )
            , Message.FocusElement inputId
            )

        ( Message.CommonCommand Message.SelectFirstChild, Loaded (LoadedModel record) ) ->
            ( Loaded
                (LoadedModel
                    { record
                        | select = selectFirstChild record.select
                    }
                )
            , Message.FocusElement inputId
            )

        ( Message.CommonCommand Message.SelectParent, Loaded (LoadedModel record) ) ->
            let
                newSelect =
                    selectParent record.select

                isCreateTypePart =
                    record.newTypeName /= "" && record.select /= newSelect
            in
            ( Loaded
                (LoadedModel
                    { record
                        | select =
                            newSelect
                        , typeNameList =
                            if isCreateTypePart then
                                record.typeNameList ++ [ record.newTypeName ]

                            else
                                record.typeNameList
                        , newTypeName =
                            if isCreateTypePart then
                                ""

                            else
                                record.newTypeName
                    }
                )
            , Message.None
            )

        _ ->
            ( model
            , Message.None
            )


selectUp : List String -> Select -> Select
selectUp typeNameList select =
    case select of
        TypePart int ->
            TypePart (max 0 (int - 1))

        NewTypePart ->
            if List.length typeNameList == 0 then
                NewTypePart

            else
                TypePart (List.length typeNameList - 1)

        _ ->
            selectParent select


selectDown : List String -> Select -> Select
selectDown typeNameList select =
    case select of
        TypePart int ->
            if List.length typeNameList - 1 <= int then
                NewTypePart

            else
                TypePart (int + 1)

        NewTypePart ->
            NewTypePart

        _ ->
            selectParent select


selectFirstChild : Select -> Select
selectFirstChild select =
    case select of
        TypePart int ->
            TypePartName int

        TypePartName int ->
            TypePartName int

        NewTypePart ->
            NewTypePartName

        NewTypePartName ->
            NewTypePartName


selectParent : Select -> Select
selectParent select =
    case select of
        TypePart int ->
            TypePart int

        TypePartName int ->
            TypePart int

        NewTypePart ->
            NewTypePart

        NewTypePartName ->
            NewTypePart


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case message of
        RequestLogInUrl provider ->
            ( model
            , Message.RequestLogInUrl provider
            )

        InputNewTypePartName newTypeName ->
            case model of
                Loaded (LoadedModel record) ->
                    ( Loaded (LoadedModel { record | newTypeName = newTypeName })
                    , Message.None
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
                , typePartAreaView record.typeNameList record.newTypeName record.select
                , addPartView
                ]
            )
        , inputPanel record.select
        ]


typePartAreaView : List String -> String -> Select -> Ui.Panel Message
typePartAreaView typeNameList newTypeName select =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        [ typePartListView typeNameList select
        , addTypePartView newTypeName
        ]


typePartListView : List String -> Select -> Ui.Panel Message
typePartListView typeNameList select =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        (List.indexedMap (typePartView select) typeNameList)


typePartView : Select -> Int -> String -> Ui.Panel message
typePartView select index typeName =
    Ui.column
        Ui.stretch
        (Ui.fix 40)
        (case select of
            TypePart int ->
                if int == index then
                    [ borderStyle ]

                else
                    []

            _ ->
                []
        )
        [ Ui.column
            (Ui.fix 300)
            (Ui.fix 40)
            (case select of
                TypePartName int ->
                    if int == index then
                        [ borderStyle ]

                    else
                        []

                _ ->
                    []
            )
            [ CommonUi.normalText 16 typeName ]
        ]


addTypePartView : String -> Ui.Panel message
addTypePartView newTypeName =
    Ui.column
        Ui.stretch
        (Ui.fix 20)
        [ Ui.border
            (Ui.BorderStyle
                { color = Css.rgb 212 119 57
                , width =
                    { top = 1
                    , right = 1
                    , left = 1
                    , bottom = 1
                    }
                }
            )
        ]
        [ CommonUi.normalText 16 newTypeName ]


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
        TypePart int ->
            Ui.column
                Ui.stretch
                (Ui.fix inputPanelHeight)
                []
                [ CommonUi.normalText 16 ("Eで" ++ String.fromInt int ++ "番目の型パーツの名前を変更") ]

        TypePartName int ->
            Ui.column
                Ui.stretch
                (Ui.fix inputPanelHeight)
                []
                [ candidatesView ]

        NewTypePart ->
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
        , CommonUi.normalText 16 "候補をここに表示する"
        ]


inputId : String
inputId =
    "input"
