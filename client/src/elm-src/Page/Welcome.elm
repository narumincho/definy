module Page.Welcome exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Color
import Css
import Data.User
import Panel.Style
import Ui
import Utility.NSvg


type Model
    = Model
        { width : Int
        , sideResizeMode : SideResizeMode
        }


type SideResizeMode
    = None
    | PointerEnter
    | Resize


type Msg
    = ToSideGutterMode Panel.Style.GutterMsg
    | PointerMove Ui.Pointer
    | PointerUp


type Cmd
    = CmdToVerticalGutterMode
    | ConsoleLog String


init : Model
init =
    Model
        { width = 400
        , sideResizeMode = None
        }


update : Msg -> Model -> ( Model, List Cmd )
update msg (Model rec) =
    case msg of
        ToSideGutterMode gutterMsg ->
            case gutterMsg of
                Panel.Style.GutterMsgPointerEnter ->
                    ( Model { rec | sideResizeMode = PointerEnter }
                    , []
                    )

                Panel.Style.GutterMsgPointerLeave ->
                    ( Model { rec | sideResizeMode = None }
                    , []
                    )

                Panel.Style.GutterMsgToResizeMode pointer ->
                    ( Model
                        { rec
                            | sideResizeMode = Resize
                            , width = pointer |> Ui.pointerGetPosition |> Tuple.first |> floor
                        }
                    , [ CmdToVerticalGutterMode ]
                    )

        PointerMove mouseState ->
            ( Model { rec | width = mouseState |> Ui.pointerGetPosition |> Tuple.first |> floor }
            , []
            )

        PointerUp ->
            ( Model { rec | sideResizeMode = None }
            , []
            )


view : Data.User.LogInState -> Model -> Ui.Panel Msg
view logInState (Model rec) =
    Ui.row
        (case rec.sideResizeMode of
            Resize ->
                [ Ui.PointerMove PointerMove ]

            _ ->
                []
        )
        []
        0
        [ side { width = rec.width, logInState = logInState }
        , Panel.Style.gutterPanel
            (case rec.sideResizeMode of
                None ->
                    Panel.Style.GutterModeNone

                PointerEnter ->
                    Panel.Style.GutterModePointerEnter

                Resize ->
                    Panel.Style.GutterModeResize
            )
            |> Ui.map ToSideGutterMode
        , yggdrasil
        ]


side : { width : Int, logInState : Data.User.LogInState } -> Ui.Panel msg
side { width, logInState } =
    Ui.column
        []
        [ Ui.Width (Ui.Fix width) ]
        16
        [ titleLogo
        , userView logInState
        , Ui.depth
            []
            []
            [ Ui.monochromatic
                []
                []
                (Css.rgb 32 32 32)
            , Ui.text
                []
                []
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 24
                    , letterSpacing = 0
                    , color = Css.rgb 255 192 0
                    }
                )
                "Definyのロゴ、ログイン状態、検索欄、お気に入りのブランチ(プロジェクトでグループ)"
            ]
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


userView : Data.User.LogInState -> Ui.Panel msg
userView logInState =
    Ui.column
        []
        []
        8
        ([ Ui.text
            []
            [ Ui.TextAlignment Ui.TextAlignCenter ]
            (Ui.Font
                { typeface = "Roboto"
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 221 221 221
                }
            )
            (case logInState of
                Data.User.ReadAccessToken ->
                    "アクセストークン読み込み中"

                Data.User.VerifyingAccessToken (Data.User.AccessToken accessTokenString) ->
                    "アクセストークンを検証、ユーザーをリクエスト中 " ++ accessTokenString

                Data.User.GuestUser _ ->
                    "ゲストユーザー"

                Data.User.Ok user ->
                    Data.User.getName user
            )
         ]
            ++ (case logInState of
                    Data.User.GuestUser _ ->
                        [ Ui.column
                            []
                            []
                            8
                            [ lineLogInButton
                            , gitHubLogInButton
                            , googleLogInButton
                            ]
                        ]

                    _ ->
                        []
               )
        )


lineLogInButton : Ui.Panel msg
lineLogInButton =
    Ui.depth
        []
        [ Ui.Height (Ui.Fix 32) ]
        [ Ui.monochromatic [] [] (Css.rgb 0 195 0)
        , Ui.row
            []
            []
            0
            [ Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY ]
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


gitHubLogInButton : Ui.Panel msg
gitHubLogInButton =
    Ui.depth
        []
        [ Ui.Height (Ui.Fix 32) ]
        [ Ui.monochromatic [] [] (Css.rgb 32 32 32)
        , Ui.row
            []
            []
            0
            [ Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY ]
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    }
                )
                "GitHubでログイン"
            ]
        ]


googleLogInButton : Ui.Panel msg
googleLogInButton =
    Ui.depth
        []
        [ Ui.Height (Ui.Fix 32) ]
        [ Ui.monochromatic [] [] (Css.rgb 32 32 32)
        , Ui.row
            []
            []
            0
            [ googleIcon
            , Ui.text
                []
                [ Ui.VerticalAlignment Ui.CenterY ]
                (Ui.Font
                    { typeface = "Roboto"
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    }
                )
                "Googleでログイン"
            ]
        ]


googleIcon : Ui.Panel msg
googleIcon =
    Ui.vectorImage
        []
        [ Ui.Width (Ui.Fix 32) ]
        { fitStyle = Ui.Contain
        , viewBox = { x = 0, y = 0, width = 20, height = 20 }
        , nSvgElements =
            [ Utility.NSvg.path
                "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                Utility.NSvg.strokeNone
                (Utility.NSvg.fillColor (Color.fromRGB ( 66, 133, 244 )))
            , Utility.NSvg.path
                "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                Utility.NSvg.strokeNone
                (Utility.NSvg.fillColor (Color.fromRGB ( 52, 168, 83 )))
            , Utility.NSvg.path
                "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                Utility.NSvg.strokeNone
                (Utility.NSvg.fillColor (Color.fromRGB ( 251, 188, 5 )))
            , Utility.NSvg.path
                "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                Utility.NSvg.strokeNone
                (Utility.NSvg.fillColor (Color.fromRGB ( 234, 67, 53 )))
            ]
        }


yggdrasil : Ui.Panel msg
yggdrasil =
    Ui.text
        []
        []
        (Ui.Font
            { typeface = "Roboto"
            , size = 24
            , letterSpacing = 0
            , color = Css.rgb 0 255 100
            }
        )
        "ユグドラシル。Definy全てのプロジェクトの依存関係がグラフになるモニュメント"
