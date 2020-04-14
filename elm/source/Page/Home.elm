module Page.Home exposing
    ( Message(..)
    , Model
    , init
    , update
    , view
    )

import CommonUi
import Css
import Data
import Data.LogInState
import Message
import Ui


type Model
    = LoadingAllProject
    | LoadedAllProject (List Project)


type Project
    = OnlyId Data.ProjectId
    | Full Data.ProjectSnapshotMaybeAndId


type Message
    = PushUrl Data.UrlData
    | ResponseAllProjectId (List Data.ProjectId)
    | ResponseProject Data.ProjectSnapshotMaybeAndId
    | NoOp


init : ( Model, Message.Command )
init =
    ( LoadingAllProject, Message.GetAllProjectId )


update : Message -> Model -> ( Model, Message.Command )
update msg model =
    case msg of
        PushUrl urlData ->
            ( model
            , Message.PushUrl urlData
            )

        ResponseAllProjectId allProjectIdList ->
            ( LoadedAllProject (List.map OnlyId allProjectIdList)
            , Message.Batch (List.map Message.GetProject allProjectIdList)
            )

        ResponseProject projectCacheWithId ->
            case model of
                LoadingAllProject ->
                    ( model
                    , Message.None
                    )

                LoadedAllProject allProject ->
                    ( LoadedAllProject (setProjectWithIdAnsRespondTime projectCacheWithId allProject)
                    , case projectCacheWithId.snapshot of
                        Just projectCache ->
                            Message.Batch
                                [ Message.GetBlobUrl projectCache.iconHash
                                , Message.GetBlobUrl projectCache.imageHash
                                ]

                        Nothing ->
                            Message.None
                    )

        NoOp ->
            ( model
            , Message.None
            )


setProjectWithIdAnsRespondTime : Data.ProjectSnapshotMaybeAndId -> List Project -> List Project
setProjectWithIdAnsRespondTime projectSnapshotMaybeAndId projectList =
    case projectList of
        [] ->
            []

        (OnlyId id) :: xs ->
            if projectSnapshotMaybeAndId.id == id then
                [ Full projectSnapshotMaybeAndId ] ++ xs

            else
                OnlyId id :: setProjectWithIdAnsRespondTime projectSnapshotMaybeAndId xs

        (Full old) :: xs ->
            if projectSnapshotMaybeAndId.id == old.id then
                [ Full projectSnapshotMaybeAndId ] ++ xs

            else
                Full old :: setProjectWithIdAnsRespondTime projectSnapshotMaybeAndId xs


view :
    Message.SubModel
    -> Model
    -> Ui.Panel Message
view subModel model =
    Ui.scroll
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.column
            [ Ui.gap 16, Ui.height Ui.stretch ]
            [ case model of
                LoadingAllProject ->
                    CommonUi.normalText 16 "プロジェクトの一覧を読込中"

                LoadedAllProject allProject ->
                    projectListView subModel allProject
            ]
        )


projectListView :
    Message.SubModel
    -> List Project
    -> Ui.Panel Message
projectListView subModel projectList =
    Ui.column
        [ Ui.height Ui.stretch
        , Ui.gap 8
        , Ui.width Ui.auto
        , Ui.padding 8
        ]
        (case projectList of
            [] ->
                [ projectLineViewWithCreateButton
                    subModel
                    []
                ]

            a :: [] ->
                [ projectLineViewWithCreateButton
                    subModel
                    [ a ]
                ]

            a :: b :: xs ->
                projectLineViewWithCreateButton
                    subModel
                    [ a, b ]
                    :: projectListViewLoop subModel xs
        )


projectListViewLoop :
    Message.SubModel
    -> List Project
    -> List (Ui.Panel Message)
projectListViewLoop subModel projectList =
    case projectList of
        [] ->
            []

        a :: [] ->
            [ projectLineView subModel [ a ] ]

        a :: b :: [] ->
            [ projectLineView subModel [ a, b ] ]

        a :: b :: c :: xs ->
            projectLineView subModel [ a, b, c ]
                :: projectListViewLoop subModel xs


