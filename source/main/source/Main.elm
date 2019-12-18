port module Main exposing (main)

import Api
import Browser
import Browser.Navigation
import Component.DefaultUi
import Component.EditorGroup
import Component.Header
import Component.Notifications
import Data.Key
import Data.Language
import Data.PageLocation
import Data.User
import Html
import Html.Styled
import Json.Decode
import Page.Welcome
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



{- Sub (JavaScript → Elm) -}


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port portResponseAccessTokenFromIndexedDB : (String -> msg) -> Sub msg


port changeLanguage : (String -> msg) -> Sub msg


port changeNetworkConnection : (Bool -> msg) -> Sub msg


port subPointerUp : (() -> msg) -> Sub msg


port serviceWorkerRegisterError : (() -> msg) -> Sub msg


port serviceWorkerLoadingOfflineFiles : (() -> msg) -> Sub msg


port serviceWorkerActivatedWithOfflineFiles : (() -> msg) -> Sub msg


port serviceWorkerActivatedWithOutOfflineFiles : (() -> msg) -> Sub msg


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
    | ResponseUserData (Result String Data.User.User) -- ユーザーの情報を受け取った
    | ChangeLanguage String -- 使用言語が変わった
    | ChangeNetworkConnection Bool -- 接続状況が変わった
    | PageMsg PageMsg
    | NoOperation
    | ServiceWorkerMsg ServiceWorkerMsg


type PageMsg
    = WelcomePageMsg Page.Welcome.Msg


type ServiceWorkerMsg
    = ServiceWorkerMsgRegisterError
    | ServiceWorkerMsgLoadingOfflineFiles
    | ServiceWorkerMsgActivatedWithOfflineFiles
    | ServiceWorkerMsgActivatedWithOutOfflineFiles


{-| 全体を表現する
-}
type Model
    = Model
        { subMode : SubMode
        , page : PageModel
        , windowSize : { width : Int, height : Int }
        , messageQueue : List Msg
        , logInState : Data.User.LogInState
        , language : Data.Language.Language
        , networkConnection : Bool
        , notificationModel : Component.Notifications.Model
        , browserSupport : BrowserSupport
        , serviceWorker : ServiceWorker
        }


type SubMode
    = SubModeNone
    | SubModeGutter GutterType


type GutterType
    = GutterTypeVertical
    | GutterTypeHorizontal


type PageModel
    = Welcome Page.Welcome.Model


type BrowserSupport
    = BrowserSupport
        { indexedDB : Bool
        , webGL : Bool
        }


type ServiceWorker
    = ServiceWorkerNotSupport
    | ServiceWorkerRegistering
    | ServiceWorkerRegisterError
    | ServiceWorkerLoadingOfflineFiles
    | ServiceWorkerActivatedWithOfflineFiles
    | ServiceWorkerActivatedWithOutOfflineFiles


