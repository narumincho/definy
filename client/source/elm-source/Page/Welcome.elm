module Page.Welcome exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Color
import Component.Style
import Css
import Data.SocialLoginService
import Data.User
import Ui
import Url
import VectorImage


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
    | MsgCreateProject Data.User.AccessToken
    | MsgCreateProjectByGuest


type Cmd
    = CmdToVerticalGutterMode
    | CmdConsoleLog String
    | CmdToLogInPage Data.SocialLoginService.SocialLoginService
    | CmdJumpPage Url.Url
    | CmdCreateProject Data.User.AccessToken
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


view : Data.User.LogInState -> Model -> Ui.Panel Msg
view logInState (Model rec) =
    Ui.row
        (case rec.pointer of
            SideBarResize ->
                [ Ui.PointerMove MsgPointerMove ]

            _ ->
                []
        )
        []
        0
        [ side
            { width = rec.width
            , logInState = logInState
            , pointer = rec.pointer
            , logInRequest = rec.logInRequest
            }
        , Component.Style.gutterPanel
            (case rec.pointer of
                SideBarPointerEnter ->
                    Component.Style.GutterModePointerEnter

                SideBarResize ->
                    Component.Style.GutterModeResize

                _ ->
                    Component.Style.GutterModeNone
            )
            |> Ui.map MsgToSideGutterMode
        , yggdrasil logInState
        ]


side :
    { width : Int
    , logInState : Data.User.LogInState
    , pointer : PointerState
    , logInRequest : Maybe Data.SocialLoginService.SocialLoginService
    }
    -> Ui.Panel Msg
side { width, logInState, pointer, logInRequest } =
    Ui.column
        []
        [ Ui.Width (Ui.Fix width) ]
        16
        [ titleLogo
        , userView pointer logInState logInRequest
        ]


titleLogo : Ui.Panel msg
titleLogo =
    Ui.text
        []
        [ Ui.TextAlignment Ui.TextAlignCenter ]
        (Ui.Font
            { typeface = "Open Sans"
            , size = 48
            , letterSpacing = 0
            , color = Css.rgb 185 208 155
            }
        )
        "Definy"


userView :
    PointerState
    -> Data.User.LogInState
    -> Maybe Data.SocialLoginService.SocialLoginService
    -> Ui.Panel Msg
userView pointerState logInState logInRequest =
    Ui.column
        []
        [ Ui.Padding 8 ]
        8
        (case logInState of
            Data.User.ReadingAccessToken ->
                [ Ui.text
                    []
                    []
                    Component.Style.normalFont
                    "アクセストークンを読み込み中"
                ]

            Data.User.VerifyingAccessToken (Data.User.AccessToken accessTokenString) ->
                [ Ui.text
                    []
                    []
                    Component.Style.normalFont
                    ("アクセストークンを検証、ユーザー情報をリクエスト中 "
                        ++ accessTokenString
                    )
                ]

            Data.User.GuestUser errorMaybe ->
                [ Ui.text
                    []
                    []
                    Component.Style.normalFont
                    (case errorMaybe of
                        Just Data.User.FailToReadIndexedDB ->
                            "IndexedDBからデータを読み込めませんでした"

                        Just Data.User.AccessTokenIsInvalid ->
                            "アクセストークンが無効でした"

                        Nothing ->
                            "ゲストユーザー"
                    )
                ]
                    ++ guestUserView pointerState logInRequest

            Data.User.Ok { user, accessToken } ->
                [ Ui.row
                    []
                    []
                    8
                    [ Ui.imageFromUrl
                        []
                        [ Ui.Width (Ui.Fix 32), Ui.Height (Ui.Fix 32) ]
                        { fitStyle = Ui.Contain
                        , alternativeText = Data.User.getName user ++ "のプロフィール画像"
                        , rendering = Ui.ImageRenderingAuto
                        }
                        (Data.User.getImageUrl user)
                    , Ui.text
                        []
                        []
                        Component.Style.normalFont
                        (Data.User.getName user)
                    ]
                ]
        )


