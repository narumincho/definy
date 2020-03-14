module Page.Home exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Component.Style
import Data
import Data.LogInState
import Data.SocialLoginService
import Ui
import Url


type Model
    = Model
        { width : Int
        , pointer : PointerState
        , logInRequest : Maybe Data.SocialLoginService.SocialLoginService
        }


type PointerState
    = None
    | SideBarPointerEnter
    | SideBarResize
    | LogInButtonHover Data.SocialLoginService.SocialLoginService
    | LogInButtonPressed Data.SocialLoginService.SocialLoginService


type Msg
    = MsgToSideGutterMode Component.Style.GutterMsg
    | MsgPointerMove Ui.Pointer
    | MsgPointerUp
    | MsgLogInButtonEnter Data.SocialLoginService.SocialLoginService
    | MsgLogInButtonLeave
    | MsgLogInButtonPressed Data.SocialLoginService.SocialLoginService
    | MsgToLogInPage Data.SocialLoginService.SocialLoginService
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
        , pointer = None
        , logInRequest = Nothing
        }


update : Msg -> Model -> ( Model, List Cmd )
update msg (Model rec) =
    case msg of
        MsgToSideGutterMode gutterMsg ->
            case gutterMsg of
                Component.Style.GutterMsgPointerEnter ->
                    ( Model { rec | pointer = SideBarPointerEnter }
                    , []
                    )

                Component.Style.GutterMsgPointerLeave ->
                    ( Model { rec | pointer = None }
                    , []
                    )

                Component.Style.GutterMsgToResizeMode pointer ->
                    ( Model
                        { rec
                            | pointer = SideBarResize
                            , width = pointer |> Ui.pointerGetPosition |> Tuple.first |> floor
                        }
                    , [ CmdToVerticalGutterMode ]
                    )

        MsgPointerMove mouseState ->
            ( Model { rec | width = mouseState |> Ui.pointerGetPosition |> Tuple.first |> floor }
            , []
            )

        MsgPointerUp ->
            ( Model { rec | pointer = None }
            , []
            )

        MsgLogInButtonEnter service ->
            ( Model { rec | pointer = LogInButtonHover service }
            , []
            )

        MsgLogInButtonLeave ->
            ( Model { rec | pointer = None }
            , []
            )

        MsgLogInButtonPressed service ->
            ( Model { rec | pointer = LogInButtonPressed service }
            , []
            )

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
    Ui.row
        (case rec.pointer of
            SideBarResize ->
                [ Ui.onPointerMove MsgPointerMove ]

            _ ->
                []
        )
        0
        [ projectList language logInState
        ]


projectList : Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectList language logInState =
    Ui.column
        []
        8
        [ Ui.textBoxFitHeight
            []
            { align = Ui.TextAlignStart
            , font = Component.Style.normalFont
            }
            (case language of
                Data.English ->
                    "home"

                Data.Japanese ->
                    "ここはHome"

                Data.Esperanto ->
                    "Hejmo"
            )
        , case logInState of
            Data.LogInState.ReadingAccessToken ->
                Ui.textBoxFitHeight
                    []
                    { align = Ui.TextAlignStart
                    , font = Component.Style.normalFont
                    }
                    "…"

            Data.LogInState.VerifyingAccessToken _ ->
                Ui.textBoxFitHeight
                    []
                    { align = Ui.TextAlignStart
                    , font = Component.Style.normalFont
                    }
                    "…"

            Data.LogInState.GuestUser ->
                Ui.textBoxFitHeight
                    []
                    { align = Ui.TextAlignStart
                    , font = Component.Style.normalFont
                    }
                    "プロジェクトを作成するには登録が必要です"

            Data.LogInState.Ok { accessToken } ->
                Ui.textBoxFitHeight
                    []
                    { align = Ui.TextAlignStart
                    , font = Component.Style.normalFont
                    }
                    "プロジェクトを新規作成"
        , Ui.textBoxFitHeight
            []
            { align = Ui.TextAlignStart
            , font = Component.Style.normalFont
            }
            (case language of
                Data.English ->
                    "List of projects"

                Data.Japanese ->
                    "プロジェクト一覧"

                Data.Esperanto ->
                    "Listo de projektoj"
            )
        ]
