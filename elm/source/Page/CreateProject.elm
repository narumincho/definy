module Page.CreateProject exposing (Message(..), Model, init, update, view)

import Command
import Component.Style
import Css
import Data
import Data.LogInState
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


init : ( Model, Command.Command )
init =
    ( NoInput
    , Command.none
    )


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case ( message, model ) of
        ( InputProjectName string, NoInput ) ->
            ( RequestToValidProjectName string
            , Command.toValidProjectName string
            )

        ( InputProjectName string, RequestToValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Command.toValidProjectName string
            )

        ( InputProjectName string, DisplayedValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Command.toValidProjectName string
            )

        ( ToValidProjectNameResponse response, RequestToValidProjectName request ) ->
            if request == response.input then
                ( DisplayedValidProjectName response.result
                , Command.none
                )

            else
                ( model
                , Command.none
                )

        ( CreateProject, DisplayedValidProjectName (Just validProjectName) ) ->
            ( CreatingProject validProjectName
            , Command.createProject validProjectName
            )

        ( _, _ ) ->
            ( model
            , Command.none
            )


view : Data.Language -> Data.LogInState.LogInState -> Model -> Ui.Panel Message
view language logInState model =
    case logInState of
        Data.LogInState.Ok _ ->
            mainView language model

        _ ->
            noLogInCannotCreateProjectText language


noLogInCannotCreateProjectText : Data.Language -> Ui.Panel message
noLogInCannotCreateProjectText language =
    Component.Style.normalText
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
    case model of
        NoInput ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ createProjectTitle language
                , projectInputBox
                ]

        RequestToValidProjectName string ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ createProjectTitle language
                , projectInputBox
                , Component.Style.normalText (checkingThatProjectNameIsValid language)
                ]

        DisplayedValidProjectName (Just validProjectName) ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ createProjectTitle language
                , projectInputBox
                , createButton language validProjectName
                ]

        DisplayedValidProjectName Nothing ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ createProjectTitle language
                , projectInputBox
                , Component.Style.normalText (projectNameIsInvalid language)
                ]

        CreatingProject projectName ->
            Ui.row
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ Component.Style.normalText (creating language projectName)
                ]


createProjectTitle : Data.Language -> Ui.Panel message
createProjectTitle language =
    Component.Style.normalText
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
        [ Ui.width (Ui.fix 400), Ui.height (Ui.fix 16) ]
        (Ui.TextInputAttributes
            { inputMessage = InputProjectName
            , name = "project-name"
            , multiLine = False
            }
        )


createButton : Data.Language -> String -> Ui.Panel Message
createButton language validProjectName =
    Ui.button
        []
        CreateProject
        (Ui.text
            [ Ui.width Ui.auto, Ui.height Ui.auto ]
            (Ui.TextAttributes
                { text =
                    case language of
                        Data.LanguageEnglish ->
                            "Create " ++ validProjectName

                        Data.LanguageJapanese ->
                            validProjectName ++ "を新規作成!"

                        Data.LanguageEsperanto ->
                            "Kreu " ++ validProjectName
                , typeface = Component.Style.normalTypeface
                , size = 26
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                , textAlignment = Ui.TextAlignStart
                }
            )
        )
