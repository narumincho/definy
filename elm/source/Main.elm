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
import Html
import Html.Styled
import Icon
import ImageStore
import Json.Decode
import Json.Encode
import Page.CreateIdea
import Page.CreateProject
import Page.Home
import Page.Idea
import Page.Project
import Page.User
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


port pushUrl : Json.Encode.Value -> Cmd msg


port createProject : Json.Encode.Value -> Cmd msg


port toValidProjectName : String -> Cmd msg


port getAllProjectIdList : () -> Cmd msg


port getProject : Json.Decode.Value -> Cmd msg


port getProjectForceNotUseCache : Json.Decode.Value -> Cmd msg



{- Sub (JavaScript → Elm) -}


port responseUserByAccessToken : (Json.Decode.Value -> msg) -> Sub msg


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port changeNetworkConnection : (Bool -> msg) -> Sub msg


port subPointerUp : (() -> msg) -> Sub msg


port getImageBlobResponse : ({ blobUrl : String, fileHash : String } -> msg) -> Sub msg


port urlChanged : (Json.Decode.Value -> msg) -> Sub msg


port toValidProjectNameResponse : ({ input : String, result : Maybe String } -> msg) -> Sub msg


port createProjectResponse : (Json.Decode.Value -> msg) -> Sub msg


port responseAllProjectId : (Json.Decode.Value -> msg) -> Sub msg


port responseProject : (Json.Decode.Value -> msg) -> Sub msg


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
    | ResponseUserDataFromAccessToken (Maybe (Maybe Data.UserSnapshotAndId))
    | ResponseGetImageBlob { blobUrl : String, fileHash : Data.FileHash }
    | UrlChange Data.UrlData
    | CreateProjectResponse (Maybe Data.ProjectSnapshotAndId)
    | NoOperation
    | GetAllProjectResponse (List Data.ProjectId)
    | GetProjectResponse Data.ProjectSnapshotMaybeAndId


