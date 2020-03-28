port module Main exposing (main)

import Browser
import Command
import Component.DefaultUi
import Component.EditorGroup
import Component.Header
import Component.Notifications
import Component.Style
import Css
import Data
import Data.Key
import Data.LogInState
import Dict
import Html
import Html.Styled
import Icon
import Json.Decode
import Json.Encode
import Page.CreateProject
import Page.Home
import Task
import Ui


{-| すべての状態を管理する
-}



{- Cmd (Elm → JavaScript) -}


port setTextAreaValue : { text : String, id : String } -> Cmd msg


port focusElement : String -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port elementScrollIntoView : String -> Cmd msg


port consoleLog : String -> Cmd msg


port requestLogInUrl : Json.Encode.Value -> Cmd msg


port getUserByAccessToken : Json.Encode.Value -> Cmd msg


port getImageBlobUrl : Json.Encode.Value -> Cmd msg


port createProject : Json.Encode.Value -> Cmd msg


port pushUrl : Json.Encode.Value -> Cmd msg



{- Sub (JavaScript → Elm) -}


port responseUserByAccessToken : (Json.Decode.Value -> msg) -> Sub msg


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port changeNetworkConnection : (Bool -> msg) -> Sub msg


port subPointerUp : (() -> msg) -> Sub msg


port getImageBlobResponse : ({ blobUrl : String, fileHash : String } -> msg) -> Sub msg


port urlChanged : (Json.Decode.Value -> msg) -> Sub msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Data.Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | PointerUp -- マウスのボタンを離した/タブの表示状態が変わった
    | ToResizeGutterMode GutterType -- リサイズモードに移行
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | LogOutRequest -- ログアウトを要求する
    | ChangeNetworkConnection Bool -- 接続状況が変わった
    | PageMsg PageMessage
    | NotificationMessage Component.Notifications.Message
    | RequestLogInUrl Data.OpenIdConnectProvider
    | ResponseUserDataFromAccessToken (Maybe (Maybe Data.UserPublicAndUserId))
    | ResponseGetImageBlob { blobUrl : String, fileHash : String }
    | UrlChange Data.UrlData
    | NoOperation


type PageMessage
    = PageMessageHome Page.Home.Message
    | PageMessageCreateProject Page.CreateProject.Message


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
        , imageBlobUrlDict : Dict.Dict String String
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
    = Home Page.Home.Model
    | CreateProject Page.CreateProject.Model


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
                    { clientMode = Data.ClientModeRelease
                    , location = Data.LocationHome
                    , language = Data.LanguageEnglish
                    , accessToken = Nothing
                    }

        ( notificationsInitModel, notificationsInitCommand ) =
            Component.Notifications.init

        ( notificationsModel, notificationsCommand ) =
            if flag.networkConnection then
                ( notificationsInitModel
                , Command.none
                )

            else
                Component.Notifications.update
                    (Component.Notifications.AddEvent
                        Component.Notifications.OffLine
                    )
                    notificationsInitModel

        ( pageInitModel, pageCommand ) =
            pageInit urlData.location
    in
    ( Model
        { subMode = SubModeNone
        , page = pageInitModel
        , windowSize = flag.windowSize
        , messageQueue = []
        , logInState =
            case urlData.accessToken of
                Just accessToken ->
                    Data.LogInState.VerifyingAccessToken accessToken

                Nothing ->
                    Data.LogInState.GuestUser
        , language = urlData.language
        , networkConnection = flag.networkConnection
        , notificationModel = notificationsModel
        , clientMode = urlData.clientMode
        , imageBlobUrlDict = Dict.empty
        }
    , Cmd.batch
        [ case urlData.accessToken of
            Just accessToken ->
                getUserByAccessTokenTyped accessToken

            Nothing ->
                Cmd.none
        , commandToMainCommand notificationsInitCommand
        , commandToMainCommand notificationsCommand
        , commandToMainCommand pageCommand
        ]
    )


