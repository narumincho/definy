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
import Icon
import ImageStore
import SubModel
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
                    , case projectCacheWithId.snapshot of
                        Just projectCache ->
                            Command.Batch
                                [ Command.GetBlobUrl projectCache.iconHash
                                , Command.GetBlobUrl projectCache.imageHash
                                ]

                        Nothing ->
                            Command.None
                    )

        NoOp ->
            ( model
            , Command.None
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
    SubModel.SubModel
    -> Model
    -> Ui.Panel Message
view subModel model =
    Ui.scroll
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.column
            [ Ui.gap 16, Ui.height Ui.stretch ]
            [ case model of
                LoadingAllProject ->
                    Component.Style.normalText 16 "プロジェクトの一覧を読込中"

                LoadedAllProject allProject ->
                    projectListView subModel allProject
            ]
        )


projectListView :
    SubModel.SubModel
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
    SubModel.SubModel
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


createProjectButton : SubModel.SubModel -> Ui.Panel Message
createProjectButton subModel =
    case SubModel.getLogInState subModel of
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
                        case SubModel.getLanguage subModel of
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
                        case SubModel.getLanguage subModel of
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
            createProjectButtonLogInOk subModel


createProjectButtonLogInOk : SubModel.SubModel -> Ui.Panel Message
createProjectButtonLogInOk subModel =
    Component.Style.sameLanguageLink
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
                    [ Icon.plus
                    , Ui.text
                        []
                        (Ui.TextAttributes
                            { text =
                                case SubModel.getLanguage subModel of
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
        )


{-| プロジェクトの表示は2つまで
-}
projectLineViewWithCreateButton : SubModel.SubModel -> List Project -> Ui.Panel Message
projectLineViewWithCreateButton subModel projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (createProjectButton subModel
            :: List.map (projectItem subModel) projectList
        )


{-| プロジェクトの表示は1行3つまで
-}
projectLineView : SubModel.SubModel -> List Project -> Ui.Panel Message
projectLineView subModel projectList =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        (List.map (projectItem subModel) projectList)


projectItem : SubModel.SubModel -> Project -> Ui.Panel Message
projectItem subModel project =
    Component.Style.sameLanguageLink
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
              , projectItemImage (SubModel.getImageStore subModel) project
              )
            , ( ( Ui.Center, Ui.End )
              , projectItemText (SubModel.getImageStore subModel) project
              )
            ]
        )


projectItemImage : ImageStore.ImageStore -> Project -> Ui.Panel message
projectItemImage imageStore project =
    case project of
        OnlyId _ ->
            Ui.empty [ Ui.width Ui.stretch, Ui.height Ui.stretch ]

        Full projectCacheWithId ->
            case projectCacheWithId.snapshot of
                Just projectCache ->
                    case ImageStore.getImageBlobUrl projectCache.imageHash imageStore of
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


projectItemText : ImageStore.ImageStore -> Project -> Ui.Panel message
projectItemText imageStore project =
    Ui.row
        [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
        [ case project of
            Full projectCacheWithId ->
                case projectCacheWithId.snapshot of
                    Just projectSnapshot ->
                        case ImageStore.getImageBlobUrl projectSnapshot.iconHash imageStore of
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
                , typeface = Component.Style.normalTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                , textAlignment = Ui.TextAlignStart
                }
            )
        ]
