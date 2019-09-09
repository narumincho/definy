module Page.Welcome exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , init
    , update
    , view
    )

import Css
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
        { width = 250
        , sideResizeMode = None
        }


update : Msg -> Model -> ( Model, List Cmd )
update msg (Model rec) =
    case msg of
        ToSideGutterMode gutterMsg ->
            case gutterMsg of
                Panel.Style.GutterMsgPointerEnter ->
                    ( Model { rec | sideResizeMode = PointerEnter }
                    , [ ConsoleLog "ポインターがリサイズのできる線の上に乗った" ]
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
                    , [ CmdToVerticalGutterMode
                      , ConsoleLog (pointer |> Ui.pointerGetPosition |> Tuple.first |> String.fromFloat)
                      ]
                    )

        PointerMove mouseState ->
            ( Model { rec | width = mouseState |> Ui.pointerGetPosition |> Tuple.first |> floor }
            , [ ConsoleLog ("ポインターが動いた" ++ (mouseState |> Ui.pointerGetPosition |> Tuple.first |> String.fromFloat)) ]
            )

        PointerUp ->
            ( Model { rec | sideResizeMode = None }
            , [ ConsoleLog "ポインターを離した" ]
            )


view : Model -> Ui.Panel Msg
view (Model rec) =
    Ui.row
        (case rec.sideResizeMode of
            Resize ->
                [ Ui.PointerMove PointerMove ]

            _ ->
                []
        )
        []
        [ side { width = rec.width }
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


side : { width : Int } -> Ui.Panel msg
side { width } =
    Ui.depth
        []
        [ Ui.Width (Ui.Fix width) ]
        [ Ui.monochromatic
            []
            []
            (Css.rgb 32 32 32)
        , Ui.text
            []
            []
            { textAlign = Ui.TextAlignStart
            , verticalAlignment = Ui.CenterY
            , font =
                Ui.Font
                    { typeface = "Roboto"
                    , size = 24
                    , letterSpacing = 0
                    , color = Css.rgb 255 192 0
                    }
            }
            "Definyのロゴ、ログイン状態、検索欄、お気に入りのブランチ(プロジェクトでグループ)"
        ]


yggdrasil : Ui.Panel msg
yggdrasil =
    Ui.text
        []
        []
        { textAlign = Ui.TextAlignCenter
        , verticalAlignment = Ui.CenterY
        , font =
            Ui.Font
                { typeface = "Roboto"
                , size = 24
                , letterSpacing = 0
                , color = Css.rgb 0 255 100
                }
        }
        "ユグドラシル。Definy全てのプロジェクトの依存関係がグラフになるモニュメント"