pageInit : Data.Location -> ( PageModel, Command.Command )
pageInit location =
    case location of
        Data.LocationHome ->
            Page.Home.init
                |> Tuple.mapFirst Home

        Data.LocationCreateProject ->
            Page.CreateProject.init
                |> Tuple.mapFirst CreateProject

        Data.LocationUser userId ->
            Page.Home.init
                |> Tuple.mapFirst Home

        Data.LocationProject projectId ->
            Page.Home.init
                |> Tuple.mapFirst Home



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

        PageMsg pageMsg ->
            case ( rec.page, pageMsg ) of
                ( Home pageModel, PageMessageHome pageMessage ) ->
                    let
                        ( newPageModel, command ) =
                            pageModel |> Page.Home.update pageMessage
                    in
                    ( Model { rec | page = Home newPageModel }
                    , commandToMainCommand command
                    )

                ( CreateProject pageModel, PageMessageCreateProject pageMessage ) ->
                    let
                        ( newPageModel, command ) =
                            Page.CreateProject.update pageMessage pageModel
                    in
                    ( Model { rec | page = CreateProject newPageModel }
                    , commandToMainCommand command
                    )

                ( _, _ ) ->
                    ( Model rec
                    , Cmd.none
                    )

        NotificationMessage notificationMessage ->
            let
                ( newNotificationModel, command ) =
                    Component.Notifications.update
                        notificationMessage
                        rec.notificationModel
            in
            ( Model
                { rec | notificationModel = newNotificationModel }
            , commandToMainCommand command
            )

        ChangeNetworkConnection connection ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent
                                (if connection then
                                    Component.Notifications.OnLine

                                 else
                                    Component.Notifications.OffLine
                                )
                            )
            in
            ( Model
                { rec
                    | networkConnection = connection
                    , notificationModel = newNotificationModel
                }
            , commandToMainCommand command
            )

        RequestLogInUrl openIdConnectProvider ->
            ( Model { rec | logInState = Data.LogInState.RequestLogInUrl openIdConnectProvider }
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

        ResponseUserDataFromAccessToken maybeUserPublicAndUserId ->
            Model rec |> responseUserData maybeUserPublicAndUserId

        ResponseGetImageBlob imageBlobAndFileHash ->
            ( Model
                { rec
                    | imageBlobUrlDict =
                        rec.imageBlobUrlDict
                            |> Dict.insert
                                imageBlobAndFileHash.fileHash
                                imageBlobAndFileHash.blobUrl
                }
            , Cmd.none
            )

        UrlChange urlData ->
            ( Model rec
            , consoleLog "URL変更をElmで検知した"
            )

        NoOperation ->
            ( Model rec
            , Cmd.none
            )


pageModelToLocation : PageModel -> Data.Location
pageModelToLocation pageModel =
    case pageModel of
        Home _ ->
            Data.LocationHome

        CreateProject _ ->
            Data.LocationCreateProject


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
pointerUp model =
    ( model, Cmd.none )



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


requestLogInUrlTyped : Data.RequestLogInUrlRequestData -> Cmd Msg
requestLogInUrlTyped requestLogInUrlRequestData =
    requestLogInUrl
        (Data.requestLogInUrlRequestDataToJsonValue requestLogInUrlRequestData)


getUserByAccessTokenTyped : Data.AccessToken -> Cmd Msg
getUserByAccessTokenTyped accessToken =
    getUserByAccessToken
        (Data.accessTokenToJsonValue accessToken)


getImageBlobUrlTyped : Data.FileHash -> Cmd Msg
getImageBlobUrlTyped fileHash =
    getImageBlobUrl
        (Data.fileHashToJsonValue fileHash)


createProjectTyped : Data.CreateProjectParameter -> Cmd Msg
createProjectTyped createProjectParameter =
    createProject
        (Data.createProjectParameterToJsonValue createProjectParameter)



{- ================================================================
                               View
   ================================================================
-}


{-| 見た目を定義する
-}
view : Model -> Html.Html Msg
view (Model rec) =
    Ui.depth
        (List.concat
            [ [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
            , case getGutterType (Model rec) of
                Just gutterType ->
                    [ Ui.pointerImage (gutterTypeToCursorStyle gutterType) ]

                Nothing ->
                    []
            ]
        )
        [ ( ( Ui.Center, Ui.Center )
          , mainView (Model rec)
          )
        , ( ( Ui.End, Ui.End )
          , Component.Notifications.view rec.imageBlobUrlDict rec.notificationModel
                |> Ui.map NotificationMessage
          )
        ]
        |> Ui.toHtml
        |> Html.Styled.toUnstyled


mainView : Model -> Ui.Panel Msg
mainView (Model record) =
    case record.page of
        Home pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ Component.Header.view record.imageBlobUrlDict record.logInState
                , logInPanel record.logInState record.language record.windowSize
                , Page.Home.view
                    record.clientMode
                    record.language
                    record.logInState
                    pageModel
                    |> Ui.map (PageMessageHome >> PageMsg)
                ]

        CreateProject pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ Component.Header.view record.imageBlobUrlDict record.logInState
                , logInPanel record.logInState record.language record.windowSize
                , Page.CreateProject.view pageModel
                ]


