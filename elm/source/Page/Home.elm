module Page.Home exposing
    ( Message(..)
    , Model
    , init
    , update
    , updateByCommonMessage
    , view
    )

import Array
import CommonUi
import Css
import Data
import Data.Key
import Data.LogInState
import Message
import Ui


type Model
    = LoadingAllProject
    | LoadedAllProject LoadedModel


type LoadedModel
    = LoadedModel
        { selectProjectId : Maybe Data.ProjectId
        , projectList : List Project
        }


type Project
    = OnlyId Data.ProjectId
    | Full Data.ProjectResponse


type Message
    = NoOperation


projectGetId : Project -> Data.ProjectId
projectGetId project =
    case project of
        OnlyId projectId ->
            projectId

        Full { id } ->
            id


init : ( Model, Message.Command )
init =
    ( LoadingAllProject, Message.GetAllProjectId )


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage message model =
    case message of
        Message.ResponseProject projectResponse ->
            case model of
                LoadingAllProject ->
                    ( model
                    , Message.None
                    )

                LoadedAllProject loadedModel ->
                    ( LoadedAllProject (loadedModelSetProjectResponse projectResponse loadedModel)
                    , case projectResponse.snapshotMaybe of
                        Just projectCache ->
                            Message.Batch
                                [ Message.GetBlobUrl projectCache.iconHash
                                , Message.GetBlobUrl projectCache.imageHash
                                ]

                        Nothing ->
                            Message.None
                    )

        Message.ResponseAllProjectIdList projectIdList ->
            ( LoadedAllProject
                (LoadedModel
                    { projectList = projectIdList |> List.map OnlyId
                    , selectProjectId = List.head projectIdList
                    }
                )
            , Message.Batch (List.map Message.GetProject projectIdList)
            )

        Message.CommonCommand commonCommand ->
            updateByCommonCommand
                commonCommand
                model

        _ ->
            ( model
            , Message.None
            )


updateByCommonCommand : Message.CommonCommand -> Model -> ( Model, Message.Command )
updateByCommonCommand command model =
    case model of
        LoadingAllProject ->
            ( model
            , Message.None
            )

        LoadedAllProject (LoadedModel record) ->
            let
                nowIndex =
                    record.selectProjectId
                        |> Maybe.andThen
                            (\projectId ->
                                projectListGetIndexByProjectId
                                    projectId
                                    record.projectList
                            )
                        |> Maybe.withDefault 0

                newSelectProjectId : Maybe Data.ProjectId
                newSelectProjectId =
                    Array.get
                        (selectIndexByCommonCommand
                            (List.length record.projectList)
                            nowIndex
                            command
                        )
                        (Array.fromList record.projectList)
                        |> Maybe.map projectGetId
            in
            ( LoadedAllProject
                (LoadedModel
                    { record | selectProjectId = newSelectProjectId }
                )
            , newSelectProjectId
                |> Maybe.map (\projectId -> Message.FocusElement (projectElementId projectId))
                |> Maybe.withDefault Message.None
            )


selectIndexByCommonCommand : Int -> Int -> Message.CommonCommand -> Int
selectIndexByCommonCommand length nowIndex commonCommand =
    let
        lastIndex =
            length - 1
    in
    case commonCommand of
        Message.SelectUp ->
            case nowIndex of
                0 ->
                    lastIndex

                _ ->
                    max 0 (nowIndex - 3)

        Message.SelectDown ->
            if nowIndex == lastIndex then
                0

            else
                min lastIndex (nowIndex + 3)

        Message.SelectLeft ->
            case nowIndex of
                0 ->
                    lastIndex

                _ ->
                    max 0 (nowIndex - 1)

        Message.SelectRight ->
            if nowIndex == lastIndex then
                0

            else
                min lastIndex (nowIndex + 1)

        _ ->
            nowIndex


projectListGetIndexByProjectId : Data.ProjectId -> List Project -> Maybe Int
projectListGetIndexByProjectId projectId projectList =
    case projectList of
        project :: others ->
            if projectGetId project == projectId then
                Just 0

            else
                projectListGetIndexByProjectId projectId others
                    |> Maybe.map (\x -> x + 1)

        [] ->
            Nothing


update : Message -> Model -> ( Model, Message.Command )
update msg model =
    case msg of
        NoOperation ->
            ( model
            , Message.None
            )


loadedModelSetProjectResponse : Data.ProjectResponse -> LoadedModel -> LoadedModel
loadedModelSetProjectResponse projectResponse (LoadedModel record) =
    LoadedModel
        { record
            | projectList = projectListSetProjectResponse projectResponse record.projectList
        }


projectListSetProjectResponse : Data.ProjectResponse -> List Project -> List Project
projectListSetProjectResponse projectSnapshotMaybeAndId projectList =
    case projectList of
        [] ->
            []

        project :: projectOthers ->
            if projectSnapshotMaybeAndId.id == projectGetId project then
                Full projectSnapshotMaybeAndId :: projectOthers

            else
                project :: projectListSetProjectResponse projectSnapshotMaybeAndId projectOthers


view :
    Message.SubModel
    -> Model
    -> Ui.Panel Message
