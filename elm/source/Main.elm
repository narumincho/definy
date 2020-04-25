port module Main exposing (main)

import Browser
import Browser.Navigation
import CommonUi
import Component.Header
import Component.Notifications
import Css
import Data
import Data.Key
import Data.LogInState
import Data.TimeZoneAndName
import Data.UrlData
import Html.Styled
import Json.Decode
import Json.Encode
import Message
import Page.CreateIdea
import Page.CreateProject
import Page.Home
import Page.Idea
import Page.Project
import Page.Suggestion
import Page.User
import Task
import Time
import Ui
import Url


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


port createIdea : Json.Encode.Value -> Cmd msg


port addComment : Json.Encode.Value -> Cmd msg


port addSuggestion : Json.Encode.Value -> Cmd msg


port toValidProjectName : String -> Cmd msg


port toValidIdeaName : String -> Cmd msg


port getUser : Json.Decode.Value -> Cmd msg


port getUserNoCache : Json.Decode.Value -> Cmd msg


port getAllProjectIdList : () -> Cmd msg


port getProject : Json.Decode.Value -> Cmd msg


port getProjectNoCache : Json.Decode.Value -> Cmd msg


port getIdeaAndIdListByProjectId : Json.Decode.Value -> Cmd msg


port getIdea : Json.Decode.Value -> Cmd msg


port getIdeaNoCache : Json.Decode.Value -> Cmd msg


port getSuggestion : Json.Decode.Value -> Cmd msg


port getSuggestionNoCache : Json.Decode.Value -> Cmd msg



{- Sub (JavaScript → Elm) -}


port responseUserByAccessToken : (Json.Decode.Value -> msg) -> Sub msg


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port changeNetworkConnection : (Bool -> msg) -> Sub msg


port subPointerUp : (() -> msg) -> Sub msg


port getImageBlobResponse : ({ blobUrl : String, fileHash : String } -> msg) -> Sub msg


port toValidProjectNameResponse : ({ input : String, result : Maybe String } -> msg) -> Sub msg


port toValidIdeaNameResponse : ({ input : String, result : Maybe String } -> msg) -> Sub msg


port createProjectResponse : (Json.Decode.Value -> msg) -> Sub msg


port responseCreateIdea : (Json.Decode.Value -> msg) -> Sub msg


port responseAddComment : (Json.Decode.Value -> msg) -> Sub msg


port responseAddSuggestion : (Json.Decode.Value -> msg) -> Sub msg


port responseAllProjectId : (Json.Decode.Value -> msg) -> Sub msg


port responseProject : (Json.Decode.Value -> msg) -> Sub msg


port responseUser : (Json.Decode.Value -> msg) -> Sub msg


port responseIdeaSnapshotAndIdListByProjectId : (Json.Decode.Value -> msg) -> Sub msg


port responseIdea : (Json.Decode.Value -> msg) -> Sub msg


port responseSuggestion : (Json.Decode.Value -> msg) -> Sub msg


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
    | UpdateTime Time.Posix -- 時間が過ぎた
    | PageMsg PageMessage -- ページ固有のメッセージ
    | NotificationMessage Component.Notifications.Message
    | RequestLogInUrl Data.OpenIdConnectProvider
    | ResponseUserDataFromAccessToken (Maybe Data.UserSnapshotAndId)
    | ResponseImageBlob { blobUrl : String, fileHash : Data.FileHash }
    | ResponseUser Data.UserResponse
    | OnUrlRequest Browser.UrlRequest
    | OnUrlChange Url.Url
    | ResponseTimeZone Data.TimeZoneAndName.TimeZoneAndName
    | CreateProjectResponse (Maybe Data.ProjectSnapshotAndId)
    | CreateIdeaResponse (Maybe Data.IdeaSnapshotAndId)
    | NoOperation
    | CommonMessage Message.CommonMessage


