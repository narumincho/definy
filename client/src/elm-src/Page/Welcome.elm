module Page.Welcome exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Css
import Data.User
import Panel.Style
import Ui


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
                            [ Ui.depth
                                []
                                []
                                [ Ui.monochromatic [] [] (Css.rgb 0 195 0)
                                , Ui.text
                                    []
                                    []
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
                        ]

                    _ ->
                        []
               )
        )


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
