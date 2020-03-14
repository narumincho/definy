port module Main exposing (main)

import Browser
import Browser.Navigation
import Component.DefaultUi
import Component.EditorGroup
import Component.Header
import Component.Notifications
import Component.Style
import Css
import Data
import Data.Key
import Data.LogInState
import Html
import Html.Styled
import Icon
import Json.Decode
import Json.Encode
import Page.Home
import Task
import Ui
import Url


{-| すべての状態を管理する
-}



{- Cmd (Elm → JavaScript) -}


port setTextAreaValue : { text : String, id : String } -> Cmd msg


port focusElement : String -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port elementScrollIntoView : String -> Cmd msg


port requestAccessTokenFromIndexedDB : () -> Cmd msg


port writeAccessTokenToIndexedDB : String -> Cmd msg


port consoleLog : String -> Cmd msg


port requestLogInUrl : Json.Encode.Value -> Cmd msg



{- Sub (JavaScript → Elm) -}


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port portResponseAccessTokenFromIndexedDB : (String -> msg) -> Sub msg


port changeNetworkConnection : (Bool -> msg) -> Sub msg


port subPointerUp : (() -> msg) -> Sub msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Data.Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | PointerUp -- マウスのボタンを離した/タブの表示状態が変わった
    | ToResizeGutterMode GutterType -- リサイズモードに移行
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | LogOutRequest -- ログアウトを要求する
    | ResponseAccessTokenFromIndexedDB String
    | ResponseUserData (Maybe Data.UserPublic) -- ユーザーの情報を受け取った
    | ChangeNetworkConnection Bool -- 接続状況が変わった
    | PageMsg PageMsg
    | LogInRequest Data.OpenIdConnectProvider
    | NoOperation


type PageMsg
    = WelcomePageMsg Page.Home.Msg


{-| 全体を表現する
-}
type Model
    = Model
        { subMode : SubMode
        , page : PageModel
        , windowSize : WindowSize
        , messageQueue : List Msg
        , logInState : Data.LogInState.LogInState
        , language : Data.Language
        , clientMode : Data.ClientMode
        , networkConnection : Bool
        , notificationModel : Component.Notifications.Model
        }


type alias WindowSize =
    { width : Int, height : Int }


type SubMode
    = SubModeNone
    | SubModeGutter GutterType


type GutterType
    = GutterTypeVertical
    | GutterTypeHorizontal


type PageModel
    = Welcome Page.Home.Model


type alias Flag =
    { windowSize :
        { width : Int
        , height : Int
        }
    , urlData : Json.Decode.Value
    , networkConnection : Bool
    }


main : Platform.Program Flag Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


init :
    Flag
    -> ( Model, Cmd Msg )
init flag =
    let
        urlData : Data.UrlData
        urlData =
            flag.urlData
                |> Json.Decode.decodeValue Data.urlDataJsonDecoder
                |> Result.withDefault
                    { clientMode = Data.Release
                    , location = Data.Home
                    , language = Data.English
                    , accessToken = Nothing
                    }

        tokenFromUrlMaybe =
            Nothing

        model =
            Model
                { subMode = SubModeNone
                , page = Welcome Page.Home.init
                , windowSize = flag.windowSize
                , messageQueue = []
                , logInState =
                    case tokenFromUrlMaybe of
                        Just accessToken ->
                            Data.LogInState.VerifyingAccessToken accessToken

                        Nothing ->
                            Data.LogInState.ReadingAccessToken
                , language = urlData.language
                , networkConnection = flag.networkConnection
                , notificationModel =
                    Component.Notifications.initModel
                        |> (if flag.networkConnection then
                                identity

                            else
                                Component.Notifications.addEvent Component.Notifications.OffLine
                           )
                , clientMode = urlData.clientMode
                }
    in
    ( model
    , (case tokenFromUrlMaybe of
        Just (Data.AccessToken accessToken) ->
            [ writeAccessTokenToIndexedDB accessToken ]

        Nothing ->
            [ requestAccessTokenFromIndexedDB () ]
      )
        |> Cmd.batch
    )



{- ============================================
                   Update
   ============================================
-}