type PageMessage
    = PageMessageHome Page.Home.Message
    | PageMessageCreateProject Page.CreateProject.Message
    | PageMessageCreateIdea Page.CreateIdea.Message
    | PageMessageProject Page.Project.Message
    | PageMessageUser Page.User.Message
    | PageMessageIdea Page.Idea.Message


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
        , imageStore : ImageStore.ImageStore
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
    | CreateIdea Page.CreateIdea.Model
    | Project Page.Project.Model
    | User Page.User.Model
    | Idea Page.Idea.Model


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
                , Command.None
                )

            else
                Component.Notifications.update
                    (Component.Notifications.AddEvent
                        Component.Notifications.OffLine
                    )
                    notificationsInitModel

        ( pageInitModel, pageCommand ) =
            pageInit urlData.location

        logInState =
            case urlData.accessToken of
                Just accessToken ->
                    Data.LogInState.VerifyingAccessToken accessToken

                Nothing ->
                    Data.LogInState.GuestUser
    in
    ( Model
        { subMode = SubModeNone
        , page = pageInitModel
        , windowSize = flag.windowSize
        , messageQueue = []
        , logInState = logInState
        , language = urlData.language
        , networkConnection = flag.networkConnection
        , notificationModel = notificationsModel
        , clientMode = urlData.clientMode
        , imageStore = ImageStore.empty
        }
    , Cmd.batch
        [ case urlData.accessToken of
            Just accessToken ->
                getUserByAccessTokenTyped accessToken

            Nothing ->
                Cmd.none
        , commandToMainCommand logInState notificationsInitCommand
        , commandToMainCommand logInState notificationsCommand
        , commandToMainCommand logInState pageCommand
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

        Data.LocationCreateIdea projectId ->
            Page.CreateIdea.init projectId
                |> Tuple.mapFirst CreateIdea

        Data.LocationUser userId ->
            Page.User.init userId
                |> Tuple.mapFirst User

        Data.LocationProject projectId ->
            Page.Project.init projectId
                |> Tuple.mapFirst Project

        Data.LocationIdea ideaId ->
            Page.Idea.init ideaId
                |> Tuple.mapFirst Idea



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
            let
                ( newPageModel, command ) =
                    updatePage pageMsg (Model rec)
            in
            ( Model { rec | page = newPageModel }
            , commandToMainCommand rec.logInState command
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
            , commandToMainCommand rec.logInState command
            )

        ChangeNetworkConnection connection ->
            notificationAddEvent
                (if connection then
                    Component.Notifications.OnLine

                 else
                    Component.Notifications.OffLine
                )
                (Model rec)
                |> Tuple.mapFirst
                    (\(Model r) ->
                        Model { r | networkConnection = connection }
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
                    | imageStore =
                        ImageStore.add
                            imageBlobAndFileHash.fileHash
                            imageBlobAndFileHash.blobUrl
                            rec.imageStore
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

        CreateProjectResponse projectAndIdMaybe ->
            let
                ( newPageModel, command ) =
                    pageInit Data.LocationHome
            in
            notificationAddEvent
                (case projectAndIdMaybe of
                    Just projectAndId ->
                        Component.Notifications.CreatedProject projectAndId

                    Nothing ->
                        Component.Notifications.CreateProjectFailed
                )
                (Model rec)
                |> Tuple.mapBoth
                    (\(Model model) -> Model { model | page = newPageModel })
                    (\cmd -> Cmd.batch [ cmd, commandToMainCommand rec.logInState command ])

        GetAllProjectResponse projectIdList ->
            case rec.page of
                Home pageModel ->
                    let
                        ( newPageModel, command ) =
                            Page.Home.update (Page.Home.ResponseAllProjectId projectIdList) pageModel
                    in
                    ( Model { rec | page = Home newPageModel }
                    , commandToMainCommand rec.logInState command
                    )

                _ ->
                    ( Model rec
                    , Cmd.none
                    )

        GetProjectResponse projectCacheWithId ->
            case rec.page of
                Home pageModel ->
                    let
                        ( newPageModel, command ) =
                            Page.Home.update (Page.Home.ResponseProject projectCacheWithId) pageModel
                    in
                    ( Model { rec | page = Home newPageModel }
                    , commandToMainCommand rec.logInState command
                    )

                Project pageModel ->
                    let
                        ( newPageModel, command ) =
                            Page.Project.update (Page.Project.ProjectResponse projectCacheWithId) pageModel
                    in
                    ( Model { rec | page = Project newPageModel }
                    , commandToMainCommand rec.logInState command
                    )

                _ ->
                    ( Model rec
                    , Cmd.none
                    )


updatePage : PageMessage -> Model -> ( PageModel, Command.Command )
updatePage pageMessage (Model record) =
    case ( record.page, pageMessage ) of
        ( Home model, PageMessageHome message ) ->
            Page.Home.update message model
                |> Tuple.mapFirst Home

        ( CreateProject model, PageMessageCreateProject message ) ->
            Page.CreateProject.update message model
                |> Tuple.mapFirst CreateProject

        ( CreateIdea model, PageMessageCreateIdea message ) ->
            Page.CreateIdea.update message model
                |> Tuple.mapFirst CreateIdea

        ( Project model, PageMessageProject message ) ->
            Page.Project.update message model
                |> Tuple.mapFirst Project

        ( User model, PageMessageUser message ) ->
            Page.User.update message model
                |> Tuple.mapFirst User

        ( Idea model, PageMessageIdea message ) ->
            Page.Idea.update message model
                |> Tuple.mapFirst Idea

        ( _, _ ) ->
            ( record.page
            , Command.None
            )


notificationAddEvent : Component.Notifications.Event -> Model -> ( Model, Cmd Msg )
notificationAddEvent event (Model record) =
    let
        ( newNotificationModel, command ) =
            record.notificationModel
                |> Component.Notifications.update
                    (Component.Notifications.AddEvent event)
    in
    ( Model
        { record
            | notificationModel = newNotificationModel
        }
    , commandToMainCommand record.logInState command
    )


pageModelToLocation : PageModel -> Data.Location
pageModelToLocation pageModel =
    case pageModel of
        Home _ ->
            Data.LocationHome

        CreateProject _ ->
            Data.LocationCreateProject

        CreateIdea model ->
            Data.LocationCreateIdea (Page.CreateIdea.getProjectId model)

        Project model ->
            Data.LocationProject (Page.Project.getProjectId model)

        User model ->
            Data.LocationUser (Page.User.getUserId model)

        Idea model ->
            Data.LocationIdea (Page.Idea.getIdeaId model)


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
          , Component.Notifications.view rec.imageStore rec.notificationModel
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
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.Home.view
                    record.clientMode
                    record.language
                    record.logInState
                    record.imageStore
                    pageModel
                    |> Ui.map (PageMessageHome >> PageMsg)
                ]

        CreateProject pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.CreateProject.view record.language record.logInState pageModel
                    |> Ui.map (PageMessageCreateProject >> PageMsg)
                ]

        CreateIdea pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.CreateIdea.view pageModel
                    |> Ui.map (PageMessageCreateIdea >> PageMsg)
                ]

        Project pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.Project.view
                    record.imageStore
                    pageModel
                    |> Ui.map (PageMessageProject >> PageMsg)
                ]

        User pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.User.view
                    pageModel
                    |> Ui.map (PageMessageUser >> PageMsg)
                ]

        Idea pageModel ->
            Ui.column
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                [ headerView (Model record)
                , logInPanel record.logInState record.language record.windowSize
                , Page.Idea.view
                    pageModel
                    |> Ui.map (PageMessageIdea >> PageMsg)
                ]


