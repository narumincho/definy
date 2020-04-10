module Page.Project exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import Component.Style
import Data
import ImageStore
import Ui


type Model
    = Loading Data.ProjectId
    | Loaded Data.ProjectSnapshotMaybeAndId


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

        Loaded projectCacheWithId ->
            projectCacheWithId.id


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case message of
        ProjectResponse projectCacheWithId ->
            if projectCacheWithId.id == getProjectId model then
                ( Loaded projectCacheWithId
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


view : ImageStore.ImageStore -> Model -> Ui.Panel Message
view imageStore model =
    case model of
        Loading projectId ->
            loadingView projectId

        Loaded projectCacheWithId ->
            case projectCacheWithId.snapshot of
                Just projectCache ->
                    normalView imageStore
                        { id = projectCacheWithId.id
                        , snapshot = projectCache
                        }

                Nothing ->
                    notFoundView projectCacheWithId.id


loadingView : Data.ProjectId -> Ui.Panel message
loadingView (Data.ProjectId projectIdAsString) =
    Component.Style.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを読込中")


normalView : ImageStore.ImageStore -> Data.ProjectSnapshotAndId -> Ui.Panel Message
normalView imageStore projectSnapshotAndId =
    let
        (Data.ProjectId projectIdAsString) =
            projectSnapshotAndId.id
    in
    Ui.column
        [ Ui.gap 8 ]
        [ Component.Style.stretchText 12 projectIdAsString
        , Ui.row
            [ Ui.width Ui.stretch ]
            [ case ImageStore.getImageBlobUrl projectSnapshotAndId.snapshot.iconHash imageStore of
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
            , Component.Style.normalText 16 projectSnapshotAndId.snapshot.name
            ]
        , case ImageStore.getImageBlobUrl projectSnapshotAndId.snapshot.imageHash imageStore of
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
                    [ ( ( Ui.Center, Ui.Center ), Component.Style.normalText 16 (projectSnapshotAndId.snapshot.name ++ "の画像を読込中") ) ]
        , ideaListView
        ]


ideaListView : Ui.Panel Message
ideaListView =
    Ui.column
        [ Ui.width Ui.stretch ]
        [ Component.Style.stretchText 24 "アイデア" ]


notFoundView : Data.ProjectId -> Ui.Panel Message
notFoundView (Data.ProjectId projectIdAsString) =
    Component.Style.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを見つからなかった")
