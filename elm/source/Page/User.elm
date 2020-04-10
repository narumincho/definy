module Page.User exposing (Message(..), Model, getUserId, init, update, view)

import Command
import Component.Style
import Data
import ImageStore
import Time
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


view : Time.Zone -> ImageStore.ImageStore -> Model -> Ui.Panel Message
view timeZone imageStore model =
    case model of
        Loading (Data.UserId userIdAsString) ->
            Component.Style.normalText 24 (userIdAsString ++ "のユーザー詳細ページ")

        Loaded userSnapshotMaybeAndId ->
            case userSnapshotMaybeAndId.snapshot of
                Just userSnapshot ->
                    normalView
                        timeZone
                        imageStore
                        { snapshot = userSnapshot
                        , id = userSnapshotMaybeAndId.id
                        }

                Nothing ->
                    notFoundView userSnapshotMaybeAndId.id


normalView : Time.Zone -> ImageStore.ImageStore -> Data.UserSnapshotAndId -> Ui.Panel Message
normalView timeZone imageStore userSnapshotAndId =
    Ui.column
        []
        [ Ui.row
            []
            [ case ImageStore.getImageBlobUrl userSnapshotAndId.snapshot.imageHash imageStore of
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
            , Component.Style.normalText 24 userSnapshotAndId.snapshot.name
            ]
        , Component.Style.normalText 16 userSnapshotAndId.snapshot.introduction
        , Ui.row
            [ Ui.gap 16 ]
            [ Component.Style.normalText 16 "作成日時:"
            , Component.Style.timeView timeZone userSnapshotAndId.snapshot.createTime
            ]
        ]


notFoundView : Data.UserId -> Ui.Panel Message
notFoundView (Data.UserId userId) =
    Component.Style.normalText 24 ("userId=" ++ userId ++ " のユーザーをみつけられなかった")
