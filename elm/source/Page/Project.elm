module Page.Project exposing (Message(..), Model, getProjectId, init, update, view)

import Command
import Component.Style
import Data
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


view : Model -> Ui.Panel Message
view model =
    Component.Style.normalText 24
        (case model of
            Loading (Data.ProjectId projectIdAsString) ->
                projectIdAsString ++ "のプロジェクト詳細ページ"

            Loaded projectCacheWithId ->
                case projectCacheWithId.projectCache of
                    Just projectCache ->
                        projectCache.project.name

                    Nothing ->
                        "プロジェクトが見つからなかった"
        )
