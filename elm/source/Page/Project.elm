module Page.Project exposing (Message(..), Model, getProjectId, init, update, updateByCommonMessage, view)

import CommonUi
import Css
import Data
import Message
import Ui


type Model
    = Loading Data.ProjectId
    | NotFound Data.ProjectId
    | Loaded LoadedModel


type alias LoadedModel =
    { snapshotAndId : Data.ProjectSnapshotAndId, ideaList : Maybe (List Data.IdeaSnapshotAndId) }


type Message
    = NoOperation


init : Data.ProjectId -> ( Model, Message.Command )
init projectId =
    ( Loading projectId
    , Message.GetProject projectId
    )


getProjectId : Model -> Data.ProjectId
getProjectId model =
    case model of
        Loading projectId ->
            projectId

        NotFound projectId ->
            projectId

        Loaded { snapshotAndId } ->
            snapshotAndId.id


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage message model =
    case ( message, model ) of
        ( Message.ResponseProject response, _ ) ->
            if response.id == getProjectId model then
                case response.snapshotMaybe of
                    Just projectSnapshot ->
                        ( Loaded
                            { snapshotAndId =
                                { id = response.id
                                , snapshot = projectSnapshot
                                }
                            , ideaList = Nothing
                            }
                        , Message.Batch
                            [ Message.GetBlobUrl projectSnapshot.imageHash
                            , Message.GetBlobUrl projectSnapshot.iconHash
                            , Message.GetUser projectSnapshot.createUser
                            , Message.GetIdeaListByProjectId (getProjectId model)
                            ]
                        )

                    Nothing ->
                        ( NotFound response.id
                        , Message.None
                        )

            else
                ( model, Message.None )

        ( Message.ResponseIdeaListByProjectId response, Loaded snapshotAndId ) ->
            if getProjectId model == response.projectId then
                ( Loaded
                    { snapshotAndId | ideaList = Just response.ideaSnapshotAndIdList }
                , Message.None
                )

            else
                ( model
                , Message.None
                )

        ( _, _ ) ->
            ( model
            , Message.None
            )


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case message of
        NoOperation ->
            ( model
            , Message.None
            )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case model of
        Loading projectId ->
            loadingView projectId

        NotFound projectId ->
            notFoundView projectId

        Loaded loadedModel ->
            normalView subModel loadedModel


loadingView : Data.ProjectId -> Ui.Panel message
loadingView (Data.ProjectId projectIdAsString) =
    CommonUi.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを読込中")


normalView : Message.SubModel -> LoadedModel -> Ui.Panel Message
normalView subModel loadedModel =
    let
        (Data.ProjectId projectIdAsString) =
            loadedModel.snapshotAndId.id
    in
    Ui.column
        [ Ui.gap 8 ]
        [ CommonUi.subText projectIdAsString
        , Ui.row
            [ Ui.width Ui.stretch ]
            [ case Message.getImageBlobUrl loadedModel.snapshotAndId.snapshot.iconHash subModel of
                Just blobUrl ->
                    Ui.bitmapImage
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
                        (Ui.BitmapImageAttributes
                            { url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = loadedModel.snapshotAndId.snapshot.name ++ "のアイコン"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
            , CommonUi.normalText 16 loadedModel.snapshotAndId.snapshot.name
            ]
        , case Message.getImageBlobUrl loadedModel.snapshotAndId.snapshot.imageHash subModel of
            Just blobUrl ->
                Ui.bitmapImage
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    (Ui.BitmapImageAttributes
                        { url = blobUrl
                        , fitStyle = Ui.Contain
                        , alternativeText = loadedModel.snapshotAndId.snapshot.name ++ "のアイコン"
                        , rendering = Ui.ImageRenderingPixelated
                        }
                    )

            Nothing ->
                Ui.depth
                    [ Ui.width (Ui.stretchWithMaxSize 640), Ui.height Ui.auto ]
                    [ ( ( Ui.Center, Ui.Center ), CommonUi.normalText 16 (loadedModel.snapshotAndId.snapshot.name ++ "の画像を読込中") ) ]
        , createUserView subModel loadedModel.snapshotAndId.snapshot.createUser
        , createTime subModel loadedModel.snapshotAndId.snapshot.createTime
        , updateTime subModel loadedModel.snapshotAndId.snapshot.updateTime
        , ideaListView subModel loadedModel.snapshotAndId.id loadedModel.ideaList
        ]


ideaListView : Message.SubModel -> Data.ProjectId -> Maybe (List Data.IdeaSnapshotAndId) -> Ui.Panel Message
ideaListView subModel projectId ideaSnapshotAndIdListMaybe =
    Ui.column
        [ Ui.width Ui.stretch
        , Ui.gap 16
        ]
        ([ CommonUi.stretchText 24 "アイデア"
         , CommonUi.sameLanguageLink
            [ Ui.width Ui.stretch
            , Ui.padding 8
            , Ui.backgroundColor (Css.rgb 20 20 20)
            ]
            subModel
            (Data.LocationCreateIdea projectId)
            (CommonUi.normalText 16 "アイデアを作成する")
         ]
            ++ (case ideaSnapshotAndIdListMaybe of
                    Just ideaSnapshotAndIdList ->
                        List.map
                            (ideaItemView subModel)
                            ideaSnapshotAndIdList

                    Nothing ->
                        []
               )
        )


ideaItemView : Message.SubModel -> Data.IdeaSnapshotAndId -> Ui.Panel message
ideaItemView subModel ideaSnapshotAndId =
    CommonUi.sameLanguageLink
        [ Ui.width Ui.stretch ]
        subModel
        (Data.LocationIdea ideaSnapshotAndId.id)
        (Ui.column
            [ Ui.width Ui.stretch ]
            [ CommonUi.stretchText 24 ideaSnapshotAndId.snapshot.name
            , Ui.row
                [ Ui.width Ui.stretch ]
                [ CommonUi.normalText 16 "更新日時:"
                , CommonUi.timeView
                    (Message.getTimeZoneAndNameMaybe subModel)
                    ideaSnapshotAndId.snapshot.updateTime
                ]
            ]
        )


notFoundView : Data.ProjectId -> Ui.Panel Message
notFoundView (Data.ProjectId projectIdAsString) =
    CommonUi.normalText 24
        ("projectId = " ++ projectIdAsString ++ "のプロジェクトを見つからなかった")


createUserView : Message.SubModel -> Data.UserId -> Ui.Panel Message
createUserView subModel userId =
    Ui.row
        [ Ui.width Ui.stretch, Ui.gap 8 ]
        [ CommonUi.normalText 16 "作成者:"
        , CommonUi.userView subModel userId (Message.getUserSnapshot userId subModel)
        ]


createTime : Message.SubModel -> Data.Time -> Ui.Panel Message
createTime subModel time =
    Ui.row
        [ Ui.width Ui.stretch, Ui.gap 8 ]
        [ CommonUi.normalText 16 "作成日時:"
        , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel) time
        ]


updateTime : Message.SubModel -> Data.Time -> Ui.Panel Message
updateTime subModel time =
    Ui.row
        [ Ui.width Ui.stretch, Ui.gap 8 ]
        [ CommonUi.normalText 16 "更新日時:"
        , CommonUi.timeView (Message.getTimeZoneAndNameMaybe subModel) time
        ]
