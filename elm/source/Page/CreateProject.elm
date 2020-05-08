module Page.CreateProject exposing (Message(..), Model, init, update, view)

import CommonUi
import Data
import Data.LogInState
import Message
import Ui


type Model
    = NoInput
    | RequestToValidProjectName String
    | DisplayedValidProjectName (Maybe String)
    | CreatingProject String


type Message
    = InputProjectName String
    | ToValidProjectNameResponse
        { input : String
        , result : Maybe String
        }
    | CreateProject
    | RequestLogInUrl Data.OpenIdConnectProvider


init : ( Model, Message.Command )
init =
    ( NoInput
    , Message.None
    )


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case ( message, model ) of
        ( RequestLogInUrl provider, _ ) ->
            ( model
            , Message.RequestLogInUrl provider
            )

        ( InputProjectName string, NoInput ) ->
            ( RequestToValidProjectName string
            , Message.ToValidProjectName string
            )

        ( InputProjectName string, RequestToValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Message.ToValidProjectName string
            )

        ( InputProjectName string, DisplayedValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Message.ToValidProjectName string
            )

        ( ToValidProjectNameResponse response, RequestToValidProjectName request ) ->
            ( if request == response.input then
                DisplayedValidProjectName response.result

              else
                model
            , Message.None
            )

        ( CreateProject, DisplayedValidProjectName (Just validProjectName) ) ->
            ( CreatingProject validProjectName
            , Message.CreateProject validProjectName
            )

        ( _, _ ) ->
            ( model
            , Message.None
            )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    Ui.row
        Ui.stretch
        Ui.stretch
        []
        [ CommonUi.sidebarView subModel CommonUi.None
            |> Ui.map RequestLogInUrl
        , case Message.getLogInState subModel of
            Data.LogInState.Ok _ ->
                mainView (Message.getLanguage subModel) model

            _ ->
                noLogInCannotCreateProjectText (Message.getLanguage subModel)
        ]


noLogInCannotCreateProjectText : Data.Language -> Ui.Panel message
noLogInCannotCreateProjectText language =
    CommonUi.normalText 24
        (case language of
            Data.LanguageJapanese ->
                "プロジェクトを作成するにはログインする必要があります"

            Data.LanguageEnglish ->
                "You must be logged in to create a project"

            Data.LanguageEsperanto ->
                "Vi devas esti ensalutinta por krei projekton"
        )


mainView : Data.Language -> Model -> Ui.Panel Message
mainView language model =
    Ui.column
        Ui.stretch
        Ui.auto
        [ Ui.gap 16 ]
        (case model of
            NoInput ->
                [ createProjectTitle language
                , projectInputBox
                ]

            RequestToValidProjectName _ ->
                [ createProjectTitle language
                , projectInputBox
                , CommonUi.normalText 24 (checkingThatProjectNameIsValid language)
                ]

            DisplayedValidProjectName (Just validProjectName) ->
                [ createProjectTitle language
                , projectInputBox
                , createButton language validProjectName
                ]

            DisplayedValidProjectName Nothing ->
                [ createProjectTitle language
                , projectInputBox
                , CommonUi.normalText 24 (projectNameIsInvalid language)
                ]

            CreatingProject projectName ->
                [ Ui.depth
                    Ui.stretch
                    Ui.stretch
                    []
                    [ ( ( Ui.Center, Ui.Center )
                      , CommonUi.normalText 24 (creating language projectName)
                      )
                    ]
                ]
        )


createProjectTitle : Data.Language -> Ui.Panel message
createProjectTitle language =
    CommonUi.normalText 32
        (case language of
            Data.LanguageEnglish ->
                "Enter a name for the new project"

            Data.LanguageJapanese ->
                "新規作成するプロジェクトの名前を入力してください"

            Data.LanguageEsperanto ->
                "Enigu nomon por la nova projekto"
        )


projectNameIsInvalid : Data.Language -> String
projectNameIsInvalid language =
    case language of
        Data.LanguageJapanese ->
            "プロジェクト名が無効です"

        Data.LanguageEnglish ->
            "Project name is invalid"

        Data.LanguageEsperanto ->
            "Projekto nomo estas nevalida"


checkingThatProjectNameIsValid : Data.Language -> String
checkingThatProjectNameIsValid language =
    case language of
        Data.LanguageJapanese ->
            "プロジェクト名が正当なものかチェック中"

        Data.LanguageEnglish ->
            "Checking that project name is valid"

        Data.LanguageEsperanto ->
            "Kontroli tiun projektan nomon validas"


creating : Data.Language -> String -> String
creating language projectName =
    case language of
        Data.LanguageJapanese ->
            projectName ++ "を作成中!"

        Data.LanguageEnglish ->
            "Creating " ++ projectName ++ "!"

        Data.LanguageEsperanto ->
            "Krei " ++ projectName ++ "!"


projectInputBox : Ui.Panel Message
projectInputBox =
    Ui.textInput
        (Ui.fix 400)
        Ui.auto
        [ Ui.padding 8 ]
        (Ui.TextInputAttributes
            { inputMessage = InputProjectName
            , name = "project-name"
            , multiLine = False
            , fontSize = 24
            }
        )


createButton : Data.Language -> String -> Ui.Panel Message
createButton language validProjectName =
    CommonUi.button
        CreateProject
        (case language of
            Data.LanguageEnglish ->
                "Create " ++ validProjectName

            Data.LanguageJapanese ->
                validProjectName ++ "を新規作成!"

            Data.LanguageEsperanto ->
                "Kreu " ++ validProjectName
        )
