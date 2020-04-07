module Page.Project exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import Component.Style
import Data
import ImageStore
import Ui


type Model
    = Loading Data.ProjectId
    | Loaded Data.ProjectCacheWithId


type Message
    = ProjectResponse Data.ProjectCacheWithId


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
            projectCacheWithId.projectId


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case ( message, model ) of
        ( ProjectResponse projectCacheWithId, Loading projectId ) ->
            if projectCacheWithId.projectId == projectId then
                ( Loaded projectCacheWithId
                , case projectCacheWithId.projectCache of
                    Just projectCache ->
                        Command.Batch
                            [ Command.GetBlobUrl projectCache.project.image
                            , Command.GetBlobUrl projectCache.project.icon
                            ]

                    Nothing ->
                        Command.None
                )

            else
                ( model, Command.None )

        ( _, _ ) ->
            ( model, Command.None )


view : ImageStore.ImageStore -> Model -> Ui.Panel Message
view imageStore model =
    case model of
        Loading projectId ->
            loadingView projectId

        Loaded projectCacheWithId ->
            case projectCacheWithId.projectCache of
                Just projectCache ->
                    normalView imageStore projectCacheWithId.projectId projectCache

                Nothing ->
                    notFoundView projectCacheWithId.projectId


loadingView : Data.ProjectId -> Ui.Panel message
loadingView (Data.ProjectId projectIdAsString) =
    Component.Style.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを読込中")


normalView : ImageStore.ImageStore -> Data.ProjectId -> Data.ProjectCache -> Ui.Panel Message
normalView imageStore (Data.ProjectId projectIdAsString) projectCache =
    Ui.column
        [ Ui.gap 8 ]
        [ Component.Style.stretchText 12 projectIdAsString
        , Ui.row
            [ Ui.width Ui.stretch ]
            [ case ImageStore.getImageBlobUrl projectCache.project.icon imageStore of
                Just blobUrl ->
                    Ui.bitmapImage
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                        (Ui.BitmapImageAttributes
                            { url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = projectCache.project.name ++ "のアイコン"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
            , Component.Style.normalText 16 projectCache.project.name
            ]
        , case ImageStore.getImageBlobUrl projectCache.project.image imageStore of
            Just blobUrl ->
                Ui.bitmapImage
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    (Ui.BitmapImageAttributes
                        { url = blobUrl
                        , fitStyle = Ui.Contain
                        , alternativeText = projectCache.project.name ++ "のアイコン"
                        , rendering = Ui.ImageRenderingPixelated
                        }
                    )

            Nothing ->
                Ui.depth
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    [ ( ( Ui.Center, Ui.Center ), Component.Style.normalText 16 (projectCache.project.name ++ "の画像を読込中") ) ]
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