type PageMessage
    = PageMessageHome Page.Home.Message
    | PageMessageCreateProject Page.CreateProject.Message
    | PageMessageCreateIdea Page.CreateIdea.Message
    | PageMessageProject Page.Project.Message
    | PageMessageUser Page.User.Message
    | PageMessageIdea Page.Idea.Message
    | PageMessageSuggestion Page.Suggestion.Message


{-| 全体を表現する
-}
type Model
    = Model
        { subMode : SubMode
        , page : PageModel
        , messageQueue : List Msg
        , subModel : Message.SubModel
        , networkConnection : Bool
        , notificationModel : Component.Notifications.Model
        , navigationKey : Browser.Navigation.Key
        }


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
    | Suggestion Page.Suggestion.Model


type alias Flag =
    { windowSize :
        { width : Int
        , height : Int
        }
    , nowTime : Data.Time
    , accessTokenMaybe : Maybe String
    , networkConnection : Bool
    }


main : Platform.Program Flag Model Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = OnUrlRequest
        , onUrlChange = OnUrlChange
        }


init : Flag -> Url.Url -> Browser.Navigation.Key -> ( Model, Cmd Msg )
init flag url navigationKey =
    let
        urlData : Data.UrlData
        urlData =
            Data.UrlData.urlDataFromUrl url

        ( notificationsInitModel, notificationsInitCommand ) =
            Component.Notifications.init

        ( notificationsModel, notificationsCommand ) =
            if flag.networkConnection then
                ( notificationsInitModel
                , Message.None
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
            case flag.accessTokenMaybe of
                Just accessToken ->
                    Data.LogInState.VerifyingAccessToken (Data.AccessToken accessToken)

                Nothing ->
                    Data.LogInState.GuestUser
    in
    ( Model
        { subMode = SubModeNone
        , page = pageInitModel
        , messageQueue = []
        , subModel =
            Message.from
                { logInState = logInState
                , language = urlData.language
                , clientMode = urlData.clientMode
                , timeZoneAndNameMaybe = Nothing
                , nowTime = Data.TimeZoneAndName.timeToPosix flag.nowTime
                , windowSize = flag.windowSize
                }
        , networkConnection = flag.networkConnection
        , notificationModel = notificationsModel
        , navigationKey = navigationKey
        }
    , Cmd.batch
        [ case flag.accessTokenMaybe of
            Just accessToken ->
                getUserByAccessTokenTyped (Data.AccessToken accessToken)

            Nothing ->
                Cmd.none
        , commandToMainCommand logInState notificationsInitCommand
        , commandToMainCommand logInState notificationsCommand
        , commandToMainCommand logInState pageCommand
        , Browser.Navigation.replaceUrl navigationKey (Url.toString (Data.UrlData.urlDataToUrl urlData))
        , Task.perform
            ResponseTimeZone
            (Task.map2 Data.TimeZoneAndName.from Time.getZoneName Time.here)
        ]
    )


pageInit : Data.Location -> ( PageModel, Message.Command )
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

        Data.LocationSuggestion suggestionId ->
            Page.Suggestion.init suggestionId
                |> Tuple.mapFirst Suggestion



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
            ( Model rec, Cmd.none )

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
            ( Model
                { rec | subModel = Message.setWindowSize { width = width, height = height } rec.subModel }
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
            , commandToMainCommand (Message.getLogInState rec.subModel) command
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
            , commandToMainCommand (Message.getLogInState rec.subModel) command
            )

        ChangeNetworkConnection connection ->
            let
                ( newNotificationModel, command ) =
                    notificationAddEvent
                        (if connection then
                            Component.Notifications.OnLine

                         else
                            Component.Notifications.OffLine
                        )
                        (Model rec)
            in
            ( Model
                { rec
                    | notificationModel = newNotificationModel
                    , networkConnection = False
                }
            , commandToMainCommand (Message.getLogInState rec.subModel) command
            )

        RequestLogInUrl openIdConnectProvider ->
            ( Model
                { rec
                    | subModel =
                        Message.setLogInState
                            (Data.LogInState.RequestLogInUrl openIdConnectProvider)
                            rec.subModel
                }
            , requestLogInUrlTyped
                { openIdConnectProvider = openIdConnectProvider
                , urlData =
                    { clientMode = Message.getClientMode rec.subModel
                    , location = pageModelToLocation rec.page
                    , language = Message.getLanguage rec.subModel
                    }
                }
            )

        ResponseUserDataFromAccessToken userSnapshotAndIdMaybe ->
            Model rec |> responseUserDataFromAccessToken userSnapshotAndIdMaybe

        ResponseImageBlob imageBlobAndFileHash ->
            ( Model
                { rec
                    | subModel =
                        Message.addImageBlobUrl
                            imageBlobAndFileHash.fileHash
                            imageBlobAndFileHash.blobUrl
                            rec.subModel
                }
            , Cmd.none
            )

        ResponseUser userResponse ->
            ( Model
                { rec
                    | subModel =
                        Message.addUserSnapshot
                            userResponse.snapshotMaybe
                            userResponse.id
                            rec.subModel
                }
            , commandToMainCommand
                (Message.getLogInState rec.subModel)
                (case userResponse.snapshotMaybe of
                    Just userSnapshot ->
                        Message.GetBlobUrl userSnapshot.imageHash

                    Nothing ->
                        Message.None
                )
            )

        OnUrlChange url ->
            let
                urlData =
                    Data.UrlData.urlDataFromUrl url

                ( newPage, command ) =
                    pageInit urlData.location
            in
            ( Model
                { rec
                    | page = newPage
                    , subModel =
                        Message.setLanguageAndClientMode
                            urlData.language
                            urlData.clientMode
                            rec.subModel
                }
            , commandToMainCommand (Message.getLogInState rec.subModel) command
            )

        OnUrlRequest urlRequest ->
            case urlRequest of
                Browser.Internal url ->
                    ( Model rec
                    , Browser.Navigation.pushUrl
                        rec.navigationKey
                        (Url.toString
                            (Data.UrlData.urlDataToUrl
                                (Data.UrlData.urlDataFromUrl url)
                            )
                        )
                    )

                Browser.External link ->
                    ( Model rec
                    , Browser.Navigation.pushUrl rec.navigationKey link
                    )

        ResponseTimeZone timeZoneAndName ->
            ( Model { rec | subModel = Message.setTimeZoneAndName timeZoneAndName rec.subModel }
            , Cmd.none
            )

        NoOperation ->
            ( Model rec
            , Cmd.none
            )

        CreateProjectResponse projectAndIdMaybe ->
            let
                ( newPageModel, pageCommand ) =
                    pageInit Data.LocationHome

                ( newNotificationModel, notificationCommand ) =
                    notificationAddEvent
                        (case projectAndIdMaybe of
                            Just projectAndId ->
                                Component.Notifications.CreatedProject projectAndId

                            Nothing ->
                                Component.Notifications.CreateProjectFailed
                        )
                        (Model rec)
            in
            ( Model
                { rec
                    | page = newPageModel
                    , notificationModel = newNotificationModel
                }
            , commandToMainCommand
                (Message.getLogInState rec.subModel)
                (Message.Batch
                    [ pageCommand, notificationCommand ]
                )
            )

        CreateIdeaResponse ideaSnapshotAndIdMaybe ->
            case ideaSnapshotAndIdMaybe of
                Just ideaSnapshotAndId ->
                    let
                        ( newPageModel, command ) =
                            pageInit (Data.LocationIdea ideaSnapshotAndId.id)
                    in
                    ( Model { rec | page = newPageModel }
                    , commandToMainCommand (Message.getLogInState rec.subModel) command
                    )

                Nothing ->
                    ( Model rec
                    , Cmd.none
                    )

        UpdateTime timePosix ->
            commonMessageUpdate
                Message.UpdateTime
                (Model { rec | subModel = Message.setNowTime timePosix rec.subModel })

        CommonMessage commonMessage ->
            commonMessageUpdate commonMessage (Model rec)


mapPageModel : ( pageModel, Message.Command ) -> (pageModel -> PageModel) -> Model -> ( Model, Cmd Msg )
mapPageModel ( newPageModel, command ) pageModelFunction (Model record) =
    ( Model { record | page = pageModelFunction newPageModel }
    , commandToMainCommand (Message.getLogInState record.subModel) command
    )


updatePage : PageMessage -> Model -> ( PageModel, Message.Command )
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
            , Message.None
            )


