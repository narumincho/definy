module Page.CreateIdea exposing (Message(..), Model, getProjectId, init, update, view)

import CommonUi
import Data
import Data.LogInState
import Message
import Ui


type Model
    = Model
        { projectId : Data.ProjectId
        , ideaNameInput : IdeaNameInput
        }


type IdeaNameInput
    = NoInput
    | RequestToValidIdeaName String
    | DisplayedValidIdeaName (Maybe String)
    | CreatingIdea String


type Message
    = InputIdeaName String
    | ToValidIdeaNameResponse
        { input : String
        , result : Maybe String
        }
    | CreateIdea


init : Data.ProjectId -> ( Model, Message.Command )
init projectId =
    ( Model
        { projectId = projectId
        , ideaNameInput = NoInput
        }
    , Message.None
    )


getProjectId : Model -> Data.ProjectId
getProjectId (Model record) =
    record.projectId


update : Message -> Model -> ( Model, Message.Command )
update message (Model record) =
    case ( message, record.ideaNameInput ) of
        ( InputIdeaName string, NoInput ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Message.ToValidIdeaName string
            )

        ( InputIdeaName string, RequestToValidIdeaName _ ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Message.ToValidIdeaName string
            )

        ( InputIdeaName string, DisplayedValidIdeaName _ ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Message.ToValidIdeaName string
            )

        ( ToValidIdeaNameResponse response, RequestToValidIdeaName request ) ->
            ( if request == response.input then
                Model { record | ideaNameInput = DisplayedValidIdeaName response.result }

              else
                Model record
            , Message.None
            )

        ( CreateIdea, DisplayedValidIdeaName (Just validIdeaName) ) ->
            ( Model { record | ideaNameInput = CreatingIdea validIdeaName }
            , Message.CreateIdea
                { projectId = record.projectId
                , ideaName = validIdeaName
                }
            )

        ( _, _ ) ->
            ( Model record
            , Message.None
            )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case Message.getLogInState subModel of
        Data.LogInState.Ok _ ->
            mainView subModel model

        _ ->
            noLogInCannotCreateIdeaView (Message.getLanguage subModel)


noLogInCannotCreateIdeaView : Data.Language -> Ui.Panel message
noLogInCannotCreateIdeaView language =
    CommonUi.normalText 24
        (case language of
            Data.LanguageJapanese ->
                "アイデアを作成するにはログインする必要があります"

            Data.LanguageEnglish ->
                "You must be logged in to create a idea"

            Data.LanguageEsperanto ->
                "Vi devas esti ensalutinta por krei ideon"
        )


mainView : Message.SubModel -> Model -> Ui.Panel Message
mainView subModel (Model record) =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        ([ CommonUi.normalText 16 "アイデア作成. アイデア名を入力してください"
         , Ui.textInput
            Ui.stretch
            Ui.auto
            []
            (Ui.TextInputAttributes
                { inputMessage = InputIdeaName
                , name = "idea-name"
                , multiLine = False
                , fontSize = 24
                }
            )
         , ideaNameInfoView (Message.getLanguage subModel) record.ideaNameInput
         ]
            ++ (case record.ideaNameInput of
                    DisplayedValidIdeaName (Just _) ->
                        [ CommonUi.button CreateIdea "作成する" ]

                    _ ->
                        []
               )
        )


ideaNameInfoView : Data.Language -> IdeaNameInput -> Ui.Panel message
ideaNameInfoView language ideaNameInput =
    case ideaNameInput of
        NoInput ->
            Ui.empty Ui.auto Ui.auto []

        RequestToValidIdeaName string ->
            CommonUi.normalText 16
                (case language of
                    Data.LanguageJapanese ->
                        "アイデア名が正当なものかチェック中"

                    Data.LanguageEnglish ->
                        "Checking that idea name is valid"

                    Data.LanguageEsperanto ->
                        "Kontroli tiun idean nomon validas"
                )

        DisplayedValidIdeaName (Just validIdeaName) ->
            CommonUi.normalText 16 validIdeaName

        DisplayedValidIdeaName Nothing ->
            CommonUi.normalText 16
                (case language of
                    Data.LanguageJapanese ->
                        "アイデア名が無効です"

                    Data.LanguageEnglish ->
                        "Idea name is invalid"

                    Data.LanguageEsperanto ->
                        "Ideo nomo ne validas"
                )

        CreatingIdea ideaName ->
            CommonUi.normalText 16
                (case language of
                    Data.LanguageJapanese ->
                        ideaName ++ "を作成中"

                    Data.LanguageEnglish ->
                        "Creating " ++ ideaName

                    Data.LanguageEsperanto ->
                        "Krei " ++ ideaName
                )
