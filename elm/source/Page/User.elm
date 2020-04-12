module Page.User exposing (Message(..), Model, getUserId, init, update, view)

import Command
import CommonUi
import Data
import SubModel
import Ui


type Model
    = Loading Data.UserId
    | Loaded Data.UserSnapshotMaybeAndId


type Message
    = ResponseUserSnapshotMaybeAndId Data.UserSnapshotMaybeAndId


init : Data.UserId -> ( Model, Command.Command )
init userId =
    ( Loading userId
    , Command.GetUser userId
    )


getUserId : Model -> Data.UserId
getUserId model =
    case model of
        Loading userId ->
            userId

        Loaded userSnapshotMaybeAndId ->
            userSnapshotMaybeAndId.id


update : Message -> Model -> ( Model, Command.Command )
update message model =
    case message of
        ResponseUserSnapshotMaybeAndId userSnapshotMaybeAndId ->
            if userSnapshotMaybeAndId.id == getUserId model then
                ( Loaded userSnapshotMaybeAndId
                , case userSnapshotMaybeAndId.snapshot of
                    Just userSnapshot ->
                        Command.GetBlobUrl userSnapshot.imageHash

                    Nothing ->
                        Command.None
                )

            else
                ( model
                , Command.None
                )


view : SubModel.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case model of
        Loading (Data.UserId userIdAsString) ->
            CommonUi.normalText 24 (userIdAsString ++ "のユーザー詳細ページ")

        Loaded userSnapshotMaybeAndId ->
            case userSnapshotMaybeAndId.snapshot of
                Just userSnapshot ->
                    normalView
                        subModel
                        { snapshot = userSnapshot
                        , id = userSnapshotMaybeAndId.id
                        }

                Nothing ->
                    notFoundView userSnapshotMaybeAndId.id


normalView : SubModel.SubModel -> Data.UserSnapshotAndId -> Ui.Panel Message
normalView subModel userSnapshotAndId =
    Ui.column
        []
        [ Ui.row
            []
            [ case SubModel.getImageBlobUrl userSnapshotAndId.snapshot.imageHash subModel of
                Just blobUrl ->
                    Ui.bitmapImage
                        []
                        (Ui.BitmapImageAttributes
                            { url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = userSnapshotAndId.snapshot.name ++ "のユーザー画像"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty
                        [ Ui.width (Ui.fix 32), Ui.height (Ui.fix 32) ]
            , CommonUi.normalText 24 userSnapshotAndId.snapshot.name
            ]
        , CommonUi.normalText 16 userSnapshotAndId.snapshot.introduction
        , Ui.row
            [ Ui.gap 16 ]
            [ CommonUi.normalText 16 "作成日時:"
            , CommonUi.timeView
                (SubModel.getTimeZoneAndNameMaybe subModel)
                userSnapshotAndId.snapshot.createTime
            ]
        ]


notFoundView : Data.UserId -> Ui.Panel Message
notFoundView (Data.UserId userId) =
    CommonUi.normalText 24 ("userId=" ++ userId ++ " のユーザーをみつけられなかった")