logInPanel : Data.LogInState.LogInState -> Data.Language -> WindowSize -> Ui.Panel Msg
logInPanel logInState language windowSize =
    case logInState of
        Data.LogInState.GuestUser ->
            logInPanelLogInButton language windowSize

        Data.LogInState.RequestLogInUrl _ ->
            Ui.text
                [ Ui.height Ui.auto ]
                (Ui.TextAttributes
                    { textAlignment = Ui.TextAlignCenter
                    , text = "ログイン画面をリクエスト中……"
                    , typeface = Component.Style.fontHackName
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    }
                )

        Data.LogInState.VerifyingAccessToken _ ->
            Ui.text
                [ Ui.height Ui.auto ]
                (Ui.TextAttributes
                    { textAlignment = Ui.TextAlignCenter
                    , text = "認証中……"
                    , typeface = Component.Style.fontHackName
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    }
                )

        Data.LogInState.Ok record ->
            Ui.empty []


logInPanelLogInButton : Data.Language -> WindowSize -> Ui.Panel Msg
logInPanelLogInButton language { width, height } =
    if width < 512 then
        Ui.column
            [ Ui.height (Ui.fix (48 * 2 + 32))
            , Ui.gap 16
            ]
            [ googleLogInButton True language
            , gitHubLogInButton True language
            ]

    else
        Ui.row
            [ Ui.height (Ui.fix 64)
            , Ui.gap 16
            , Ui.padding 8
            ]
            [ googleLogInButton False language
            , gitHubLogInButton False language
            ]


