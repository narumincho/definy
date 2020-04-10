module Page.CreateProject exposing (Message(..), Model, init, update, view)

import Command
import Component.Style
import Css
import Data
import Data.LogInState
import SubModel
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
    , Command.None
    )


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case ( message, model ) of
        ( InputProjectName string, NoInput ) ->
            ( RequestToValidProjectName string
            , Command.ToValidProjectName string
            )

        ( InputProjectName string, RequestToValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Command.ToValidProjectName string
            )

        ( InputProjectName string, DisplayedValidProjectName _ ) ->
            ( RequestToValidProjectName string
            , Command.ToValidProjectName string
            )

        ( ToValidProjectNameResponse response, RequestToValidProjectName request ) ->
            if request == response.input then
                ( DisplayedValidProjectName response.result
                , Command.None
                )

            else
                ( model
                , Command.None
                )

        ( CreateProject, DisplayedValidProjectName (Just validProjectName) ) ->
            ( CreatingProject validProjectName
            , Command.CreateProject validProjectName
            )

        ( _, _ ) ->
            ( model
            , Command.None
            )


view : SubModel.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case SubModel.getLogInState subModel of
        Data.LogInState.Ok _ ->
            mainView (SubModel.getLanguage subModel) model

        _ ->
            noLogInCannotCreateProjectText (SubModel.getLanguage subModel)


noLogInCannotCreateProjectText : Data.Language -> Ui.Panel message
noLogInCannotCreateProjectText language =
    Component.Style.normalText 24
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
                [ Ui.width Ui.stretch, Ui.height Ui.stretch, Ui.gap 16 ]
                [ createProjectTitle language
                , projectInputBox
                ]

        RequestToValidProjectName _ ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch, Ui.gap 16 ]
                [ createProjectTitle language
                , projectInputBox
                , Component.Style.normalText 24 (checkingThatProjectNameIsValid language)
                ]

        DisplayedValidProjectName (Just validProjectName) ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch, Ui.gap 16 ]
                [ createProjectTitle language
                , projectInputBox
                , createButton language validProjectName
                ]

        DisplayedValidProjectName Nothing ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch, Ui.gap 16 ]
                [ createProjectTitle language
                , projectInputBox
                , Component.Style.normalText 24 (projectNameIsInvalid language)
                ]

        CreatingProject projectName ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ Ui.empty [ Ui.height Ui.stretch ]
                , Component.Style.normalText 24 (creating language projectName)
                , Ui.empty [ Ui.height Ui.stretch ]
                ]


createProjectTitle : Data.Language -> Ui.Panel message
createProjectTitle language =
    Component.Style.normalText 32
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
        [ Ui.width (Ui.fix 400), Ui.height (Ui.fix 40), Ui.padding 8 ]
        (Ui.TextInputAttributes
            { inputMessage = InputProjectName
            , name = "project-name"
            , multiLine = False
            , fontSize = 24
            }
        )


createButton : Data.Language -> String -> Ui.Panel Message
createButton language validProjectName =
    Ui.button
        [ Ui.backgroundColor (Css.rgb 40 40 40)
        , Ui.border
            (Ui.BorderStyle
                { color = Css.rgb 200 200 200
                , width = { top = 1, right = 1, left = 1, bottom = 1 }
                }
            )
        , Ui.padding 8
        ]
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