view subModel model =
    Ui.column
        Ui.stretch
        Ui.auto
        [ Ui.gap 16 ]
        [ case model of
            LoadingAllProject ->
                CommonUi.normalText 16 "プロジェクトの一覧を読込中"

            LoadedAllProject loadedModel ->
                projectListView subModel loadedModel
        ]


projectListView :
    Message.SubModel
    -> LoadedModel
    -> Ui.Panel Message
projectListView subModel (LoadedModel record) =
    Ui.column
        (Ui.stretchWithMaxSize 800)
        Ui.stretch
        [ Ui.gap 8
        , Ui.padding 8
        ]
        (case record.projectList of
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
            CommonUi.maxWidthText
                320
                16
                "......"

        Data.LogInState.VerifyingAccessToken _ ->
            CommonUi.maxWidthText
                320
                16
                (case Message.getLanguage subModel of
                    Data.LanguageEnglish ->
                        "Verifying..."

                    Data.LanguageJapanese ->
                        "認証中…"

                    Data.LanguageEsperanto ->
                        "Aŭtentigado ..."
                )

        Data.LogInState.GuestUser ->
            CommonUi.maxWidthText
                320
                16
                (case Message.getLanguage subModel of
                    Data.LanguageEnglish ->
                        "Creating guest user projects has not been completed yet"

                    Data.LanguageJapanese ->
                        "ゲストユーザーのプロジェクトの作成は,まだできていない"

                    Data.LanguageEsperanto ->
                        "Krei projektojn de invititaj uzantoj ankoraŭ ne estas finita"
                )

        Data.LogInState.Ok _ ->
            createProjectButtonLogInOk subModel


createProjectButtonLogInOk : Message.SubModel -> Ui.Panel Message
createProjectButtonLogInOk subModel =
    CommonUi.sameLanguageLink
        (Ui.stretchWithMaxSize 320)
        Ui.stretch
        [ Ui.border
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
            (Ui.stretchWithMaxSize 320)
            Ui.stretch
            [ Ui.border
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
                    Ui.auto
                    Ui.auto
                    []
                    [ CommonUi.plusIcon
                    , CommonUi.normalText
                        16
                        (case Message.getLanguage subModel of
                            Data.LanguageEnglish ->
                                "Create a new project"

                            Data.LanguageJapanese ->
                                "プロジェクトを新規作成"

                            Data.LanguageEsperanto ->
                                "Krei novan projekton"
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
        Ui.auto
        (Ui.fix 200)
        [ Ui.gap 8 ]
        (createProjectButton subModel
            :: List.map (projectItem subModel) projectList
        )


{-| プロジェクトの表示は1行3つまで
-}
projectLineView : Message.SubModel -> List Project -> Ui.Panel Message
projectLineView subModel projectList =
    Ui.row
        Ui.stretch
        (Ui.fix 200)
        [ Ui.gap 8 ]
        (List.map (projectItem subModel) projectList)


projectItem : Message.SubModel -> Project -> Ui.Panel Message
projectItem subModel project =
    CommonUi.sameLanguageLink
        (Ui.stretchWithMaxSize 320)
        Ui.stretch
        [ Ui.id (projectElementId (projectGetId project)) ]
        subModel
        (Data.LocationProject
            (projectGetId project)
        )
        (Ui.depth
            (Ui.stretchWithMaxSize 320)
            Ui.stretch
            []
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
            Ui.empty Ui.stretch Ui.stretch []

        Full projectCacheWithId ->
            case projectCacheWithId.snapshotMaybe of
                Just projectCache ->
                    case Message.getImageBlobUrl projectCache.imageHash subModel of
                        Just projectImageBlobUrl ->
                            Ui.bitmapImage
                                Ui.stretch
                                Ui.stretch
                                []
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
                    Ui.empty Ui.stretch Ui.stretch []


projectItemText : Message.SubModel -> Project -> Ui.Panel message
projectItemText subModel project =
    let
        iconEmpty =
            Ui.empty
                (Ui.fix 32)
                (Ui.fix 32)
                []
    in
    Ui.row
        Ui.stretch
        Ui.auto
        []
        [ case project of
            Full projectCacheWithId ->
                projectCacheWithId.snapshotMaybe
                    |> Maybe.andThen
                        (\projectSnapshot ->
                            Message.getImageBlobUrl projectSnapshot.iconHash subModel
                                |> Maybe.map
                                    (\blobUrl ->
                                        Ui.bitmapImage
                                            (Ui.fix 32)
                                            (Ui.fix 32)
                                            []
                                            (Ui.BitmapImageAttributes
                                                { url = blobUrl
                                                , fitStyle = Ui.Cover
                                                , alternativeText = projectSnapshot.name ++ "のアイコン"
                                                , rendering = Ui.ImageRenderingPixelated
                                                }
                                            )
                                    )
                        )
                    |> Maybe.withDefault iconEmpty

            _ ->
                iconEmpty
        , CommonUi.normalText
            16
            (case project of
                OnlyId (Data.ProjectId idAsString) ->
                    "id = " ++ idAsString

                Full projectCacheWithId ->
                    case projectCacheWithId.snapshotMaybe of
                        Just snapshot ->
                            snapshot.name

                        Nothing ->
                            "プロジェクトが見つからなかった"
            )
        ]


projectElementId : Data.ProjectId -> String
projectElementId (Data.ProjectId projectIdAsString) =
    "project" ++ projectIdAsString