notificationAddEvent :
    Component.Notifications.Event
    -> Model
    -> ( Component.Notifications.Model, Message.Command )
notificationAddEvent event (Model record) =
    record.notificationModel
        |> Component.Notifications.update
            (Component.Notifications.AddEvent event)


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

        Suggestion model ->
            Data.LocationSuggestion (Page.Suggestion.getSuggestionId model)


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


commonMessageUpdate : Message.CommonMessage -> Model -> ( Model, Cmd Msg )
commonMessageUpdate commonMessage (Model record) =
    case record.page of
        Home pageModel ->
            mapPageModel
                (Page.Home.updateByCommonMessage commonMessage pageModel)
                Home
                (Model record)

        Project pageModel ->
            mapPageModel
                (Page.Project.updateByCommonMessage commonMessage pageModel)
                Project
                (Model record)

        User pageModel ->
            mapPageModel
                (Page.User.updateByCommonMessage commonMessage pageModel)
                User
                (Model record)

        Idea pageModel ->
            mapPageModel
                (Page.Idea.updateByCommonMessage record.subModel commonMessage pageModel)
                Idea
                (Model record)

        Suggestion pageModel ->
            mapPageModel
                (Page.Suggestion.updateByCommonMessage commonMessage pageModel)
                Suggestion
                (Model record)

        _ ->
            ( Model record
            , Cmd.none
            )



