module Page.User exposing (Message(..), Model, getUserId, init, update, updateByCommonMessage, view)

import CommonUi
import Data
import Message
import Ui


type Model
    = Model Data.UserId


type Message
    = NoOperation


init : Data.UserId -> ( Model, Message.Command )
init userId =
    ( Model userId
    , Message.GetUser userId
    )


getUserId : Model -> Data.UserId
getUserId model =
    case model of
        Model userId ->
            userId


updateByCommonMessage : Message.CommonMessage -> Model -> ( Model, Message.Command )
updateByCommonMessage message model =
    case message of
        _ ->
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
view subModel (Model userId) =
    case Message.getUserSnapshot userId subModel of
        Just (Just userSnapshot) ->
            normalView
                subModel
                { snapshot = userSnapshot
                , id = userId
                }

        Just Nothing ->
            notFoundView userId

        Nothing ->
            let
                (Data.UserId userIdAsString) =
                    userId
            in
            CommonUi.normalText 24 (userIdAsString ++ "のユーザー詳細ページ")


normalView : Message.SubModel -> Data.UserSnapshotAndId -> Ui.Panel Message
normalView subModel userSnapshotAndId =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        [ Ui.column
            (Ui.stretchWithMaxSize 800)
            Ui.auto
            []
            [ Ui.row
                Ui.auto
                Ui.auto
                []
                [ case Message.getImageBlobUrl userSnapshotAndId.snapshot.imageHash subModel of
                    Just blobUrl ->
                        Ui.bitmapImage
                            (Ui.fix 32)
                            (Ui.fix 32)
                            []
                            (Ui.BitmapImageAttributes
                                { url = blobUrl
                                , fitStyle = Ui.Contain
                                , alternativeText = userSnapshotAndId.snapshot.name ++ "のユーザー画像"
                                , rendering = Ui.ImageRenderingPixelated
                                }
                            )

                    Nothing ->
                        Ui.empty (Ui.fix 32) (Ui.fix 32) []
                , CommonUi.normalText 24 userSnapshotAndId.snapshot.name
                ]
            , CommonUi.normalText 16 userSnapshotAndId.snapshot.introduction
            , CommonUi.table
                [ ( "作成日時"
                  , CommonUi.timeView
                        subModel
                        userSnapshotAndId.snapshot.createTime
                  )
                , ( "取得日時", CommonUi.timeView subModel userSnapshotAndId.snapshot.getTime )
                ]
            ]
        ]


notFoundView : Data.UserId -> Ui.Panel Message
notFoundView (Data.UserId userId) =
    CommonUi.normalText 24 ("userId=" ++ userId ++ " のユーザーをみつけられなかった")
