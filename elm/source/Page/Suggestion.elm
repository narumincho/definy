module Page.Suggestion exposing (Message, Model, getBrowserUiState, getSuggestionId, init, update, updateByCommonMessage, view)

import Array
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
        , inputText : String
        }


type Select
    = TypePartArea
    | TypePart Int
    | TypePartName Int
    | PartArea


type Message
    = InputFromInputPanel String
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
                TypePartArea ->
                    Message.NotFocus

                TypePart _ ->
                    Message.NotFocus

                TypePartName _ ->
                    Message.FocusInput

                PartArea ->
                    Message.NotFocus

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
                                , select = TypePartArea
                                , typeNameList = []
                                , inputText = ""
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
            changeSelect (selectUp record.typeNameList record.select) (LoadedModel record)

        ( Message.CommonCommand Message.SelectDown, Loaded (LoadedModel record) ) ->
            changeSelect (selectDown record.typeNameList record.select) (LoadedModel record)

        ( Message.CommonCommand Message.SelectFirstChild, Loaded (LoadedModel record) ) ->
            changeSelect (selectFirstChild record.typeNameList record.select) (LoadedModel record)

        ( Message.CommonCommand Message.SelectParent, Loaded (LoadedModel record) ) ->
            changeSelect (selectParent record.select) (LoadedModel record)

        ( Message.CommonCommand Message.NewElement, Loaded loadedModel ) ->
            newElement loadedModel |> Tuple.mapFirst Loaded

        _ ->
            ( model
            , Message.None
            )


changeSelect : Select -> LoadedModel -> ( Model, Message.Command )
changeSelect newSelect (LoadedModel record) =
    let
        {- TODO 型の変更を検知 -}
        isChangeTypePartName =
            False
    in
    ( Loaded
        (LoadedModel
            { record
                | select = newSelect
                , typeNameList =
                    if isChangeTypePartName then
                        record.typeNameList ++ [ record.inputText ]

                    else
                        record.typeNameList
                , inputText =
                    if isChangeTypePartName then
                        ""

                    else
                        record.inputText
            }
        )
    , Message.FocusElement (selectToFocusId newSelect)
    )


selectUp : List String -> Select -> Select
selectUp typeNameList select =
    case select of
        TypePartArea ->
            PartArea

        TypePart int ->
            if int == 0 then
                TypePartArea

            else
                TypePart (int - 1)

        PartArea ->
            TypePartArea

        _ ->
            selectParent select


selectDown : List String -> Select -> Select
selectDown typeNameList select =
    case select of
        TypePartArea ->
            PartArea

        TypePart int ->
            if List.length typeNameList - 1 <= int then
                selectParent select

            else
                TypePart (int + 1)

        PartArea ->
            TypePartArea

        _ ->
            selectParent select


selectFirstChild : List String -> Select -> Select
selectFirstChild typeNameList select =
    case select of
        TypePartArea ->
            if List.length typeNameList == 0 then
                TypePartArea

            else
                TypePart 0

        TypePart int ->
            TypePartName int

        TypePartName int ->
            TypePartName int

        PartArea ->
            PartArea


selectParent : Select -> Select
selectParent select =
    case select of
        TypePartArea ->
            TypePartArea

        TypePart int ->
            TypePartArea

        TypePartName int ->
            TypePart int

        PartArea ->
            PartArea


newElement : LoadedModel -> ( LoadedModel, Message.Command )
newElement (LoadedModel record) =
    case record.select of
        TypePartArea ->
            let
                select =
                    TypePartName (List.length record.typeNameList)
            in
            ( LoadedModel
                { record
                    | select = select
                    , typeNameList = record.typeNameList ++ [ "" ]
                }
            , Message.FocusElement (selectToFocusId select)
            )

        TypePart index ->
            let
                select =
                    TypePartName (index + 1)

                typeNameArray =
                    Array.fromList record.typeNameList
            in
            ( LoadedModel
                { record
                    | select = select
                    , typeNameList =
                        List.concat
                            [ Array.toList (Array.slice 0 (index + 1) typeNameArray)
                            , [ "new" ++ String.fromInt index ]
                            , Array.toList
                                (Array.slice
                                    (index + 1)
                                    (Array.length typeNameArray)
                                    typeNameArray
                                )
                            ]
                }
            , Message.FocusElement (selectToFocusId select)
            )

        _ ->
            ( LoadedModel record
            , Message.None
            )


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case message of
        RequestLogInUrl provider ->
            ( model
            , Message.RequestLogInUrl provider
            )

        InputFromInputPanel newTypeName ->
            case model of
                Loaded (LoadedModel record) ->
                    ( Loaded (LoadedModel { record | inputText = newTypeName })
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
                , typePartAreaView subModel record.typeNameList record.inputText record.select
                , partAreaView subModel record.select
                ]
            )
        , inputPanel record.select
        ]