{- =================================================
                       キー入力
   =================================================
-}
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


createIdeaTyped : Data.CreateIdeaParameter -> Cmd Msg
createIdeaTyped createIdeaParameter =
    createIdea
        (Data.createIdeaParameterToJsonValue createIdeaParameter)



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
            Ui.stretch
            Ui.stretch
            (case getGutterType (Model rec) of
                Just gutterType ->
                    [ Ui.pointerImage (gutterTypeToCursorStyle gutterType) ]

                Nothing ->
                    []
            )
            [ ( ( Ui.Center, Ui.Center )
              , mainView (Model rec)
              )
            , ( ( Ui.End, Ui.End )
              , Component.Notifications.view rec.subModel rec.notificationModel
                    |> Ui.map NotificationMessage
              )
            ]
            |> Ui.toHtml
            |> Html.Styled.toUnstyled
        ]
    }


mainView : Model -> Ui.Panel Msg
mainView (Model record) =
    Ui.column
        Ui.stretch
        Ui.stretch
        []
        (case Message.getLogInState record.subModel of
            Data.LogInState.GuestUser ->
                [ Component.Header.view record.subModel
                , logInPanelLogInButton
                    (Message.getLanguage record.subModel)
                    (Message.getWindowSize record.subModel)
                , mainContentView (Model record)
                ]

            Data.LogInState.RequestLogInUrl _ ->
                [ Component.Header.view record.subModel
                , Ui.depth
                    Ui.stretch
                    Ui.stretch
                    []
                    [ ( ( Ui.Center, Ui.Center )
                      , CommonUi.normalText 16 "ログイン画面をリクエスト中……"
                      )
                    ]
                ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ Component.Header.view record.subModel
                , CommonUi.normalText 16 "認証中……"
                , mainContentView (Model record)
                ]

            Data.LogInState.Ok _ ->
                [ Component.Header.view record.subModel
                , mainContentView (Model record)
                ]
        )


