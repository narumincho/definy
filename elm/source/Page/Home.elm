module Page.Home exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Component.Style
import Css
import Data
import Data.LogInState
import Data.SocialLoginService
import Ui
import Url


type Model
    = Model
        { width : Int
        , logInRequest : Maybe Data.SocialLoginService.SocialLoginService
        }


type Msg
    = MsgToLogInPage Data.SocialLoginService.SocialLoginService
    | MsgGetLogInUrlResponse (Result String Url.Url)
    | MsgCreateProject Data.AccessToken
    | MsgCreateProjectByGuest


type Cmd
    = CmdToVerticalGutterMode
    | CmdConsoleLog String
    | CmdToLogInPage Data.SocialLoginService.SocialLoginService
    | CmdJumpPage Url.Url
    | CmdCreateProject Data.AccessToken
    | CmdCreateProjectByGuest


init : Model
init =
    Model
        { width = 400
        , logInRequest = Nothing
        }


update : Msg -> Model -> ( Model, List Cmd )
update msg (Model rec) =
    case msg of
        MsgToLogInPage service ->
            ( Model { rec | logInRequest = Just service }
            , [ CmdToLogInPage service ]
            )

        MsgGetLogInUrlResponse result ->
            case result of
                Ok url ->
                    ( Model rec
                    , [ CmdJumpPage url ]
                    )

                Err errorMessage ->
                    ( Model rec
                    , [ CmdConsoleLog errorMessage ]
                    )

        MsgCreateProject accessToken ->
            ( Model rec
            , [ CmdCreateProject accessToken ]
            )

        MsgCreateProjectByGuest ->
            ( Model rec
            , [ CmdCreateProjectByGuest ]
            )


view : Data.Language -> Data.LogInState.LogInState -> Model -> Ui.Panel Msg
view language logInState (Model rec) =
    Ui.column
        (Ui.ColumnListAttributes
            { styleAndEvent = []
            , gap = 16
            , children =
                [ ( Ui.grow, projectList language logInState ) ]
            }
        )


projectList : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectList language logInState =
    { styleAndEvent = []
    , gap = 8
    , children =
        [ ( Ui.auto
          , { styleAndEvent = []
            , text =
                case language of
                    Data.LanguageEnglish ->
                        "home"

                    Data.LanguageJapanese ->
                        "ここはHome"

                    Data.LanguageEsperanto ->
                        "Hejmo"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox
          )
        , ( Ui.fix 48, createProjectButton language logInState )
        , ( Ui.grow
          , { styleAndEvent = []
            , text =
                case language of
                    Data.LanguageEnglish ->
                        "List of projects"

                    Data.LanguageJapanese ->
                        "プロジェクト一覧"

                    Data.LanguageEsperanto ->
                        "Listo de projektoj"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox
          )
        ]
    }
        |> Ui.ColumnListAttributes
        |> Ui.column


createProjectButton : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
createProjectButton language logInState =
    case logInState of
        Data.LogInState.RequestLogInUrl _ ->
            { styleAndEvent = []
            , text = "......"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox

        Data.LogInState.VerifyingAccessToken _ ->
            { styleAndEvent = []
            , text =
                case language of
                    Data.LanguageEnglish ->
                        "Verifying..."

                    Data.LanguageJapanese ->
                        "認証中…"

                    Data.LanguageEsperanto ->
                        "Aŭtentigado ..."
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox

        Data.LogInState.GuestUser ->
            { styleAndEvent = []
            , text =
                case language of
                    Data.LanguageEnglish ->
                        "Creating guest user projects has not been completed yet"

                    Data.LanguageJapanese ->
                        "ゲストユーザーのプロジェクトの作成は,まだできていない"

                    Data.LanguageEsperanto ->
                        "Krei projektojn de invititaj uzantoj ankoraŭ ne estas finita"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox

        Data.LogInState.Ok { accessToken } ->
            { styleAndEvent = []
            , text =
                case language of
                    Data.LanguageEnglish ->
                        "Create a new project"

                    Data.LanguageJapanese ->
                        "プロジェクトを新規作成"

                    Data.LanguageEsperanto ->
                        "Krei novan projekton"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
                |> Ui.TextBoxAttributes
                |> Ui.textBox