guestUserView : PointerState -> Maybe Data.SocialLoginService.SocialLoginService -> List (Ui.Panel Msg)
guestUserView pointerState logInRequest =
    case logInRequest of
        Just service ->
            [ Ui.text
                []
                []
                Component.Style.normalFont
                (Data.SocialLoginService.serviceName service ++ "のURLを発行中")
            ]

        Nothing ->
            [ Ui.column
                []
                []
                8
                [ googleLogInButton
                    (case pointerState of
                        LogInButtonHover Data.SocialLoginService.Google ->
                            LogInButtonModelHover

                        LogInButtonPressed Data.SocialLoginService.Google ->
                            LogInButtonModelPressed

                        _ ->
                            LogInButtonModelNone
                    )
                , gitHubLogInButton
                    (case pointerState of
                        LogInButtonHover Data.SocialLoginService.GitHub ->
                            LogInButtonModelHover

                        LogInButtonPressed Data.SocialLoginService.GitHub ->
                            LogInButtonModelPressed

                        _ ->
                            LogInButtonModelNone
                    )
                , lineLogInButton
                    (case pointerState of
                        LogInButtonHover Data.SocialLoginService.Line ->
                            LogInButtonModelHover

                        LogInButtonPressed Data.SocialLoginService.Line ->
                            LogInButtonModelPressed

                        _ ->
                            LogInButtonModelNone
                    )
                ]
            ]


type LogInButtonModel
    = LogInButtonModelNone
    | LogInButtonModelHover
    | LogInButtonModelPressed


lineLogInButton : LogInButtonModel -> Ui.Panel Msg
lineLogInButton logInButtonModel =
    Ui.depth
        [ Ui.Click (MsgToLogInPage Data.SocialLoginService.Line)
        , Ui.PointerEnter (always (MsgLogInButtonEnter Data.SocialLoginService.Line))
        , Ui.PointerLeave (always (MsgLogInButtonEnter Data.SocialLoginService.Line))
        , Ui.PointerDown (always (MsgLogInButtonPressed Data.SocialLoginService.Line))
        ]
        [ Ui.Height (Ui.Fix 48), Ui.BorderRadius 8 ]
        [ Ui.monochromatic []
            []
            (case logInButtonModel of
                LogInButtonModelNone ->
                    Css.rgb 0 195 0

                LogInButtonModelHover ->
                    Css.rgb 0 224 0

                LogInButtonModelPressed ->
                    Css.rgb 0 179 0
            )
        , Ui.row
            []
            []
            0
            [ lineIcon logInButtonModel
            , Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY
                , Ui.TextAlignment Ui.TextAlignCenter
                ]
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    }
                )
                "LINEでログイン"
            ]
        ]


gitHubLogInButton : LogInButtonModel -> Ui.Panel Msg
gitHubLogInButton logInButtonModel =
    Ui.depth
        [ Ui.Click (MsgToLogInPage Data.SocialLoginService.GitHub)
        , Ui.PointerEnter (always (MsgLogInButtonEnter Data.SocialLoginService.GitHub))
        , Ui.PointerLeave (always (MsgLogInButtonEnter Data.SocialLoginService.GitHub))
        , Ui.PointerDown (always (MsgLogInButtonPressed Data.SocialLoginService.GitHub))
        ]
        [ Ui.Height (Ui.Fix 48), Ui.BorderRadius 8 ]
        [ Ui.monochromatic []
            []
            (case logInButtonModel of
                LogInButtonModelNone ->
                    Css.rgb 221 221 221

                LogInButtonModelHover ->
                    Css.rgb 238 238 238

                LogInButtonModelPressed ->
                    Css.rgb 204 204 204
            )
        , Ui.row
            []
            []
            0
            [ gitHubIcon
            , Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY
                , Ui.TextAlignment Ui.TextAlignCenter
                ]
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 17 17 17
                    }
                )
                "GitHubでログイン"
            ]
        ]


googleLogInButton : LogInButtonModel -> Ui.Panel Msg
googleLogInButton logInButtonModel =
    Ui.depth
        [ Ui.Click (MsgToLogInPage Data.SocialLoginService.Google)
        , Ui.PointerEnter (always (MsgLogInButtonEnter Data.SocialLoginService.Google))
        , Ui.PointerLeave (always (MsgLogInButtonEnter Data.SocialLoginService.Google))
        , Ui.PointerDown (always (MsgLogInButtonPressed Data.SocialLoginService.Google))
        ]
        [ Ui.Height (Ui.Fix 48), Ui.BorderRadius 8 ]
        [ Ui.monochromatic []
            []
            (case logInButtonModel of
                LogInButtonModelNone ->
                    Css.rgb 221 221 221

                LogInButtonModelHover ->
                    Css.rgb 238 238 238

                LogInButtonModelPressed ->
                    Css.rgb 204 204 204
            )
        , Ui.row
            []
            []
            0
            [ googleIcon
            , Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY
                , Ui.TextAlignment Ui.TextAlignCenter
                ]
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 17 17 17
                    }
                )
                "Googleでログイン"
            ]
        ]


