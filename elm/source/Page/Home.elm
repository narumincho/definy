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
import Icon
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
        [ Ui.gap 16 ]
        [ ( Ui.grow, projectList language logInState ) ]


projectList : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectList language logInState =
    Ui.column
        [ Ui.gap 8 ]
        [ ( Ui.fix 200, projectLineFirstCreateButton language logInState )
        , ( Ui.fix 200, projectLine )
        , ( Ui.fix 200, projectLine )
        ]


createProjectButton : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
createProjectButton language logInState =
    case logInState of
        Data.LogInState.RequestLogInUrl _ ->
            Ui.textBox
                []
                (Ui.TextBoxAttributes
                    { text = "......"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.VerifyingAccessToken _ ->
            Ui.textBox
                []
                (Ui.TextBoxAttributes
                    { text =
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
                )

        Data.LogInState.GuestUser ->
            Ui.textBox
                []
                (Ui.TextBoxAttributes
                    { text =
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
                )

        Data.LogInState.Ok { accessToken } ->
            Ui.column
                []
                [ ( Ui.fix 32, Icon.plus )
                , ( Ui.auto
                  , Ui.textBox
                        []
                        (Ui.TextBoxAttributes
                            { text =
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
                        )
                  )
                ]


projectLineFirstCreateButton : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectLineFirstCreateButton language logInState =
    Ui.row
        [ Ui.gap 8 ]
        [ ( Ui.fix 320, createProjectButton language logInState )
        , ( Ui.fix 320, projectItem )
        , ( Ui.fix 320, projectItem )
        ]


projectLine : Ui.Panel message
projectLine =
    Ui.row
        [ Ui.gap 8 ]
        [ ( Ui.fix 320, projectItem )
        , ( Ui.fix 320, projectItem )
        , ( Ui.fix 320, projectItem )
        ]


projectItem : Ui.Panel message
projectItem =
    Ui.depth
        []
        [ Ui.bitmapImage
            []
            (Ui.BitmapImageAttributes
                { url = "https://narumincho.com/assets/definy20190212.jpg"
                , fitStyle = Ui.Cover
                , alternativeText = "プロジェクト画像"
                , rendering = Ui.ImageRenderingPixelated
                }
            )
        , Ui.textBox
            [ Ui.alignSelf Ui.end, Ui.backgroundColor (Css.rgba 0 0 0 0.6) ]
            (Ui.TextBoxAttributes
                { text = "プロジェクト名"
                , typeface = Component.Style.normalTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                , textAlignment = Ui.TextAlignStart
                }
            )
        ]