mainContentView : Model -> Ui.Panel Msg
mainContentView (Model record) =
    Ui.scroll Ui.stretch
        Ui.stretch
        []
        (case record.page of
            Home pageModel ->
                Page.Home.view record.subModel pageModel
                    |> Ui.map (PageMessageHome >> PageMsg)

            CreateProject pageModel ->
                Page.CreateProject.view record.subModel pageModel
                    |> Ui.map (PageMessageCreateProject >> PageMsg)

            CreateIdea pageModel ->
                Page.CreateIdea.view record.subModel pageModel
                    |> Ui.map (PageMessageCreateIdea >> PageMsg)

            Project pageModel ->
                Page.Project.view record.subModel pageModel
                    |> Ui.map (PageMessageProject >> PageMsg)

            User pageModel ->
                Page.User.view record.subModel pageModel
                    |> Ui.map (PageMessageUser >> PageMsg)

            Idea pageModel ->
                Page.Idea.view
                    record.subModel
                    pageModel
                    |> Ui.map (PageMessageIdea >> PageMsg)

            Suggestion pageModel ->
                Page.Suggestion.view
                    record.subModel
                    pageModel
                    |> Ui.map (PageMessageSuggestion >> PageMsg)
        )


logInPanelLogInButton : Data.Language -> Message.WindowSize -> Ui.Panel Msg
logInPanelLogInButton language { width, height } =
    if width < 512 then
        Ui.column
            (Ui.fix (48 * 2 + 32))
            Ui.auto
            [ Ui.gap 16 ]
            [ googleLogInButton True language
            , gitHubLogInButton True language
            ]

    else
        Ui.row
            Ui.auto
            (Ui.fix 64)
            [ Ui.gap 16
            , Ui.padding 8
            ]
            [ googleLogInButton False language
            , gitHubLogInButton False language
            ]