lineIcon : LogInButtonModel -> Ui.Panel msg
lineIcon logInButtonModel =
    Ui.imageFromUrl
        []
        [ Ui.Width (Ui.Fix 48)
        , Ui.Padding 4
        , case logInButtonModel of
            LogInButtonModelNone ->
                Ui.BorderRight { color = Css.rgb 0 179 0, width = 1 }

            LogInButtonModelHover ->
                Ui.BorderRight { color = Css.rgb 0 201 0, width = 1 }

            LogInButtonModelPressed ->
                Ui.BorderRight { color = Css.rgb 0 152 0, width = 1 }
        ]
        { fitStyle = Ui.Contain
        , alternativeText = "LINEのロゴ"
        , rendering = Ui.ImageRenderingAuto
        }
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA3NpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNS1jMDIxIDc5LjE1NDkxMSwgMjAxMy8xMC8yOS0xMTo0NzoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDphNTk0YTczYS0zNzEzLTRhMjktODgyYi0xYjg0ZWJkMjM5NGQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0MwNENBMzQ5M0YyMTFFNDk1OEFENjBBMUJBQjkyMzkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0MwMEVBMTg5M0YyMTFFNDk1OEFENjBBMUJBQjkyMzkiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6MDAwNGE4MWQtN2M4ZS00MjQxLTg1NDYtZTY5YzBhNDg0Njc0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOmE1OTRhNzNhLTM3MTMtNGEyOS04ODJiLTFiODRlYmQyMzk0ZCIvPiA8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"


gitHubIcon : Ui.Panel msg
gitHubIcon =
    Ui.vectorImage
        []
        [ Ui.Width (Ui.Fix 48), Ui.Padding 8 ]
        { fitStyle = Ui.Contain
        , viewBox = { x = 0, y = 0, width = 20, height = 20 }
        , elements =
            [ VectorImage.path
                "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
                VectorImage.strokeNone
                (VectorImage.fillColor (Color.fromRGB ( 0, 0, 0 )))
            ]
        }


googleIcon : Ui.Panel msg
googleIcon =
    Ui.vectorImage
        []
        [ Ui.Width (Ui.Fix 48), Ui.Padding 8 ]
        { fitStyle = Ui.Contain
        , viewBox = { x = 0, y = 0, width = 20, height = 20 }
        , elements =
            [ VectorImage.path
                "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Color.fromRGB ( 66, 133, 244 )))
            , VectorImage.path
                "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Color.fromRGB ( 52, 168, 83 )))
            , VectorImage.path
                "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Color.fromRGB ( 251, 188, 5 )))
            , VectorImage.path
                "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                VectorImage.strokeNone
                (VectorImage.fillColor (Color.fromRGB ( 234, 67, 53 )))
            ]
        }


yggdrasil : Data.User.LogInState -> Ui.Panel Msg
yggdrasil logInState =
    Ui.column
        []
        []
        8
        [ Ui.text
            []
            []
            Component.Style.normalFont
            "プロジェクト"
        , case logInState of
            Data.User.ReadingAccessToken ->
                Ui.text
                    []
                    []
                    Component.Style.normalFont
                    "…"

            Data.User.VerifyingAccessToken _ ->
                Ui.text
                    []
                    []
                    Component.Style.normalFont
                    "…"

            Data.User.GuestUser _ ->
                Ui.text
                    [ Ui.Click MsgCreateProjectByGuest ]
                    []
                    Component.Style.normalFont
                    "プロジェクトをこの端末に新規作成"

            Data.User.Ok { accessToken } ->
                Ui.text
                    [ Ui.Click (MsgCreateProject accessToken) ]
                    []
                    Component.Style.normalFont
                    "プロジェクトを新規作成"
        , Ui.text
            []
            []
            Component.Style.normalFont
            "プロジェクト一覧 そのうちユーザーによって並び替える"
        ]
