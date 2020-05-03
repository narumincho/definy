module Component.Notifications exposing
    ( Event(..)
    , Message(..)
    , Model
    , init
    , update
    , view
    )

import Array
import CommonUi
import Css
import Data
import Message
import Ui


type Model
    = Model (List Event)


type Event
    = LogInSuccess Data.UserSnapshotAndId
    | LogInFailure
    | OnLine
    | OffLine
    | CreatedProject Data.ProjectSnapshotAndId
    | CreateProjectFailed


type Message
    = AddEvent Event
    | DeleteAt Int


init : ( Model, Message.Command )
init =
    ( Model [], Message.None )


update :
    Message
    -> Model
    -> ( Model, Message.Command )
update message (Model eventList) =
    case message of
        AddEvent (LogInSuccess userAndUserId) ->
            ( Model (LogInSuccess userAndUserId :: eventList)
            , Message.GetBlobUrl userAndUserId.snapshot.imageHash
            )

        AddEvent (CreatedProject projectAndId) ->
            ( Model (CreatedProject projectAndId :: eventList)
            , Message.GetBlobUrl projectAndId.snapshot.imageHash
            )

        AddEvent event ->
            ( Model (event :: eventList), Message.None )

        DeleteAt index ->
            let
                eventListAsArray =
                    eventList |> Array.fromList
            in
            ( Model
                (Array.toList
                    (Array.append
                        (Array.slice 0 (max 0 index) eventListAsArray)
                        (Array.slice (index + 1) (Array.length eventListAsArray) eventListAsArray)
                    )
                )
            , Message.None
            )


view :
    Message.SubModel
    -> Model
    -> Ui.Panel Message
view subModel (Model eventList) =
    Ui.column
        (Ui.fix 512)
        Ui.auto
        [ Ui.gap 8
        , Ui.padding 16
        ]
        (List.indexedMap
            (\index event ->
                cardItem index (eventToCardStyle subModel event)
            )
            eventList
        )


eventToCardStyle : Message.SubModel -> Event -> CardStyle
eventToCardStyle subModel event =
    case event of
        LogInSuccess userAndUserId ->
            CardStyle
                { icon =
                    Message.getImageBlobUrl userAndUserId.snapshot.imageHash subModel
                        |> Maybe.map
                            (\blobUrl ->
                                Icon
                                    { alternativeText =
                                        userAndUserId.snapshot.name ++ "のプロフィール画像"
                                    , url = blobUrl
                                    }
                            )
                , text = "\"" ++ userAndUserId.snapshot.name ++ "\"としてログインしました"
                }

        LogInFailure ->
            CardStyle
                { icon = Nothing
                , text = "ログイン失敗"
                }

        OnLine ->
            CardStyle
                { icon = Nothing
                , text = "オンラインになりました"
                }

        OffLine ->
            CardStyle
                { icon = Nothing
                , text = "オフラインになりました"
                }

        CreatedProject projectAndId ->
            CardStyle
                { icon =
                    Message.getImageBlobUrl projectAndId.snapshot.imageHash subModel
                        |> Maybe.map
                            (\blobUrl ->
                                Icon
                                    { alternativeText = projectAndId.snapshot.name ++ "のアイコン"
                                    , url = blobUrl
                                    }
                            )
                , text = projectAndId.snapshot.name ++ "を作成しました"
                }

        CreateProjectFailed ->
            CardStyle
                { icon = Nothing
                , text = "プロジェクトの作成に失敗しました"
                }


type Icon
    = Icon
        { alternativeText : String
        , url : String
        }


type CardStyle
    = CardStyle
        { icon : Maybe Icon
        , text : String
        }


cardItem : Int -> CardStyle -> Ui.Panel Message
cardItem index (CardStyle record) =
    Ui.row
        Ui.stretch
        (Ui.fix 48)
        [ Ui.backgroundColor (Css.rgb 0 100 0) ]
        [ case record.icon of
            Just (Icon icon) ->
                Ui.bitmapImage
                    (Ui.fix 48)
                    (Ui.fix 48)
                    [ Ui.padding 4 ]
                    (Ui.BitmapImageAttributes
                        { blobUrl = icon.url
                        , fitStyle = Ui.Contain
                        , alternativeText = icon.alternativeText
                        , rendering = Ui.ImageRenderingAuto
                        }
                    )

            Nothing ->
                Ui.empty (Ui.fix 32) (Ui.fix 32) []
        , CommonUi.stretchText
            16
            record.text
        , Ui.button (Ui.fix 32) (Ui.fix 32) [] (DeleteAt index) CommonUi.closeIcon
        ]
