port module Main exposing (main)

import Api
import Browser
import Browser.Navigation
import Data.Key
import Data.Language
import Data.PageLocation
import Data.Project
import Data.User
import Html.Styled
import Json.Decode
import Page.Welcome
import Panel.CommandPalette
import Panel.DefaultUi
import Panel.Editor.Module
import Panel.EditorGroup
import Panel.Side
import Task
import Ui
import Url


{-| すべての状態を管理する
-}



{- Cmd (Elm → JavaScript) -}


port setTextAreaValue : String -> Cmd msg


port focusTextArea : () -> Cmd msg


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


port subPointerUp : (() -> msg) -> Sub msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Data.Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | PointerUp -- マウスのボタンを離した/タブの表示状態が変わった
    | ToResizeGutterMode GutterType -- リサイズモードに移行
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | OpenCommandPalette -- コマンドパレットを開く
    | CloseCommandPalette -- コマンドパレッドを閉じる
    | OnUrlRequest Browser.UrlRequest
    | OnUrlChange Url.Url
    | LogOutRequest -- ログアウトを要求する
    | ResponseAccessTokenFromIndexedDB String
    | ResponseUserData (Result String Data.User.User) -- ユーザーの情報を受け取った
    | ChangeLanguage String -- 使用言語が変わった
    | PageMsg PageMsg
    | NoOperation


type PageMsg
    = WelcomePageMsg Page.Welcome.Msg


{-| 全体を表現する
-}
type Model
    = Model
        { project : Data.Project.Project
        , subMode : SubMode
        , page : PageModel
        , windowSize : { width : Int, height : Int }
        , msgQueue : List Msg
        , logInState : Data.User.LogInState
        , language : Data.Language.Language
        , navigationKey : Browser.Navigation.Key
        }


type SubMode
    = SubModeNone
    | SubModeCommandPalette Panel.CommandPalette.Model
    | SubModeGutter GutterType


type GutterType
    = GutterTypeVertical
    | GutterTypeHorizontal


type PageModel
    = Welcome Page.Welcome.Model


main : Platform.Program { language : String } Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = OnUrlRequest
        , onUrlChange = OnUrlChange
        }


init :
    { language : String }
    -> Url.Url
    -> Browser.Navigation.Key
    -> ( Model, Cmd Msg )