headerView : Model -> Ui.Panel Msg
headerView (Model record) =
    Component.Header.view
        record.clientMode
        record.language
        record.imageStore
        record.logInState
        |> Ui.map (headerMessageToMsg record.clientMode record.language)


headerMessageToMsg : Data.ClientMode -> Data.Language -> Component.Header.Message -> Msg
headerMessageToMsg clientMode language message =
    case message of
        Component.Header.ToHome ->
            UrlChange
                { clientMode = clientMode
                , language = language
                , location = Data.LocationHome
                , accessToken = Nothing
                }

        Component.Header.NoOperation ->
            NoOperation


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


responseUserData : Maybe (Maybe Data.UserSnapshotAndId) -> Model -> ( Model, Cmd Msg )
responseUserData result (Model rec) =
    case ( result, rec.logInState ) of
        ( Just (Just userSnapshotAndId), Data.LogInState.VerifyingAccessToken accessToken ) ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent (Component.Notifications.LogInSuccess userSnapshotAndId))
            in
            ( Model
                { rec
                    | logInState =
                        Data.LogInState.Ok
                            { accessToken = accessToken
                            , userSnapshotAndId = userSnapshotAndId
                            }
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "ユーザー情報の取得に成功!"
                , commandToMainCommand rec.logInState command
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
                , commandToMainCommand rec.logInState command
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
                , commandToMainCommand rec.logInState command
                ]
            )

        ( _, _ ) ->
            ( Model rec
            , consoleLog "いらないときにユーザーの情報を受け取ってしまった"
            )


commandToMainCommand : Data.LogInState.LogInState -> Command.Command -> Cmd Msg
commandToMainCommand logInState command =
    case command of
        Command.None ->
            Cmd.none

        Command.GetBlobUrl fileHash ->
            getImageBlobUrlTyped fileHash

        Command.CreateProject projectName ->
            case logInState of
                Data.LogInState.Ok { accessToken } ->
                    createProjectTyped
                        { projectName = projectName
                        , accessToken = accessToken
                        }

                _ ->
                    Cmd.none

        Command.ConsoleLog string ->
            consoleLog string

        Command.PushUrl urlData ->
            pushUrl (Data.urlDataToJsonValue urlData)

        Command.ToValidProjectName string ->
            toValidProjectName string

        Command.GetAllProjectId ->
            getAllProjectIdList ()

        Command.GetProject projectId ->
            getProject (Data.projectIdToJsonValue projectId)

        Command.Batch commandList ->
            Cmd.batch (List.map (commandToMainCommand logInState) commandList)



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
                    (Data.maybeJsonDecoder Data.userSnapshotAndIdJsonDecoder)
                    jsonValue
                    |> Result.toMaybe
                    |> ResponseUserDataFromAccessToken
            )
         , getImageBlobResponse
            (\{ blobUrl, fileHash } ->
                ResponseGetImageBlob
                    { blobUrl = blobUrl
                    , fileHash = Data.FileHash fileHash
                    }
            )
         , urlChangeTyped
         , toValidProjectNameResponse
            (\response ->
                PageMsg
                    (PageMessageCreateProject
                        (Page.CreateProject.ToValidProjectNameResponse response)
                    )
            )
         , createProjectResponseSubscription
         , getProjectResponseSubscription
         , getAllProjectIdResponseSubscription
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


createProjectResponseSubscription : Sub Msg
createProjectResponseSubscription =
    createProjectResponse
        (\jsonValue ->
            case
                Json.Decode.decodeValue
                    (Data.maybeJsonDecoder
                        Data.projectSnapshotAndIdJsonDecoder
                    )
                    jsonValue
            of
                Ok projectAndIdMaybe ->
                    CreateProjectResponse projectAndIdMaybe

                Err _ ->
                    NoOperation
        )


getAllProjectIdResponseSubscription : Sub Msg
getAllProjectIdResponseSubscription =
    responseAllProjectId
        (\jsonValue ->
            case
                Json.Decode.decodeValue
                    (Json.Decode.list
                        Data.projectIdJsonDecoder
                    )
                    jsonValue
            of
                Ok projectIdList ->
                    GetAllProjectResponse projectIdList

                Err _ ->
                    NoOperation
        )


getProjectResponseSubscription : Sub Msg
getProjectResponseSubscription =
    responseProject
        (\jsonValue ->
            case
                Json.Decode.decodeValue
                    Data.projectSnapshotMaybeAndIdJsonDecoder
                    jsonValue
            of
                Ok projectWithIdAndRespondTimeMaybe ->
                    GetProjectResponse projectWithIdAndRespondTimeMaybe

                Err _ ->
                    NoOperation
        )
