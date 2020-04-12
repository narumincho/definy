module Page.Project exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import CommonUi
import Data
import SubModel
import Ui


type Model
    = Loading Data.ProjectId
    | Loaded LoadedModel


type alias LoadedModel =
    { snapshotAndId : Data.ProjectSnapshotMaybeAndId, user : Maybe Data.UserSnapshot }


type Message
    = ProjectResponse Data.ProjectSnapshotMaybeAndId


init : Data.ProjectId -> ( Model, Command.Command )
init projectId =
    ( Loading projectId
    , Command.GetProject projectId
    )


getProjectId : Model -> Data.ProjectId
getProjectId model =
    case model of
        Loading projectId ->
            projectId

        Loaded { snapshotAndId } ->
            snapshotAndId.id


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case message of
        ProjectResponse projectCacheWithId ->
            if projectCacheWithId.id == getProjectId model then
                ( Loaded
                    { snapshotAndId = projectCacheWithId
                    , user = Nothing
                    }
                , case projectCacheWithId.snapshot of
                    Just projectCache ->
                        Command.Batch
                            [ Command.GetBlobUrl projectCache.imageHash
                            , Command.GetBlobUrl projectCache.iconHash
                            ]

                    Nothing ->
                        Command.None
                )

            else
                ( model, Command.None )


view : SubModel.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case model of
        Loading projectId ->
            loadingView projectId

        Loaded { snapshotAndId, user } ->
            case snapshotAndId.snapshot of
                Just projectCache ->
                    normalView subModel
                        { id = snapshotAndId.id
                        , snapshot = projectCache
                        }
                        user

                Nothing ->
                    notFoundView snapshotAndId.id


loadingView : Data.ProjectId -> Ui.Panel message
loadingView (Data.ProjectId projectIdAsString) =
    CommonUi.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを読込中")


normalView : SubModel.SubModel -> Data.ProjectSnapshotAndId -> Maybe Data.UserSnapshot -> Ui.Panel Message
normalView subModel projectSnapshotAndId createUserMaybe =
    let
        (Data.ProjectId projectIdAsString) =
            projectSnapshotAndId.id
    in
    Ui.column
        [ Ui.gap 8 ]
        [ CommonUi.stretchText 12 projectIdAsString
        , Ui.row
            [ Ui.width Ui.stretch ]
            [ case SubModel.getImageBlobUrl projectSnapshotAndId.snapshot.iconHash subModel of
                Just blobUrl ->
                    Ui.bitmapImage
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                        (Ui.BitmapImageAttributes
                            { url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = projectSnapshotAndId.snapshot.name ++ "のアイコン"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
            , CommonUi.normalText 16 projectSnapshotAndId.snapshot.name
            ]
        , case SubModel.getImageBlobUrl projectSnapshotAndId.snapshot.imageHash subModel of
            Just blobUrl ->
                Ui.bitmapImage
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    (Ui.BitmapImageAttributes
                        { url = blobUrl
                        , fitStyle = Ui.Contain
                        , alternativeText = projectSnapshotAndId.snapshot.name ++ "のアイコン"
                        , rendering = Ui.ImageRenderingPixelated
                        }
                    )

            Nothing ->
                Ui.depth
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    [ ( ( Ui.Center, Ui.Center ), CommonUi.normalText 16 (projectSnapshotAndId.snapshot.name ++ "の画像を読込中") ) ]
        , ideaListView
        , Ui.row
            [ Ui.gap 8 ]
            [ CommonUi.normalText 16 "作成日時:"
            , CommonUi.timeView (SubModel.getTimeZoneAndNameMaybe subModel) projectSnapshotAndId.snapshot.createTime
            ]
        , Ui.row
            [ Ui.gap 8 ]
            [ CommonUi.normalText 16 "更新日時:"
            , CommonUi.timeView (SubModel.getTimeZoneAndNameMaybe subModel) projectSnapshotAndId.snapshot.updateTime
            ]
        ]


ideaListView : Ui.Panel Message
ideaListView =
    Ui.column
        [ Ui.width Ui.stretch ]
        [ CommonUi.stretchText 24 "アイデア" ]


notFoundView : Data.ProjectId -> Ui.Panel Message
notFoundView (Data.ProjectId projectIdAsString) =
    CommonUi.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを見つからなかった")
