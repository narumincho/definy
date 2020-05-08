module Page.User exposing (Message(..), Model, getUserId, init, update, updateByCommonMessage, view)

import CommonUi
import Data
import Data.LogInState
import Message
import Ui


type Model
    = Model Data.UserId


type Message
    = RequestLogInUrl Data.OpenIdConnectProvider


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
        RequestLogInUrl provider ->
            ( model
            , Message.RequestLogInUrl provider
            )


view : Message.SubModel -> Model -> Ui.Panel Message
view subModel (Model userId) =
    Ui.row
        Ui.stretch
        Ui.stretch
        []
        [ CommonUi.sidebarView subModel
            (case Message.getLogInState subModel of
                Data.LogInState.Ok user ->
                    if user.userSnapshotAndId.id == userId then
                        CommonUi.LogInUser

                    else
                        CommonUi.User

                _ ->
                    CommonUi.User
            )
            |> Ui.map RequestLogInUrl
        , case Message.getUserSnapshot userId subModel of
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
        ]


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
                                { blobUrl = blobUrl
                                , fitStyle = Ui.Contain
                                , alternativeText = userSnapshotAndId.snapshot.name ++ "のユーザー画像"
                                , rendering = Ui.ImageRenderingAuto
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
