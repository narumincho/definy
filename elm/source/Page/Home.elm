module Page.Home exposing
    ( Message(..)
    , Model
    , init
    , update
    , view
    )

import Command
import Component.Style
import Css
import Data
import Data.LogInState
import Data.UrlData
import Icon
import Ui


type Model
    = LoadingAllProject
    | LoadedAllProject (List Project)


type Project
    = OnlyId Data.ProjectId
    | Full Data.ProjectCacheWithId


type Message
    = PushUrl Data.UrlData
    | ResponseAllProjectId (List Data.ProjectId)
    | ResponseProject Data.ProjectCacheWithId
    | NoOp


init : ( Model, Command.Command )
init =
    ( LoadingAllProject, Command.GetAllProjectId )


update : Message -> Model -> ( Model, Command.Command )
update msg model =
    case msg of
        PushUrl urlData ->
            ( model
            , Command.PushUrl urlData
            )

        ResponseAllProjectId allProjectIdList ->
            ( LoadedAllProject (List.map OnlyId allProjectIdList)
            , Command.Batch (List.map Command.GetProject allProjectIdList)
            )

        ResponseProject projectMaybe ->
            case model of
                LoadingAllProject ->
                    ( model
                    , Command.None
                    )

                LoadedAllProject allProject ->
                    ( LoadedAllProject (setProjectWithIdAnsRespondTime projectMaybe allProject)
                    , Command.None
                    )

        NoOp ->
            ( model
            , Command.None
            )


setProjectWithIdAnsRespondTime : Data.ProjectCacheWithId -> List Project -> List Project
setProjectWithIdAnsRespondTime projectCacheWithId projectList =
    case projectList of
        [] ->
            []

        (OnlyId id) :: xs ->
            if projectCacheWithId.projectId == id then
                [ Full projectCacheWithId ] ++ xs

            else
                OnlyId id :: setProjectWithIdAnsRespondTime projectCacheWithId xs

        (Full old) :: xs ->
            if projectCacheWithId.projectId == old.projectId then
                [ Full projectCacheWithId ] ++ xs

            else
                Full old :: setProjectWithIdAnsRespondTime projectCacheWithId xs


view : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Model -> Ui.Panel Message
view clientMode language logInState model =
    Ui.scroll
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.column
            [ Ui.gap 16, Ui.height Ui.stretch ]
            [ case model of
                LoadingAllProject ->
                    Component.Style.normalText 16 "プロジェクトの一覧を読込中"

                LoadedAllProject allProject ->
                    projectListView clientMode language logInState allProject
            ]
        )


projectListView :
    Data.ClientMode
    -> Data.Language
    -> Data.LogInState.LogInState
    -> List Project
    -> Ui.Panel Message
projectListView clientMode language logInState projectList =
    Ui.column
        [ Ui.height Ui.stretch
        , Ui.gap 8
        , Ui.width Ui.auto
        , Ui.padding 8
        ]
        (case projectList of
            [] ->
                [ projectLineViewWithCreateButton clientMode language logInState [] ]

            a :: [] ->
                [ projectLineViewWithCreateButton clientMode language logInState [ a ] ]

            a :: b :: xs ->
                projectLineViewWithCreateButton clientMode language logInState [ a, b ]
                    :: projectListViewLoop xs
        )


projectListViewLoop : List Project -> List (Ui.Panel Message)
projectListViewLoop projectList =
    case projectList of
        [] ->
            []

        a :: [] ->
            [ projectLineView [ a ] ]

        a :: b :: [] ->
            [ projectLineView [ a, b ] ]

        a :: b :: c :: xs ->
            projectLineView [ a, b, c ] :: projectListViewLoop xs


createProjectButton : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Ui.Panel Message
createProjectButton clientMode language logInState =
    case logInState of
        Data.LogInState.RequestLogInUrl _ ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text = "......"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.VerifyingAccessToken _ ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text =
                        case language of
                            Data.LanguageEnglish ->
                                "Verifying..."

                            Data.LanguageJapanese ->
                                "認証中…"

                            Data.LanguageEsperanto ->
                                "Aŭtentigado ..."
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.GuestUser ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text =
                        case language of
                            Data.LanguageEnglish ->
                                "Creating guest user projects has not been completed yet"

                            Data.LanguageJapanese ->
                                "ゲストユーザーのプロジェクトの作成は,まだできていない"

                            Data.LanguageEsperanto ->
                                "Krei projektojn de invititaj uzantoj ankoraŭ ne estas finita"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.Ok _ ->
            createProjectButtonLogInOk clientMode language