googleLogInButton : Bool -> Data.Language -> Ui.Panel Msg
googleLogInButton stretch language =
    Ui.row
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 66 133 244)
        , Ui.gap 8
        , Ui.width
            (if stretch then
                Ui.stretch

             else
                Ui.fix 320
            )
        , Ui.height (Ui.fix 48)
        ]
        [ Icon.googleIcon (Css.rgb 255 255 255)
        , Ui.text
            [ Ui.height Ui.auto ]
            (Ui.TextAttributes
                { textAlignment = Ui.TextAlignStart
                , text =
                    case language of
                        Data.LanguageEnglish ->
                            "Sign in with Google"

                        Data.LanguageJapanese ->
                            "Googleでログイン"

                        Data.LanguageEsperanto ->
                            "Ensalutu kun Google"
                , typeface = Component.Style.fontHackName
                , size = 20
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button [] (RequestLogInUrl Data.OpenIdConnectProviderGoogle)


gitHubLogInButton : Bool -> Data.Language -> Ui.Panel Msg
gitHubLogInButton stretch language =
    Ui.row
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 32 32 32)
        , Ui.gap 8
        , Ui.width
            (if stretch then
                Ui.stretch

             else
                Ui.fix 320
            )
        , Ui.height (Ui.fix 48)
        ]
        [ Icon.gitHubIcon (Css.rgb 255 255 255)
        , Ui.text
            [ Ui.height Ui.auto ]
            (Ui.TextAttributes
                { textAlignment = Ui.TextAlignStart
                , text =
                    case language of
                        Data.LanguageEnglish ->
                            "Sign in with GitHub"

                        Data.LanguageJapanese ->
                            "GitHubでログイン"

                        Data.LanguageEsperanto ->
                            "Ensalutu kun GitHub"
                , typeface = Component.Style.fontHackName
                , size = 20
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button [] (RequestLogInUrl Data.OpenIdConnectProviderGitHub)


gutterTypeToCursorStyle : GutterType -> Ui.PointerImage
gutterTypeToCursorStyle gutterType =
    case gutterType of
        GutterTypeVertical ->
            Ui.HorizontalResize

        GutterTypeHorizontal ->
            Ui.VerticalResize


requestUserData : Model -> Cmd Msg
requestUserData (Model rec) =
    case rec.logInState of
        Data.LogInState.RequestLogInUrl _ ->
            Cmd.none

        Data.LogInState.VerifyingAccessToken accessToken ->
            Cmd.none

        Data.LogInState.GuestUser ->
            Cmd.none

        Data.LogInState.Ok user ->
            Cmd.none


responseUserData : Maybe (Maybe Data.UserPublicAndUserId) -> Model -> ( Model, Cmd Msg )
responseUserData result (Model rec) =
    case ( result, rec.logInState ) of
        ( Just (Just userAndUserId), Data.LogInState.VerifyingAccessToken accessToken ) ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent (Component.Notifications.LogInSuccess userAndUserId))
            in
            ( Model
                { rec
                    | logInState =
                        Data.LogInState.Ok
                            { accessToken = accessToken
                            , userId = userAndUserId.userId
                            , user = userAndUserId.userPublic
                            }
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "ユーザー情報の取得に成功!"
                , commandToMainCommand command
                ]
            )

        ( Just Nothing, Data.LogInState.VerifyingAccessToken _ ) ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent Component.Notifications.LogInFailure)
            in
            ( Model
                { rec
                    | logInState = Data.LogInState.GuestUser
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "アクセストークンが無効だった"
                , commandToMainCommand command
                ]
            )

        ( Nothing, Data.LogInState.VerifyingAccessToken _ ) ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent Component.Notifications.LogInFailure)
            in
            ( Model
                { rec
                    | logInState = Data.LogInState.GuestUser
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "ユーザーの情報のデコードに失敗"
                , commandToMainCommand command
                ]
            )

        ( _, _ ) ->
            ( Model rec
            , consoleLog "いらないときにユーザーの情報を受け取ってしまった"
            )


commandToMainCommand : Command.Command -> Cmd Msg
commandToMainCommand command =
    Cmd.batch
        (List.map commandItemToMainCommand (Command.getListCommandItem command))


commandItemToMainCommand : Command.CommandItem -> Cmd Msg
commandItemToMainCommand commandItem =
    case commandItem of
        Command.GetBlobUrl fileHash ->
            getImageBlobUrlTyped fileHash

        Command.CreateProject createProjectParameter ->
            createProjectTyped createProjectParameter

        Command.ConsoleLog string ->
            consoleLog string

        Command.PushUrl urlData ->
            pushUrl (Data.urlDataToJsonValue urlData)



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
         , changeNetworkConnection ChangeNetworkConnection
         , responseUserByAccessToken
            (\jsonValue ->
                Json.Decode.decodeValue
                    (Data.maybeJsonDecoder Data.userPublicAndUserIdJsonDecoder)
                    jsonValue
                    |> Result.toMaybe
                    |> ResponseUserDataFromAccessToken
            )
         , getImageBlobResponse ResponseGetImageBlob
         , urlChangeTyped
         ]
            ++ (if isCaptureMouseEvent model then
                    [ subPointerUp (always PointerUp) ]

                else
                    []
               )
        )


urlChangeTyped : Sub Msg
urlChangeTyped =
    urlChanged
        (\jsonValue ->
            case Json.Decode.decodeValue Data.urlDataJsonDecoder jsonValue of
                Ok urlData ->
                    UrlChange urlData

                Err _ ->
                    NoOperation
        )