{-| Definy全体のUpdate
-}
update : Msg -> Model -> ( Model, Cmd Msg )
update msg (Model rec) =
    case msg of
        KeyPressed key ->
            case keyDown key (Model rec) of
                [] ->
                    ( Model rec, Cmd.none )

                concreteMsgList ->
                    ( Model rec |> pushMsgListToMsgQueue concreteMsgList
                    , preventDefaultBeforeKeyEvent ()
                    )

        KeyPrevented ->
            let
                ( listMsg, newModel ) =
                    Model rec |> shiftMsgListFromMsgQueue
            in
            newModel |> updateFromMsgList listMsg

        PointerUp ->
            pointerUp (Model rec)

        ToResizeGutterMode gutter ->
            ( toGutterMode gutter (Model rec)
            , Cmd.none
            )

        WindowResize { width, height } ->
            ( Model rec |> setWindowSize { width = width, height = height }
            , Cmd.none
            )

        LogOutRequest ->
            ( Model rec
            , Cmd.none
            )

        ResponseAccessTokenFromIndexedDB accessToken ->
            let
                newModel =
                    Model rec |> responseAccessTokenFromIndexedDB accessToken
            in
            ( newModel, requestUserData newModel )

        ResponseUserData result ->
            Model rec |> responseUserData result

        PageMsg pageMsg ->
            case ( rec.page, pageMsg ) of
                ( Welcome welcomeModel, WelcomePageMsg welcomePageMsg ) ->
                    let
                        ( newWelcomeModel, cmd ) =
                            welcomeModel |> Page.Home.update welcomePageMsg
                    in
                    ( Model { rec | page = Welcome newWelcomeModel }
                    , cmd |> List.map welcomePageCmdToCmd |> Cmd.batch
                    )

        NoOperation ->
            ( Model rec
            , Cmd.none
            )

        ChangeNetworkConnection connection ->
            ( Model
                { rec
                    | networkConnection = connection
                    , notificationModel =
                        rec.notificationModel
                            |> Component.Notifications.addEvent
                                (if connection then
                                    Component.Notifications.OnLine

                                 else
                                    Component.Notifications.OffLine
                                )
                }
            , Cmd.none
            )

        LogInRequest openIdConnectProvider ->
            ( Model rec
            , requestLogInUrlTyped
                { openIdConnectProvider = openIdConnectProvider
                , urlData =
                    { clientMode = rec.clientMode
                    , location = pageModelToLocation rec.page
                    , language = rec.language
                    , accessToken = Nothing
                    }
                }
            )


pageModelToLocation : PageModel -> Data.Location
pageModelToLocation pageModel =
    case pageModel of
        Welcome _ ->
            Data.Home


updateFromMsgList : List Msg -> Model -> ( Model, Cmd Msg )
updateFromMsgList msgList model =
    case msgList of
        msg :: tailMsg ->
            let
                ( newModel, cmd ) =
                    update msg model
            in
            updateFromMsgList tailMsg newModel
                |> Tuple.mapSecond (\next -> Cmd.batch [ cmd, next ])

        [] ->
            ( model, Cmd.none )


welcomePageCmdToCmd : Page.Home.Cmd -> Cmd Msg
welcomePageCmdToCmd cmd =
    case cmd of
        Page.Home.CmdToVerticalGutterMode ->
            Task.succeed (ToResizeGutterMode GutterTypeVertical)
                |> Task.perform identity

        Page.Home.CmdConsoleLog string ->
            consoleLog string

        Page.Home.CmdToLogInPage socialLoginService ->
            Cmd.none

        Page.Home.CmdJumpPage url ->
            Browser.Navigation.load (Url.toString url)

        Page.Home.CmdCreateProject accessToken ->
            consoleLog "プロジェクトを新規作成する"

        Page.Home.CmdCreateProjectByGuest ->
            consoleLog "プロジェクトをこの端末に新規作成する"



{- =================================================
                       キー入力
   =================================================
-}