createProjectButton : Message.SubModel -> Ui.Panel Message
createProjectButton subModel =
    case Message.getLogInState subModel of
        Data.LogInState.RequestLogInUrl _ ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text = "......"
                    , typeface = CommonUi.normalTypeface
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
                        case Message.getLanguage subModel of
                            Data.LanguageEnglish ->
                                "Verifying..."

                            Data.LanguageJapanese ->
                                "認証中…"

                            Data.LanguageEsperanto ->
                                "Aŭtentigado ..."
                    , typeface = CommonUi.normalTypeface
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
                        case Message.getLanguage subModel of
                            Data.LanguageEnglish ->
                                "Creating guest user projects has not been completed yet"

                            Data.LanguageJapanese ->
                                "ゲストユーザーのプロジェクトの作成は,まだできていない"

                            Data.LanguageEsperanto ->
                                "Krei projektojn de invititaj uzantoj ankoraŭ ne estas finita"
                    , typeface = CommonUi.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.Ok _ ->
            createProjectButtonLogInOk subModel


createProjectButtonLogInOk : Message.SubModel -> Ui.Panel Message
createProjectButtonLogInOk subModel =
    CommonUi.sameLanguageLink
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
        subModel
        Data.LocationCreateProject
        (Ui.depth
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
                    [ CommonUi.plusIcon
                    , Ui.text
                        []
                        (Ui.TextAttributes
                            { text =
                                case Message.getLanguage subModel of
                                    Data.LanguageEnglish ->
                                        "Create a new project"

                                    Data.LanguageJapanese ->
                                        "プロジェクトを新規作成"

                                    Data.LanguageEsperanto ->
                                        "Krei novan projekton"
                            , typeface = CommonUi.normalTypeface
                            , size = 16
                            , letterSpacing = 0
                            , color = Css.rgb 200 200 200
                            , textAlignment = Ui.TextAlignStart
                            }
                        )
                    ]
              )
            ]
        )


{-| プロジェクトの表示は2つまで
-}
projectLineViewWithCreateButton : Message.SubModel -> List Project -> Ui.Panel Message
projectLineViewWithCreateButton subModel projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (createProjectButton subModel
            :: List.map (projectItem subModel) projectList
        )


{-| プロジェクトの表示は1行3つまで
-}
projectLineView : Message.SubModel -> List Project -> Ui.Panel Message
projectLineView subModel projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (List.map (projectItem subModel) projectList)


projectItem : Message.SubModel -> Project -> Ui.Panel Message
projectItem subModel project =
    CommonUi.sameLanguageLink
        [ Ui.width (Ui.stretchWithMaxSize 320), Ui.height Ui.stretch ]
        subModel
        (Data.LocationProject
            (case project of
                OnlyId id ->
                    id

                Full projectCache ->
                    projectCache.id
            )
        )
        (Ui.depth
            [ Ui.width (Ui.stretchWithMaxSize 320), Ui.height Ui.stretch ]
            [ ( ( Ui.Center, Ui.Center )
              , projectItemImage subModel project
              )
            , ( ( Ui.Center, Ui.End )
              , projectItemText subModel project
              )
            ]
        )


projectItemImage : Message.SubModel -> Project -> Ui.Panel message
projectItemImage subModel project =
    case project of
        OnlyId _ ->
            Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]

        Full projectCacheWithId ->
            case projectCacheWithId.snapshot of
                Just projectCache ->
                    case Message.getImageBlobUrl projectCache.imageHash subModel of
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
                            CommonUi.normalText 16 "プロジェクトの画像を読込中"

                Nothing ->
                    Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]


projectItemText : Message.SubModel -> Project -> Ui.Panel message
projectItemText subModel project =
    Ui.row
        [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
        [ case project of
            Full projectCacheWithId ->
                case projectCacheWithId.snapshot of
                    Just projectSnapshot ->
                        case Message.getImageBlobUrl projectSnapshot.iconHash subModel of
                            Just blobUrl ->
                                Ui.bitmapImage
                                    [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                                    (Ui.BitmapImageAttributes
                                        { url = blobUrl
                                        , fitStyle = Ui.Cover
                                        , alternativeText = projectSnapshot.name ++ "のアイコン"
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
                            case projectCacheWithId.snapshot of
                                Just snapshot ->
                                    snapshot.name

                                Nothing ->
                                    "プロジェクトが見つからなかった"
                , typeface = CommonUi.normalTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                , textAlignment = Ui.TextAlignStart
                }
            )
        ]
