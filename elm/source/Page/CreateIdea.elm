module Page.CreateIdea exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import CommonUi
import Data
import SubModel
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


init : Data.ProjectId -> ( Model, Command.Command )
init projectId =
    ( Model
        { projectId = projectId
        , ideaNameInput = NoInput
        }
    , Command.None
    )


getProjectId : Model -> Data.ProjectId
getProjectId (Model record) =
    record.projectId


update : Message -> Model -> ( Model, Command.Command )
update message (Model record) =
    case ( message, record.ideaNameInput ) of
        ( InputIdeaName string, NoInput ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Command.ToValidIdeaName string
            )

        ( InputIdeaName string, RequestToValidIdeaName _ ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Command.ToValidIdeaName string
            )

        ( InputIdeaName string, DisplayedValidIdeaName _ ) ->
            ( Model { record | ideaNameInput = RequestToValidIdeaName string }
            , Command.ToValidIdeaName string
            )

        ( ToValidIdeaNameResponse response, RequestToValidIdeaName request ) ->
            ( if request == response.input then
                Model { record | ideaNameInput = DisplayedValidIdeaName response.result }

              else
                Model record
            , Command.None
            )

        ( CreateIdea, DisplayedValidIdeaName (Just validIdeaName) ) ->
            ( Model { record | ideaNameInput = CreatingIdea validIdeaName }
            , Command.CreateIdea
                { projectId = record.projectId
                , ideaName = validIdeaName
                }
            )

        ( _, _ ) ->
            ( Model record
            , Command.None
            )


view : SubModel.SubModel -> Model -> Ui.Panel Message
view subModel (Model record) =
    Ui.column
        []
        [ CommonUi.normalText 16 "アイデア作成. アイデア名を入力してください"
        , Ui.textInput
            []
            (Ui.TextInputAttributes
                { inputMessage = InputIdeaName
                , name = "idea-name"
                , multiLine = False
                , fontSize = 16
                }
            )
        , ideaNameInfoView (SubModel.getLanguage subModel) record.ideaNameInput
        , Ui.button
            []
            CreateIdea
            (CommonUi.normalText 16 "作成する")
        ]


ideaNameInfoView : Data.Language -> IdeaNameInput -> Ui.Panel message
ideaNameInfoView language ideaNameInput =
    case ideaNameInput of
        NoInput ->
            Ui.empty []

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