typePartAreaView : Message.SubModel -> List String -> String -> Select -> Ui.Panel Message
typePartAreaView subModel typeNameList newTypeName select =
    Ui.column
        Ui.stretch
        Ui.auto
        [ Ui.focusAble (selectToFocusId TypePartArea)
        , Ui.padding 7
        , elementBorderStyle (select == TypePartArea)
        ]
        [ CommonUi.stretchText 24
            (case Message.getLanguage subModel of
                Data.LanguageEnglish ->
                    "TypePart"

                Data.LanguageJapanese ->
                    "型パーツ"

                Data.LanguageEsperanto ->
                    "Tajpu Parto"
            )
        , typePartListView typeNameList select
        ]


typePartListView : List String -> Select -> Ui.Panel Message
typePartListView typeNameList select =
    Ui.column
        Ui.stretch
        Ui.auto
        [ Ui.gap 4 ]
        (List.indexedMap (typePartView select) typeNameList)


typePartView : Select -> Int -> String -> Ui.Panel message
typePartView select index typeName =
    Ui.column
        Ui.stretch
        (Ui.fix 40)
        [ Ui.focusAble (selectToFocusId (TypePart index))
        , elementBackgroundStyle
        , Ui.padding 4
        , elementBorderStyle
            (case select of
                TypePart int ->
                    int == index

                _ ->
                    False
            )
        ]
        [ Ui.column
            Ui.stretch
            (Ui.fix 20)
            [ elementBorderStyle
                (case select of
                    TypePartName int ->
                        int == index

                    _ ->
                        False
                )
            ]
            [ CommonUi.stretchText 16 typeName ]
        ]


partAreaView : Message.SubModel -> Select -> Ui.Panel Message
partAreaView subModel select =
    Ui.column
        Ui.stretch
        Ui.auto
        [ Ui.padding 8
        , Ui.focusAble (selectToFocusId PartArea)
        , elementBorderStyle (select == PartArea)
        ]
        [ CommonUi.stretchText 24
            (case Message.getLanguage subModel of
                Data.LanguageEnglish ->
                    "Part"

                Data.LanguageJapanese ->
                    "パーツ"

                Data.LanguageEsperanto ->
                    "Parto"
            )
        , addPartView
        ]


addPartView : Ui.Panel Message
addPartView =
    Ui.column
        Ui.stretch
        Ui.auto
        [ elementBackgroundStyle
        , Ui.padding 4
        ]
        [ Ui.row
            Ui.stretch
            Ui.auto
            []
            [ Ui.empty
                (Ui.fix 256)
                (Ui.fix 32)
                [ partBorderStyle ]
            , CommonUi.normalText 24 ":"
            , Ui.empty
                (Ui.fix 256)
                (Ui.fix 32)
                [ partBorderStyle ]
            ]
        , Ui.row
            Ui.stretch
            Ui.auto
            []
            [ CommonUi.normalText 24 "="
            , Ui.empty
                (Ui.fix 512)
                (Ui.fix 32)
                [ partBorderStyle ]
            ]
        ]


partBorderStyle : Ui.Style
partBorderStyle =
    Ui.border
        (Ui.BorderStyle
            { color = Css.rgb 137 136 129
            , width =
                { top = 1
                , right = 1
                , left = 1
                , bottom = 1
                }
            }
        )


elementBorderStyle : Bool -> Ui.Style
elementBorderStyle isSelect =
    Ui.border
        (Ui.BorderStyle
            { color =
                if isSelect then
                    Css.rgb 27 227 2

                else
                    Css.rgba 0 0 0 0
            , width =
                { top = 1
                , right = 1
                , left = 1
                , bottom = 1
                }
            }
        )


elementBackgroundStyle : Ui.Style
elementBackgroundStyle =
    Ui.backgroundColor (Css.rgb 56 56 56)


inputPanelHeight : Int
inputPanelHeight =
    300


inputPanel : Select -> Ui.Panel Message
inputPanel select =
    Ui.column
        Ui.stretch
        (Ui.fix inputPanelHeight)
        [ Ui.border
            (Ui.BorderStyle
                { color = Css.rgb 200 200 200
                , width =
                    { top = 1
                    , right = 0
                    , left = 0
                    , bottom = 0
                    }
                }
            )
        ]
        (case select of
            TypePartArea ->
                [ CommonUi.stretchText 16 "型パーツ全体を選択している" ]

            TypePart int ->
                [ CommonUi.stretchText 16 ("Eで" ++ String.fromInt int ++ "番目の型パーツの名前を変更") ]

            TypePartName int ->
                [ candidatesView ]

            PartArea ->
                [ CommonUi.stretchText 16 "パーツ全体を選択している" ]
        )


candidatesView : Ui.Panel Message
candidatesView =
    Ui.column
        (Ui.fix 400)
        Ui.stretch
        []
        [ Ui.textInput
            Ui.stretch
            Ui.auto
            []
            (Ui.TextInputAttributes
                { inputMessage = InputFromInputPanel
                , name = "new-type-name"
                , id = inputId
                , multiLine = False
                , fontSize = 24
                }
            )
        , CommonUi.normalText 16 "候補をここに表示する"
        ]


inputId : String
inputId =
    "input"


selectToFocusId : Select -> String
selectToFocusId select =
    case select of
        TypePartArea ->
            "type-part-area"

        TypePart int ->
            "type-part-" ++ String.fromInt int

        TypePartName int ->
            inputId

        PartArea ->
            "part-area"