{-| キー入力をより具体的なMsgに変換する
-}
keyDown : Maybe Data.Key.Key -> Model -> List Msg
keyDown keyMaybe model =
    case keyMaybe of
        Just key ->
            case isFocusDefaultUi model of
                Just Component.DefaultUi.MultiLineTextField ->
                    if multiLineTextFieldReservedKey key then
                        []

                    else
                        keyDownEachPanel key model

                Just Component.DefaultUi.SingleLineTextField ->
                    if singleLineTextFieldReservedKey key then
                        []

                    else
                        keyDownEachPanel key model

                Nothing ->
                    keyDownEachPanel key model

        Nothing ->
            []


keyDownEachPanel : Data.Key.Key -> Model -> List Msg
keyDownEachPanel _ _ =
    []


{-|

<textarea>で入力したときに予約されているであろうキーならTrue、そうでないならFalse。
複数行入力を想定している
ブラウザやOSで予約されているであろう動作を邪魔させないためにある。
Model.isFocusTextAreaがTrueになったときにまずこれを優先する

-}
multiLineTextFieldReservedKey : Data.Key.Key -> Bool
multiLineTextFieldReservedKey { key, ctrl, alt, shift } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    True

                Data.Key.ArrowRight ->
                    True

                Data.Key.ArrowUp ->
                    True

                Data.Key.ArrowDown ->
                    True

                Data.Key.Enter ->
                    True

                Data.Key.Backspace ->
                    True

                _ ->
                    False

        ( True, False, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    True

                Data.Key.ArrowRight ->
                    True

                Data.Key.ArrowUp ->
                    True

                Data.Key.ArrowDown ->
                    True

                Data.Key.Backspace ->
                    True

                _ ->
                    False

        ( False, True, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    True

                Data.Key.ArrowRight ->
                    True

                Data.Key.ArrowUp ->
                    True

                Data.Key.ArrowDown ->
                    True

                _ ->
                    False

        ( True, True, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    True

                Data.Key.ArrowRight ->
                    True

                Data.Key.ArrowUp ->
                    True

                Data.Key.ArrowDown ->
                    True

                _ ->
                    False

        _ ->
            False


{-| <input type="text">で入力したときに予約されているであろうキーならTrue。そうでないなたFalse。
1行の入力を想定している
ブラウザやOSで予約されているであろう動作を邪魔させないためにある。
-}
singleLineTextFieldReservedKey : Data.Key.Key -> Bool
singleLineTextFieldReservedKey { key, ctrl, alt, shift } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    True

                Data.Key.ArrowRight ->
                    True

                Data.Key.Backspace ->
                    True

                _ ->
                    False

        _ ->
            False



{- =================================================
                       マウス入力
   =================================================
-}


{-| マウスのボタンを離した、タッチを離した
-}
pointerUp : Model -> ( Model, Cmd Msg )
pointerUp (Model rec) =
    case rec.page of
        Welcome model ->
            let
                ( newModel, cmd ) =
                    model |> Page.Home.update Page.Home.MsgPointerUp
            in
            ( Model
                { rec
                    | subMode =
                        case rec.subMode of
                            SubModeGutter _ ->
                                SubModeNone

                            _ ->
                                rec.subMode
                    , page = Welcome newModel
                }
            , cmd |> List.map welcomePageCmdToCmd |> Cmd.batch
            )



{- ============ Tree Panel ============= -}


setWindowSize : { width : Int, height : Int } -> Model -> Model
setWindowSize { width, height } (Model rec) =
    Model
        { rec
            | windowSize = { width = width, height = height }
        }


isCaptureMouseEvent : Model -> Bool
isCaptureMouseEvent model =
    getGutterType model /= Nothing


getGutterType : Model -> Maybe GutterType
getGutterType (Model { subMode }) =
    case subMode of
        SubModeNone ->
            Nothing

        SubModeGutter gutter ->
            Just gutter


toGutterMode : GutterType -> Model -> Model
toGutterMode gutter (Model rec) =
    Model
        { rec
            | subMode = SubModeGutter gutter
        }


{-| エディタグループパネルの更新
-}
editorPanelCmdToCmd : Component.EditorGroup.Cmd -> Cmd Msg
editorPanelCmdToCmd cmd =
    case cmd of
        Component.EditorGroup.CmdVerticalGutterModeOn _ ->
            Task.succeed
                (ToResizeGutterMode GutterTypeVertical)
                |> Task.perform identity

        Component.EditorGroup.CmdHorizontalGutterModeOn _ ->
            Task.succeed
                (ToResizeGutterMode GutterTypeHorizontal)
                |> Task.perform identity

        Component.EditorGroup.CmdSetTextAreaValue string ->
            setTextAreaValue { text = string, id = "edit" }

        Component.EditorGroup.CmdFocusEditTextAea ->
            focusElement "edit"

        Component.EditorGroup.CmdElementScrollIntoView id ->
            elementScrollIntoView id

        Component.EditorGroup.CmdFocusHere ->
            Cmd.none

        Component.EditorGroup.CmdNone ->
            Cmd.none


{-| いまブラウザが入力を受け取る要素にフォーカスが当たっているかどうか。当たっていたらブラウザのデフォルト動作を邪魔しない
-}
isFocusDefaultUi : Model -> Maybe Component.DefaultUi.DefaultUi
isFocusDefaultUi model =
    Nothing



{- ============ キー入力されたら、すぐpreventDefaultしないとだめなため、後で処理するmsgを入れとく =============== -}


pushMsgListToMsgQueue : List Msg -> Model -> Model
pushMsgListToMsgQueue msgList (Model rec) =
    Model
        { rec
            | messageQueue = rec.messageQueue ++ msgList
        }


shiftMsgListFromMsgQueue : Model -> ( List Msg, Model )
shiftMsgListFromMsgQueue (Model rec) =
    ( rec.messageQueue
    , Model
        { rec | messageQueue = [] }
    )


getLanguage : Model -> Data.Language
getLanguage (Model { language }) =
    language



{- ================================================================
                               View
   ================================================================
-}


{-| 見た目を定義する
-}
view : Model -> Html.Html Msg
view (Model rec) =
    Ui.depth
        (case getGutterType (Model rec) of
            Just gutterType ->
                [ Ui.pointerImage (gutterTypeToCursorStyle gutterType) ]

            Nothing ->
                []
        )
        ((case rec.page of
            Welcome welcomeModel ->
                [ Ui.column
                    []
                    0
                    [ Component.Header.view
                    , logInButtonPanel rec.language rec.windowSize
                    , welcomeModel
                        |> Page.Home.view rec.language rec.logInState
                        |> Ui.map (WelcomePageMsg >> PageMsg)
                    ]
                ]
         )
            ++ [ Component.Notifications.view rec.notificationModel ]
        )
        |> Ui.toHtml
        |> Html.Styled.toUnstyled


logInButtonPanel : Data.Language -> WindowSize -> Ui.Panel Msg
logInButtonPanel language { width, height } =
    if width < 512 then
        Ui.column
            [ Ui.height (48 * 2 + 32) ]
            16
            [ googleLogInButton language
            , gitHubLogInButton language
            ]

    else
        Ui.row
            [ Ui.height 64, Ui.padding 8 ]
            16
            [ Ui.empty []
            , googleLogInButton language
            , gitHubLogInButton language
            ]


googleLogInButton : Data.Language -> Ui.Panel Msg
googleLogInButton language =
    Ui.depth
        [ Ui.onClick (LogInRequest Data.Google)
        , Ui.borderRadius 8
        , Ui.height 48
        , Ui.width 448
        ]
        [ Ui.monochromatic
            []
            (Css.rgb 66 133 244)
        , Ui.row
            []
            8
            [ Ui.depth
                [ Ui.width 48 ]
                [ Ui.monochromatic [] (Css.rgb 255 255 255)
                , Icon.googleIcon
                ]
            , Ui.textBox []
                { align = Ui.TextAlignStart
                , vertical = Ui.CenterY
                , font =
                    Ui.Font
                        { typeface = Component.Style.fontHackName
                        , size = 16
                        , letterSpacing = 0
                        , color = Css.rgb 255 255 255
                        }
                }
                (case language of
                    Data.English ->
                        "Sign in with Google"

                    Data.Japanese ->
                        "Googleでログイン"

                    Data.Esperanto ->
                        "Ensalutu kun Google"
                )
            ]
        ]


gitHubLogInButton : Data.Language -> Ui.Panel Msg
gitHubLogInButton language =
    Ui.depth
        [ Ui.onClick (LogInRequest Data.GitHub)
        , Ui.borderRadius 8
        , Ui.height 48
        , Ui.width 448
        ]
        [ Ui.monochromatic [] (Css.rgb 32 32 32)
        , Ui.row
            []
            8
            [ Ui.depth
                [ Ui.width 48 ]
                [ Ui.monochromatic [] (Css.rgb 255 255 255)
                , Icon.gitHubIcon
                ]
            , Ui.textBox []
                { align = Ui.TextAlignStart
                , vertical = Ui.CenterY
                , font =
                    Ui.Font
                        { typeface = Component.Style.fontHackName
                        , size = 16
                        , letterSpacing = 0
                        , color = Css.rgb 255 255 255
                        }
                }
                (case language of
                    Data.English ->
                        "Sign in with GitHub"

                    Data.Japanese ->
                        "GitHubでログイン"

                    Data.Esperanto ->
                        "Ensalutu kun GitHub"
                )
            ]
        ]


gutterTypeToCursorStyle : GutterType -> Ui.PointerImage
gutterTypeToCursorStyle gutterType =
    case gutterType of
        GutterTypeVertical ->
            Ui.HorizontalResize

        GutterTypeHorizontal ->
            Ui.VerticalResize


responseAccessTokenFromIndexedDB : String -> Model -> Model
responseAccessTokenFromIndexedDB accessToken (Model rec) =
    Model
        { rec
            | logInState =
                case accessToken of
                    "" ->
                        Data.LogInState.GuestUser

                    "error" ->
                        Data.LogInState.GuestUser

                    _ ->
                        Data.LogInState.VerifyingAccessToken (Data.AccessToken accessToken)
        }


requestUserData : Model -> Cmd Msg
requestUserData (Model rec) =
    case rec.logInState of
        Data.LogInState.ReadingAccessToken ->
            Cmd.none

        Data.LogInState.VerifyingAccessToken accessToken ->
            Cmd.none

        Data.LogInState.GuestUser ->
            Cmd.none

        Data.LogInState.Ok user ->
            Cmd.none


responseUserData : Maybe Data.UserPublic -> Model -> ( Model, Cmd Msg )
responseUserData result (Model rec) =
    case ( result, rec.logInState ) of
        ( Just user, Data.LogInState.VerifyingAccessToken accessToken ) ->
            ( Model
                { rec
                    | logInState =
                        Data.LogInState.Ok
                            { user = user
                            , accessToken = accessToken
                            }
                    , notificationModel =
                        rec.notificationModel
                            |> Component.Notifications.addEvent
                                (Component.Notifications.LogInSuccess user)
                }
            , consoleLog "ユーザー情報の取得に成功!"
            )

        ( Nothing, Data.LogInState.VerifyingAccessToken _ ) ->
            ( Model
                { rec
                    | logInState = Data.LogInState.GuestUser
                    , notificationModel =
                        rec.notificationModel
                            |> Component.Notifications.addEvent
                                Component.Notifications.LogInFailure
                }
            , consoleLog "ユーザーの情報の取得に失敗"
            )

        ( _, _ ) ->
            ( Model rec
            , consoleLog "いらないときにユーザーの情報を受け取ってしまった"
            )


requestLogInUrlTyped : Data.RequestLogInUrlRequestData -> Cmd Msg
requestLogInUrlTyped requestLogInUrlRequestData =
    requestLogInUrl
        (Data.requestLogInUrlRequestDataToJsonValue requestLogInUrlRequestData)



{- ================================================================
                           Subscription
   ================================================================
-}


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        ([ keyPressed (Data.Key.fromKeyEventObject >> KeyPressed)
         , keyPrevented (always KeyPrevented)
         , windowResize WindowResize
         , portResponseAccessTokenFromIndexedDB ResponseAccessTokenFromIndexedDB
         , changeNetworkConnection ChangeNetworkConnection
         ]
            ++ (if isCaptureMouseEvent model then
                    [ subPointerUp (always PointerUp) ]

                else
                    []
               )
        )