googleLogInButton : Bool -> Data.Language -> Ui.Panel Msg
googleLogInButton stretch language =
    Ui.row
        (if stretch then
            Ui.stretch

         else
            Ui.fix 320
        )
        (Ui.fix 48)
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 66 133 244)
        , Ui.gap 8
        ]
        [ CommonUi.googleIcon (Css.rgb 255 255 255)
        , Ui.text
            Ui.stretch
            Ui.auto
            []
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
                , typeface = CommonUi.normalTypeface
                , lineHeight = 1
                , size = 20
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button Ui.auto Ui.auto [] (RequestLogInUrl Data.OpenIdConnectProviderGoogle)


gitHubLogInButton : Bool -> Data.Language -> Ui.Panel Msg
gitHubLogInButton stretch language =
    Ui.row
        (if stretch then
            Ui.stretch

         else
            Ui.fix 320
        )
        (Ui.fix 48)
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 32 32 32)
        , Ui.gap 8
        ]
        [ CommonUi.gitHubIcon (Css.rgb 255 255 255)
        , Ui.text
            Ui.stretch
            Ui.auto
            []
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
                , typeface = CommonUi.normalTypeface
                , size = 20
                , lineHeight = 1
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button Ui.auto Ui.auto [] (RequestLogInUrl Data.OpenIdConnectProviderGitHub)


gutterTypeToCursorStyle : GutterType -> Ui.PointerImage
gutterTypeToCursorStyle gutterType =
    case gutterType of
        GutterTypeVertical ->
            Ui.HorizontalResize

        GutterTypeHorizontal ->
            Ui.VerticalResize


responseUserDataFromAccessToken : Maybe Data.UserSnapshotAndId -> Model -> ( Model, Cmd Msg )
responseUserDataFromAccessToken userSnapshotAndIdMaybe (Model rec) =
    case ( userSnapshotAndIdMaybe, Message.getLogInState rec.subModel ) of
        ( Just userSnapshotAndId, Data.LogInState.VerifyingAccessToken accessToken ) ->
            let
                ( newNotificationModel, command ) =
                    rec.notificationModel
                        |> Component.Notifications.update
                            (Component.Notifications.AddEvent (Component.Notifications.LogInSuccess userSnapshotAndId))
            in
            ( Model
                { rec
                    | subModel =
                        Message.setLogInState
                            (Data.LogInState.Ok
                                { accessToken = accessToken
                                , userSnapshotAndId = userSnapshotAndId
                                }
                            )
                            rec.subModel
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "ユーザー情報の取得に成功!"
                , commandToMainCommand (Message.getLogInState rec.subModel) command
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
                    | subModel = Message.setLogInState Data.LogInState.GuestUser rec.subModel
                    , notificationModel = newNotificationModel
                }
            , Cmd.batch
                [ consoleLog "アクセストークンが無効だった"
                , commandToMainCommand (Message.getLogInState rec.subModel) command
                ]
            )

        ( _, _ ) ->
            ( Model rec
            , consoleLog "いらないときにユーザーの情報を受け取ってしまった"
            )


commandToMainCommand : Data.LogInState.LogInState -> Message.Command -> Cmd Msg
commandToMainCommand logInState command =
    case command of
        Message.None ->
            Cmd.none

        Message.GetBlobUrl fileHash ->
            getImageBlobUrlTyped fileHash

        Message.CreateProject projectName ->
            case logInState of
                Data.LogInState.Ok { accessToken } ->
                    createProjectTyped
                        { projectName = projectName
                        , accessToken = accessToken
                        }

                _ ->
                    Cmd.none

        Message.CreateIdea projectIdAndIdeaName ->
            case logInState of
                Data.LogInState.Ok { accessToken } ->
                    createIdeaTyped
                        { accessToken = accessToken, ideaName = projectIdAndIdeaName.ideaName, projectId = projectIdAndIdeaName.projectId }

                _ ->
                    Cmd.none

        Message.AddComment ideaIdAndComment ->
            case logInState of
                Data.LogInState.Ok { accessToken } ->
                    addComment
                        (Data.addCommentParameterToJsonValue
                            { ideaId = ideaIdAndComment.ideaId
                            , comment = ideaIdAndComment.comment
                            , accessToken = accessToken
                            }
                        )

                _ ->
                    Cmd.none

        Message.AddSuggestion ideaId ->
            case logInState of
                Data.LogInState.Ok { accessToken } ->
                    addSuggestion
                        (Data.addSuggestionParameterToJsonValue
                            { ideaId = ideaId
                            , accessToken = accessToken
                            }
                        )

                _ ->
                    Cmd.none

        Message.ConsoleLog string ->
            consoleLog string

        Message.PushUrl urlData ->
            Task.perform
                identity
                (Task.succeed (OnUrlRequest (Browser.Internal (Data.UrlData.urlDataToUrl urlData))))

        Message.ToValidProjectName string ->
            toValidProjectName string

        Message.ToValidIdeaName string ->
            toValidIdeaName string

        Message.GetUser userId ->
            getUser (Data.userIdToJsonValue userId)

        Message.GetUserNoCache userId ->
            getUserNoCache (Data.userIdToJsonValue userId)

        Message.GetAllProjectId ->
            getAllProjectIdList ()

        Message.GetProject projectId ->
            getProject (Data.projectIdToJsonValue projectId)

        Message.GetProjectNoCache projectId ->
            getProjectNoCache (Data.projectIdToJsonValue projectId)

        Message.GetIdea ideaId ->
            getIdea (Data.ideaIdToJsonValue ideaId)

        Message.GetIdeaNoCache ideaId ->
            getIdeaNoCache (Data.ideaIdToJsonValue ideaId)

        Message.GetSuggestion suggestionId ->
            getSuggestion (Data.suggestionIdToJsonValue suggestionId)

        Message.GetSuggestionNoCache suggestionId ->
            getSuggestionNoCache (Data.suggestionIdToJsonValue suggestionId)

        Message.GetIdeaListByProjectId projectId ->
            getIdeaAndIdListByProjectId (Data.projectIdToJsonValue projectId)

        Message.Batch commandList ->
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
         , Time.every 1000 UpdateTime
         , responseUserByAccessToken
            (\jsonValue ->
                case
                    Json.Decode.decodeValue
                        (Data.maybeJsonDecoder Data.userSnapshotAndIdJsonDecoder)
                        jsonValue
                of
                    Ok userSnapshotAndIdMaybe ->
                        ResponseUserDataFromAccessToken userSnapshotAndIdMaybe

                    Err _ ->
                        NoOperation
            )
         , getImageBlobResponse
            (\{ blobUrl, fileHash } ->
                ResponseImageBlob
                    { blobUrl = blobUrl
                    , fileHash = Data.FileHash fileHash
                    }
            )
         , toValidProjectNameResponse
            (\response ->
                PageMsg
                    (PageMessageCreateProject
                        (Page.CreateProject.ToValidProjectNameResponse response)
                    )
            )
         , toValidIdeaNameResponse
            (\response ->
                PageMsg
                    (PageMessageCreateIdea
                        (Page.CreateIdea.ToValidIdeaNameResponse response)
                    )
            )
         , createProjectResponse
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
         , responseCreateIdea
            (\jsonValue ->
                case Json.Decode.decodeValue (Data.maybeJsonDecoder Data.ideaSnapshotAndIdJsonDecoder) jsonValue of
                    Ok ideaSnapshotMaybe ->
                        CreateIdeaResponse ideaSnapshotMaybe

                    Err _ ->
                        NoOperation
            )
         , responseAddComment
            (\jsonValue ->
                case
                    Json.Decode.decodeValue Data.ideaResponseJsonDecoder jsonValue
                of
                    Ok ideaSnapshotMaybe ->
                        CommonMessage (Message.ResponseIdea ideaSnapshotMaybe)

                    Err _ ->
                        NoOperation
            )
         , responseAddSuggestion
            (\jsonValue ->
                case Json.Decode.decodeValue (Data.maybeJsonDecoder Data.suggestionSnapshotAndIdJsonDecoder) jsonValue of
                    Ok suggestionSnapshotAndIdMaybe ->
                        CommonMessage (Message.ResponseAddSuggestion suggestionSnapshotAndIdMaybe)

                    Err _ ->
                        NoOperation
            )
         , responseAllProjectId
            (\jsonValue ->
                case
                    Json.Decode.decodeValue
                        (Json.Decode.list
                            Data.projectIdJsonDecoder
                        )
                        jsonValue
                of
                    Ok projectIdList ->
                        CommonMessage (Message.ResponseAllProjectIdList projectIdList)

                    Err _ ->
                        NoOperation
            )
         , responseProject
            (\jsonValue ->
                case
                    Json.Decode.decodeValue
                        Data.projectResponseJsonDecoder
                        jsonValue
                of
                    Ok projectWithIdAndRespondTimeMaybe ->
                        CommonMessage (Message.ResponseProject projectWithIdAndRespondTimeMaybe)

                    Err _ ->
                        NoOperation
            )
         , responseUser
            (\jsonValue ->
                case Json.Decode.decodeValue Data.userResponseJsonDecoder jsonValue of
                    Ok userSnapshotMaybeAndId ->
                        ResponseUser userSnapshotMaybeAndId

                    Err _ ->
                        NoOperation
            )
         , responseIdea
            (\jsonValue ->
                case Json.Decode.decodeValue Data.ideaResponseJsonDecoder jsonValue of
                    Ok ideaResponse ->
                        CommonMessage (Message.ResponseIdea ideaResponse)

                    Err _ ->
                        NoOperation
            )
         , responseSuggestion
            (\jsonValue ->
                case Json.Decode.decodeValue Data.suggestionResponseJsonDecoder jsonValue of
                    Ok suggestionResponse ->
                        CommonMessage (Message.ResponseSuggestion suggestionResponse)

                    Err _ ->
                        NoOperation
            )
         , responseIdeaSnapshotAndIdListByProjectId
            (\jsonValue ->
                case
                    Json.Decode.decodeValue Data.ideaListByProjectIdResponseJsonDecoder jsonValue
                of
                    Ok ideaList ->
                        CommonMessage (Message.ResponseIdeaListByProjectId ideaList)

                    _ ->
                        NoOperation
            )
         ]
            ++ (if isCaptureMouseEvent model then
                    [ subPointerUp (always PointerUp) ]

                else
                    []
               )
        )