createProjectButtonLogInOk : Data.ClientMode -> Data.Language -> Ui.Panel Message
createProjectButtonLogInOk clientMode language =
    let
        createProjectUrl : Data.UrlData
        createProjectUrl =
            { clientMode = clientMode
            , location = Data.LocationCreateProject
            , language = language
            , accessToken = Nothing
            }
    in
    Ui.link
        [ Ui.width (Ui.stretchWithMaxSize 320)
        , Ui.height Ui.stretch
        , Ui.border
            (Ui.BorderStyle
                { color = Css.rgb 200 200 200
                , width =
                    { top = 1
                    , right = 1
                    , left = 1
                    , bottom = 1
                    }
                }
            )
        ]
        (Ui.LinkAttributes
            { url = Data.UrlData.urlDataToString createProjectUrl
            , clickMessage = PushUrl createProjectUrl
            , noOpMessage = NoOp
            , child =
                Ui.depth
                    [ Ui.width (Ui.stretchWithMaxSize 320)
                    , Ui.height Ui.stretch
                    , Ui.border
                        (Ui.BorderStyle
                            { color = Css.rgb 200 200 200
                            , width =
                                { top = 1
                                , right = 1
                                , left = 1
                                , bottom = 1
                                }
                            }
                        )
                    ]
                    [ ( ( Ui.Center, Ui.Center )
                      , Ui.column
                            []
                            [ Icon.plus
                            , Ui.text
                                []
                                (Ui.TextAttributes
                                    { text =
                                        case language of
                                            Data.LanguageEnglish ->
                                                "Create a new project"

                                            Data.LanguageJapanese ->
                                                "プロジェクトを新規作成"

                                            Data.LanguageEsperanto ->
                                                "Krei novan projekton"
                                    , typeface = Component.Style.normalTypeface
                                    , size = 16
                                    , letterSpacing = 0
                                    , color = Css.rgb 200 200 200
                                    , textAlignment = Ui.TextAlignStart
                                    }
                                )
                            ]
                      )
                    ]
            }
        )


{-| プロジェクトの表示は2つまで
-}
projectLineViewWithCreateButton :
    Data.ClientMode
    -> Data.Language
    -> Data.LogInState.LogInState
    -> List Project
    -> Ui.Panel Message
projectLineViewWithCreateButton clientMode language logInState projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (createProjectButton clientMode language logInState
            :: List.map projectItem projectList
        )


{-| プロジェクトの表示は1行3つまで
-}
projectLineView : List Project -> Ui.Panel message
projectLineView projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (List.map projectItem projectList)


projectItem : Project -> Ui.Panel message
projectItem project =
    Ui.depth
        [ Ui.width (Ui.stretchWithMaxSize 320), Ui.height Ui.stretch ]
        [ ( ( Ui.Center, Ui.Center )
          , projectItemImage project
          )
        , ( ( Ui.Center, Ui.End )
          , Ui.text
                [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
                (Ui.TextAttributes
                    { text =
                        case project of
                            OnlyId (Data.ProjectId idAsString) ->
                                "id = " ++ idAsString

                            Full projectCacheWithId ->
                                case projectCacheWithId.projectCache of
                                    Just projectCache ->
                                        projectCache.project.name

                                    Nothing ->
                                        "プロジェクトが見つからなかった"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )
          )
        ]


projectItemImage : Project -> Ui.Panel message
projectItemImage project =
    case project of
        OnlyId _ ->
            Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]

        Full projectCacheWithId ->
            case projectCacheWithId.projectCache of
                Just projectCache ->
                    let
                        (Data.FileHash imageHash) =
                            projectCache.project.image
                    in
                    Ui.bitmapImage
                        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                        (Ui.BitmapImageAttributes
                            { url = "https://us-central1-definy-lang.cloudfunctions.net/getFile/" ++ imageHash
                            , fitStyle = Ui.Cover
                            , alternativeText = "プロジェクト画像"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
