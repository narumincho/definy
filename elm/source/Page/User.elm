module Page.User exposing (Message(..), Model, getUserId, init, update, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Loading Data.UserId
    | Loaded Data.UserResponse


type Message
    = ResponseUserSnapshotMaybeAndId Data.UserResponse


init : Data.UserId -> ( Model, Message.Command )
init userId =
    ( Loading userId
    , Message.GetUser userId
    )


getUserId : Model -> Data.UserId
getUserId model =
    case model of
        Loading userId ->
            userId

        Loaded userSnapshotMaybeAndId ->
            userSnapshotMaybeAndId.id


update : Message -> Model -> ( Model, Message.Command )
update message model =
    case message of
        ResponseUserSnapshotMaybeAndId userSnapshotMaybeAndId ->
            if userSnapshotMaybeAndId.id == getUserId model then
                ( Loaded userSnapshotMaybeAndId
                , case userSnapshotMaybeAndId.snapshotMaybe of
                    Just userSnapshot ->
                        Message.GetBlobUrl userSnapshot.imageHash

                    Nothing ->
                        Message.None
                )

            else
                ( model
                , Message.None
                )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel model =
    case model of
        Loading (Data.UserId userIdAsString) ->
            CommonUi.normalText 24 (userIdAsString ++ "のユーザー詳細ページ")

        Loaded userSnapshotMaybeAndId ->
            case userSnapshotMaybeAndId.snapshotMaybe of
                Just userSnapshot ->
                    normalView
                        subModel
                        { snapshot = userSnapshot
                        , id = userSnapshotMaybeAndId.id
                        }

                Nothing ->
                    notFoundView userSnapshotMaybeAndId.id


normalView : Message.SubModel -> Data.UserSnapshotAndId -> Ui.Panel Message
normalView subModel userSnapshotAndId =
    Ui.column
        []
        [ Ui.row
            []
            [ case Message.getImageBlobUrl userSnapshotAndId.snapshot.imageHash subModel of
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
                (Message.getTimeZoneAndNameMaybe subModel)
                userSnapshotAndId.snapshot.createTime
            ]
        ]


notFoundView : Data.UserId -> Ui.Panel Message
notFoundView (Data.UserId userId) =
    CommonUi.normalText 24 ("userId=" ++ userId ++ " のユーザーをみつけられなかった")
