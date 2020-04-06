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
import ImageStore
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

        ResponseProject projectCacheWithId ->
            case model of
                LoadingAllProject ->
                    ( model
                    , Command.None
                    )

                LoadedAllProject allProject ->
                    ( LoadedAllProject (setProjectWithIdAnsRespondTime projectCacheWithId allProject)
                    , case projectCacheWithId.projectCache of
                        Just projectCache ->
                            Command.Batch
                                [ Command.GetBlobUrl projectCache.project.icon
                                , Command.GetBlobUrl projectCache.project.image
                                ]

                        Nothing ->
                            Command.None
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


view :
    Data.ClientMode
    -> Data.Language
    -> Data.LogInState.LogInState
    -> ImageStore.ImageStore
    -> Model
    -> Ui.Panel Message
view clientMode language logInState imageStore model =
    Ui.scroll
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.column
            [ Ui.gap 16, Ui.height Ui.stretch ]
            [ case model of
                LoadingAllProject ->
                    Component.Style.normalText 16 "プロジェクトの一覧を読込中"

                LoadedAllProject allProject ->
                    projectListView clientMode language logInState imageStore allProject
            ]
        )


projectListView :
    Data.ClientMode
    -> Data.Language
    -> Data.LogInState.LogInState
    -> ImageStore.ImageStore
    -> List Project
    -> Ui.Panel Message
projectListView clientMode language logInState imageStore projectList =
    Ui.column
        [ Ui.height Ui.stretch
        , Ui.gap 8
        , Ui.width Ui.auto
        , Ui.padding 8
        ]
        (case projectList of
            [] ->
                [ projectLineViewWithCreateButton
                    clientMode
                    language
                    logInState
                    imageStore
                    []
                ]

            a :: [] ->
                [ projectLineViewWithCreateButton
                    clientMode
                    language
                    logInState
                    imageStore
                    [ a ]
                ]

            a :: b :: xs ->
                projectLineViewWithCreateButton
                    clientMode
                    language
                    logInState
                    imageStore
                    [ a, b ]
                    :: projectListViewLoop imageStore xs
        )


projectListViewLoop : ImageStore.ImageStore -> List Project -> List (Ui.Panel Message)
projectListViewLoop imageStore projectList =
    case projectList of
        [] ->
            []

        a :: [] ->
            [ projectLineView imageStore [ a ] ]

        a :: b :: [] ->
            [ projectLineView imageStore [ a, b ] ]

        a :: b :: c :: xs ->
            projectLineView imageStore [ a, b, c ] :: projectListViewLoop imageStore xs


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
    -> ImageStore.ImageStore
    -> List Project
    -> Ui.Panel Message
projectLineViewWithCreateButton clientMode language logInState imageStore projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (createProjectButton clientMode language logInState
            :: List.map (projectItem imageStore) projectList
        )


{-| プロジェクトの表示は1行3つまで
-}
projectLineView : ImageStore.ImageStore -> List Project -> Ui.Panel message
projectLineView imageStore projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (List.map (projectItem imageStore) projectList)


projectItem : ImageStore.ImageStore -> Project -> Ui.Panel message
projectItem imageStore project =
    Ui.depth
        [ Ui.width (Ui.stretchWithMaxSize 320), Ui.height Ui.stretch ]
        [ ( ( Ui.Center, Ui.Center )
          , projectItemImage imageStore project
          )
        , ( ( Ui.Center, Ui.End )
          , Ui.row
                [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
                [ case project of
                    Full projectCacheWithId ->
                        case projectCacheWithId.projectCache of
                            Just projectCache ->
                                case ImageStore.getImageBlobUrl projectCache.project.icon imageStore of
                                    Just blobUrl ->
                                        Ui.bitmapImage
                                            [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                                            (Ui.BitmapImageAttributes
                                                { url = blobUrl
                                                , fitStyle = Ui.Cover
                                                , alternativeText = "プロジェクトアイコン"
                                                , rendering = Ui.ImageRenderingPixelated
                                                }
                                            )

                                    Nothing ->
                                        Ui.empty
                                            [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]

                            Nothing ->
                                Ui.empty
                                    [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]

                    _ ->
                        Ui.empty
                            [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                , Ui.text
                    []
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
                ]
          )
        ]


projectItemImage : ImageStore.ImageStore -> Project -> Ui.Panel message
projectItemImage imageStore project =
    case project of
        OnlyId _ ->
            Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]

        Full projectCacheWithId ->
            case projectCacheWithId.projectCache of
                Just projectCache ->
                    case ImageStore.getImageBlobUrl projectCache.project.image imageStore of
                        Just projectImageBlobUrl ->
                            Ui.bitmapImage
                                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                                (Ui.BitmapImageAttributes
                                    { url = projectImageBlobUrl
                                    , fitStyle = Ui.Cover
                                    , alternativeText = "プロジェクト画像"
                                    , rendering = Ui.ImageRenderingPixelated
                                    }
                                )

                        Nothing ->
                            Component.Style.normalText 16 "プロジェクトの画像を読込中"

                Nothing ->
                    Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