type alias Flag =
    { url : String
    , windowSize :
        { width : Int
        , height : Int
        }
    , language : String
    , networkConnection : Bool
    , indexedDBSupport : Bool
    , webGLSupport : Bool
    , serviceWorkerSupport : Bool
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
        ( tokenFromUrlMaybe, page ) =
            Data.PageLocation.initFromUrl flag.url

        model =
            Model
                { subMode = SubModeNone
                , page = Welcome Page.Welcome.init
                , windowSize = flag.windowSize
                , messageQueue = []
                , logInState =
                    case tokenFromUrlMaybe of
                        Just accessToken ->
                            Data.User.VerifyingAccessToken accessToken

                        Nothing ->
                            Data.User.ReadingAccessToken
                , language = Data.Language.languageFromString flag.language
                , networkConnection = flag.networkConnection
                , notificationModel =
                    Component.Notifications.initModel
                        |> (if flag.networkConnection then
                                identity

                            else
                                Component.Notifications.addEvent Component.Notifications.OffLine
                           )
                , browserSupport =
                    BrowserSupport
                        { indexedDB = flag.indexedDBSupport
                        , webGL = flag.webGLSupport
                        }
                , serviceWorker =
                    if flag.serviceWorkerSupport then
                        ServiceWorkerRegistering

                    else
                        ServiceWorkerNotSupport
                }
    in
    ( model
    , (case tokenFromUrlMaybe of
        Just accessToken ->
            [ writeAccessTokenToIndexedDB (Data.User.accessTokenToString accessToken)
            , Api.getUserPrivate accessToken ResponseUserData
            ]

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

        ChangeLanguage string ->
            ( Model rec |> setLanguage string
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
                            welcomeModel |> Page.Welcome.update welcomePageMsg
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

        ServiceWorkerMsg serviceWorkerMsg ->
            case serviceWorkerMsg of
                ServiceWorkerMsgRegisterError ->
                    ( Model { rec | serviceWorker = ServiceWorkerRegisterError }
                    , Cmd.none
                    )

                ServiceWorkerMsgLoadingOfflineFiles ->
                    ( Model { rec | serviceWorker = ServiceWorkerLoadingOfflineFiles }
                    , Cmd.none
                    )

                ServiceWorkerMsgActivatedWithOfflineFiles ->
                    ( Model { rec | serviceWorker = ServiceWorkerActivatedWithOfflineFiles }
                    , Cmd.none
                    )

                ServiceWorkerMsgActivatedWithOutOfflineFiles ->
                    ( Model { rec | serviceWorker = ServiceWorkerActivatedWithOutOfflineFiles }
                    , Cmd.none
                    )


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


welcomePageCmdToCmd : Page.Welcome.Cmd -> Cmd Msg
welcomePageCmdToCmd cmd =
    case cmd of
        Page.Welcome.CmdToVerticalGutterMode ->
            Task.succeed (ToResizeGutterMode GutterTypeVertical)
                |> Task.perform identity

        Page.Welcome.CmdConsoleLog string ->
            consoleLog string

        Page.Welcome.CmdToLogInPage socialLoginService ->
            Api.getLogInUrl
                socialLoginService
                (Page.Welcome.MsgGetLogInUrlResponse >> WelcomePageMsg >> PageMsg)

        Page.Welcome.CmdJumpPage url ->
            Browser.Navigation.load (Url.toString url)

        Page.Welcome.CmdCreateProject accessToken ->
            consoleLog "プロジェクトを新規作成する"

        Page.Welcome.CmdCreateProjectByGuest ->
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
                    model |> Page.Welcome.update Page.Welcome.MsgPointerUp
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


getLanguage : Model -> Data.Language.Language
getLanguage (Model { language }) =
    language


setLanguage : String -> Model -> Model
setLanguage string (Model rec) =
    Model
        { rec
            | language = Data.Language.languageFromString string
        }



{- ================================================================
                               View
   ================================================================
-}


{-| 見た目を定義する
-}
view : Model -> Html.Html Msg
view (Model rec) =
    Ui.depth
        []
        (case getGutterType (Model rec) of
            Just gutterType ->
                [ Ui.PointerImage (gutterTypeToCursorStyle gutterType) ]

            Nothing ->
                []
        )
        ((case rec.page of
            Welcome welcomeModel ->
                [ Ui.column
                    []
                    []
                    0
                    [ Component.Header.view
                    , welcomeModel
                        |> Page.Welcome.view rec.logInState
                        |> Ui.map (WelcomePageMsg >> PageMsg)
                    ]
                ]
         )
            ++ [ Component.Notifications.view rec.notificationModel ]
        )
        |> Ui.toHtml
        |> Html.Styled.toUnstyled


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
                        Data.User.GuestUser Nothing

                    "error" ->
                        Data.User.GuestUser (Just Data.User.FailToReadIndexedDB)

                    _ ->
                        Data.User.VerifyingAccessToken (Data.User.AccessToken accessToken)
        }


requestUserData : Model -> Cmd Msg
requestUserData (Model rec) =
    case rec.logInState of
        Data.User.ReadingAccessToken ->
            Cmd.none

        Data.User.VerifyingAccessToken accessToken ->
            Api.getUserPrivate accessToken ResponseUserData

        Data.User.GuestUser maybe ->
            Cmd.none

        Data.User.Ok user ->
            Cmd.none


responseUserData : Result String Data.User.User -> Model -> ( Model, Cmd Msg )
responseUserData result (Model rec) =
    case ( result, rec.logInState ) of
        ( Ok user, Data.User.VerifyingAccessToken accessToken ) ->
            ( Model
                { rec
                    | logInState =
                        Data.User.Ok
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

        ( Err string, Data.User.VerifyingAccessToken _ ) ->
            ( Model
                { rec
                    | logInState = Data.User.GuestUser (Just Data.User.AccessTokenIsInvalid)
                    , notificationModel =
                        rec.notificationModel
                            |> Component.Notifications.addEvent
                                Component.Notifications.LogInFailure
                }
            , consoleLog ("ユーザーの情報の取得に失敗 " ++ string)
            )

        ( _, _ ) ->
            ( Model rec
            , consoleLog "いらないときにユーザーの情報を受け取ってしまった"
            )



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
         , changeLanguage ChangeLanguage
         , changeNetworkConnection ChangeNetworkConnection
         , serviceWorkerRegisterError
            (always
                (ServiceWorkerMsg ServiceWorkerMsgRegisterError)
            )
         , serviceWorkerLoadingOfflineFiles
            (always
                (ServiceWorkerMsg ServiceWorkerMsgLoadingOfflineFiles)
            )
         , serviceWorkerActivatedWithOfflineFiles
            (always
                (ServiceWorkerMsg ServiceWorkerMsgActivatedWithOfflineFiles)
            )
         , serviceWorkerActivatedWithOutOfflineFiles
            (always
                (ServiceWorkerMsg ServiceWorkerMsgActivatedWithOutOfflineFiles)
            )
         ]
            ++ (if isCaptureMouseEvent model then
                    [ subPointerUp (always PointerUp) ]

                else
                    []
               )
        )