init { language } url navigationKey =
    let
        ( tokenFromUrlMaybe, page ) =
            Data.PageLocation.initFromUrl url

        ( editorPanelModel, editorGroupPanelCmd ) =
            Panel.EditorGroup.initModel

        model =
            Model
                { project = Data.Project.sample
                , subMode = SubModeNone
                , page = Welcome Page.Welcome.init
                , windowSize = { width = 0, height = 0 }
                , msgQueue = []
                , logInState =
                    case tokenFromUrlMaybe of
                        Just accessToken ->
                            Data.User.VerifyingAccessToken accessToken

                        Nothing ->
                            Data.User.ReadAccessToken
                , language = Data.Language.languageFromString language
                , navigationKey = navigationKey
                }
    in
    ( model
    , [ Browser.Navigation.replaceUrl navigationKey
            (page
                |> Maybe.withDefault Data.PageLocation.InitWelcome
                |> Data.PageLocation.initToUrlAsString
            )
      ]
        ++ (editorGroupPanelCmd
                |> List.map editorPanelCmdToCmd
           )
        ++ (case tokenFromUrlMaybe of
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

        OpenCommandPalette ->
            ( openCommandPalette (Model rec)
            , Cmd.none
            )

        CloseCommandPalette ->
            ( closeCommandPalette (Model rec)
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

        OnUrlRequest urlRequest ->
            Model rec |> onUrlRequest urlRequest

        OnUrlChange url ->
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
                            welcomeModel |> Page.Welcome.update welcomePageMsg
                    in
                    ( Model { rec | page = Welcome newWelcomeModel }
                    , cmd |> List.map welcomePageCmdToCmd |> Cmd.batch
                    )

        NoOperation ->
            ( Model rec
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
            case editorReservedKey (isOpenCommandPalette model) key of
                x :: xs ->
                    x :: xs

                [] ->
                    case isFocusDefaultUi model of
                        Just Panel.DefaultUi.MultiLineTextField ->
                            if multiLineTextFieldReservedKey key then
                                []

                            else
                                keyDownEachPanel key model

                        Just Panel.DefaultUi.SingleLineTextField ->
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


{-| Definyによって予約されたキー。どのパネルにフォーカスが当たっていてもこれを優先する
-}
editorReservedKey : Bool -> Data.Key.Key -> List Msg
editorReservedKey isOpenPalette { key, ctrl, alt, shift } =
    if isOpenPalette then
        case ( ctrl, shift, alt ) of
            ( False, False, False ) ->
                case key of
                    Data.Key.Escape ->
                        [ CloseCommandPalette ]

                    Data.Key.F1 ->
                        [ OpenCommandPalette ]

                    _ ->
                        []

            _ ->
                []

    else
        case ( ctrl, shift, alt ) of
            -- 開いているけどキー入力を無視するために必要
            ( False, False, False ) ->
                case key of
                    Data.Key.F1 ->
                        [ OpenCommandPalette ]

                    _ ->
                        []

            _ ->
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



{- -------------------------------------------------
                 各パネルのキー入力
   -------------------------------------------------
-}


{-| サイドパネルのキー入力
-}
sidePanelKeyDown : Data.Key.Key -> List Panel.Side.Msg
sidePanelKeyDown { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Data.Key.ArrowUp ->
                    [ Panel.Side.SelectUp ]

                Data.Key.ArrowDown ->
                    [ Panel.Side.SelectDown ]

                Data.Key.ArrowLeft ->
                    [ Panel.Side.SelectParentOrTreeClose ]

                Data.Key.ArrowRight ->
                    [ Panel.Side.SelectFirstChildOrTreeOpen ]

                Data.Key.Enter ->
                    [ Panel.Side.SelectItem ]

                _ ->
                    []

        _ ->
            []


{-| エディタグループパネルのキー入力
-}
editorGroupPanelKeyDown : Data.Key.Key -> List Panel.EditorGroup.Msg
editorGroupPanelKeyDown key =
    moduleEditorKeyMsg key
        |> List.map
            (Panel.EditorGroup.ModuleEditorMsg
                >> Panel.EditorGroup.EditorItemMsgToActive
            )


{-| モジュールエディタのキー入力
-}
moduleEditorKeyMsg : Data.Key.Key -> List Panel.Editor.Module.Msg
moduleEditorKeyMsg { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    [ Panel.Editor.Module.MsgActiveLeft ]

                Data.Key.ArrowRight ->
                    [ Panel.Editor.Module.MsgActiveRight ]

                Data.Key.ArrowUp ->
                    [ Panel.Editor.Module.MsgSuggestionPrevOrSelectUp ]

                Data.Key.ArrowDown ->
                    [ Panel.Editor.Module.MsgSuggestionNextOrSelectDown
                    ]

                Data.Key.Space ->
                    [ Panel.Editor.Module.MsgActiveToFirstChild ]

                Data.Key.Enter ->
                    [ Panel.Editor.Module.MsgConfirmSingleLineTextFieldOrSelectParent
                    ]

                _ ->
                    []

        ( True, False, False ) ->
            case key of
                Data.Key.ArrowLeft ->
                    [ Panel.Editor.Module.MsgActiveToLastChild ]

                Data.Key.ArrowRight ->
                    [ Panel.Editor.Module.MsgActiveToFirstChild ]

                Data.Key.Enter ->
                    [ Panel.Editor.Module.MsgConfirmMultiLineTextField ]

                _ ->
                    []

        ( False, False, True ) ->
            case key of
                Data.Key.ArrowUp ->
                    [ Panel.Editor.Module.MsgIncreaseValue ]

                Data.Key.ArrowDown ->
                    [ Panel.Editor.Module.MsgDecreaseValue ]

                _ ->
                    []

        _ ->
            []



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

        SubModeCommandPalette _ ->
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
editorPanelCmdToCmd : Panel.EditorGroup.Cmd -> Cmd Msg
editorPanelCmdToCmd cmd =
    case cmd of
        Panel.EditorGroup.CmdVerticalGutterModeOn _ ->
            Task.succeed
                (ToResizeGutterMode GutterTypeVertical)
                |> Task.perform identity

        Panel.EditorGroup.CmdHorizontalGutterModeOn _ ->
            Task.succeed
                (ToResizeGutterMode GutterTypeHorizontal)
                |> Task.perform identity

        Panel.EditorGroup.CmdSetTextAreaValue string ->
            setTextAreaValue string

        Panel.EditorGroup.CmdFocusEditTextAea ->
            focusTextArea ()

        Panel.EditorGroup.CmdElementScrollIntoView id ->
            elementScrollIntoView id

        Panel.EditorGroup.CmdFocusHere ->
            Cmd.none

        Panel.EditorGroup.CmdNone ->
            Cmd.none


{-| プロジェクトを取得する
-}
getProject : Model -> Data.Project.Project
getProject (Model { project }) =
    project


setProject : Data.Project.Project -> Model -> Model
setProject project (Model rec) =
    Model
        { rec | project = project }



{- ====== コマンドパレット ====== -}


{-| コマンドパレットを開く
-}
openCommandPalette : Model -> Model
openCommandPalette (Model rec) =
    Model
        { rec
            | subMode = SubModeCommandPalette Panel.CommandPalette.initModel
        }


closeCommandPalette : Model -> Model
closeCommandPalette (Model rec) =
    Model
        { rec
            | subMode = SubModeNone
        }


{-| コマンドパレッドの状態を取得する
-}
getCommandPaletteModel : Model -> Maybe Panel.CommandPalette.Model
getCommandPaletteModel (Model { subMode }) =
    case subMode of
        SubModeNone ->
            Nothing

        SubModeGutter _ ->
            Nothing

        SubModeCommandPalette model ->
            Just model


isOpenCommandPalette : Model -> Bool
isOpenCommandPalette (Model { subMode }) =
    case subMode of
        SubModeNone ->
            False

        SubModeGutter _ ->
            False

        SubModeCommandPalette _ ->
            True


{-| いまブラウザが入力を受け取る要素にフォーカスが当たっているかどうか。当たっていたらブラウザのデフォルト動作を邪魔しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi model =
    Nothing



{- ============ キー入力されたら、すぐpreventDefaultしないとだめなため、後で処理するmsgを入れとく =============== -}


pushMsgListToMsgQueue : List Msg -> Model -> Model
pushMsgListToMsgQueue msgList (Model rec) =
    Model
        { rec
            | msgQueue = rec.msgQueue ++ msgList
        }


shiftMsgListFromMsgQueue : Model -> ( List Msg, Model )
shiftMsgListFromMsgQueue (Model rec) =
    ( rec.msgQueue
    , Model
        { rec | msgQueue = [] }
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


onUrlRequest : Browser.UrlRequest -> Model -> ( Model, Cmd Msg )
onUrlRequest urlRequest (Model rec) =
    ( Model rec
    , case urlRequest of
        Browser.Internal url ->
            Browser.Navigation.pushUrl rec.navigationKey (Url.toString url)

        Browser.External urlString ->
            Browser.Navigation.load urlString
    )



{- ================================================================
                               View
   ================================================================
-}


{-| 見た目を定義する
-}
view : Model -> Browser.Document Msg
view (Model rec) =
    { title = "Definy"
    , body =
        [ Ui.depth
            []
            ([ Ui.Width (Ui.Flex 1), Ui.Height (Ui.Flex 1) ]
                ++ (case getGutterType (Model rec) of
                        Just gutterType ->
                            [ Ui.PointerImage (gutterTypeToCursorStyle gutterType) ]

                        Nothing ->
                            []
                   )
            )
            (case rec.page of
                Welcome welcomeModel ->
                    [ welcomeModel
                        |> Page.Welcome.view rec.logInState
                        |> Ui.map (WelcomePageMsg >> PageMsg)
                    ]
            )
            |> Ui.toHtml
        ]
            ++ (case getCommandPaletteModel (Model rec) of
                    Just commandPaletteModel ->
                        [ Panel.CommandPalette.view commandPaletteModel ]

                    Nothing ->
                        []
               )
            |> List.map Html.Styled.toUnstyled
    }


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
        Data.User.ReadAccessToken ->
            Cmd.none

        Data.User.VerifyingAccessToken accessToken ->
            Api.getUserPrivate accessToken ResponseUserData

        Data.User.GuestUser maybe ->
            Cmd.none

        Data.User.Ok user ->
            Cmd.none


responseUserData : Result String Data.User.User -> Model -> ( Model, Cmd Msg )
responseUserData result (Model rec) =
    case result of
        Ok user ->
            ( Model
                { rec
                    | logInState =
                        Data.User.Ok user
                }
            , consoleLog "ユーザー情報の取得に成功!"
            )

        Err string ->
            ( Model
                { rec | logInState = Data.User.GuestUser (Just Data.User.AccessTokenIsInvalid) }
            , consoleLog ("ユーザーの情報の取得に失敗 " ++ string)
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
         ]
            ++ (if isCaptureMouseEvent model then
                    [ subPointerUp (always PointerUp) ]

                else
                    []
               )
        )
