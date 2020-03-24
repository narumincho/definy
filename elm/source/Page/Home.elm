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
        [ projectList language logInState ]


projectList : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectList language logInState =
    Ui.column
        [ Ui.height Ui.stretch
        , Ui.gap 8
        , Ui.width Ui.auto
        , Ui.padding 8
        ]
        [ projectLineFirstCreateButton language logInState
        , projectLine
        , projectLine
        ]


createProjectButton : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
createProjectButton language logInState =
    case logInState of
        Data.LogInState.RequestLogInUrl _ ->
            Ui.textBox
                [ Ui.width (Ui.fix 320) ]
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
                [ Ui.width (Ui.fix 320) ]
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
                [ Ui.width (Ui.fix 320) ]
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
            Ui.depth
                [ Ui.width (Ui.fix 320)
                , Ui.height Ui.stretch
                , Ui.border
                    (Ui.BorderStyle
                        { color = Css.rgb 200 200 200
                        , width =
                            { top = 1
                            , right = 1
                            , left = 1
                            , bottom = 1
                            }
                        }
                    )
                ]
                [ ( ( Ui.Center, Ui.Center )
                  , Ui.column
                        []
                        [ Icon.plus
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
                        ]
                  )
                ]


projectLineFirstCreateButton : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectLineFirstCreateButton language logInState =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        [ createProjectButton language logInState
        , projectItem
        , projectItem
        ]


projectLine : Ui.Panel message
projectLine =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        [ projectItem
        , projectItem
        , projectItem
        ]


projectItem : Ui.Panel message
projectItem =
    Ui.depth
        [ Ui.width (Ui.fix 320), Ui.height Ui.stretch ]
        [ ( ( Ui.Center, Ui.Center )
          , Ui.bitmapImage
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                (Ui.BitmapImageAttributes
                    { url = "https://narumincho.com/assets/definy20190212.jpg"
                    , fitStyle = Ui.Cover
                    , alternativeText = "プロジェクト画像"
                    , rendering = Ui.ImageRenderingPixelated
                    }
                )
          )
        , ( ( Ui.Center, Ui.End )
          , Ui.textBox
                [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
                (Ui.TextBoxAttributes
                    { text = "プロジェクト名"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )
          )
        ]
