module Component.Notifications exposing
    ( Event(..)
    , Message(..)
    , Model
    , init
    , update
    , view
    )

import Array
import Command
import Component.Style as Style
import Css
import Data
import Icon
import ImageStore
import SubModel
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


init : ( Model, Command.Command )
init =
    ( Model [], Command.None )


update :
    Message
    -> Model
    -> ( Model, Command.Command )
update message (Model eventList) =
    case message of
        AddEvent (LogInSuccess userAndUserId) ->
            ( Model (LogInSuccess userAndUserId :: eventList)
            , Command.GetBlobUrl userAndUserId.snapshot.imageHash
            )

        AddEvent (CreatedProject projectAndId) ->
            ( Model (CreatedProject projectAndId :: eventList)
            , Command.GetBlobUrl projectAndId.snapshot.imageHash
            )

        AddEvent event ->
            ( Model (event :: eventList), Command.None )

        DeleteAt index ->
            let
                eventListAsArray =
                    eventList |> Array.fromList
            in
            ( Model
                (Array.toList
                    (Array.append
                        (Array.slice 0 (index - 1) eventListAsArray)
                        (Array.slice index (Array.length eventListAsArray - 1) eventListAsArray)
                    )
                )
            , Command.None
            )


view :
    SubModel.SubModel
    -> Model
    -> Ui.Panel Message
view subModel (Model eventList) =
    Ui.column
        [ Ui.width (Ui.fix 512)
        , Ui.gap 8
        , Ui.padding 16
        ]
        (List.indexedMap
            (\index event ->
                cardItem index (eventToCardStyle (SubModel.getImageStore subModel) event)
            )
            eventList
        )


eventToCardStyle : ImageStore.ImageStore -> Event -> CardStyle
eventToCardStyle imageStore event =
    case event of
        LogInSuccess userAndUserId ->
            CardStyle
                { icon =
                    ImageStore.getImageBlobUrl userAndUserId.snapshot.imageHash imageStore
                        |> Maybe.map
                            (\blobUrl ->
                                Icon
                                    { alternativeText =
                                        userAndUserId.snapshot.name ++ "のプロフィール画像"
                                    , url = blobUrl
                                    }
                            )
                , text = "「" ++ userAndUserId.snapshot.name ++ "」としてログインしました"
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
                    ImageStore.getImageBlobUrl projectAndId.snapshot.imageHash imageStore
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
        [ Ui.backgroundColor (Css.rgb 0 100 0)
        , Ui.width Ui.stretch
        , Ui.height (Ui.fix 48)
        ]
        [ case record.icon of
            Just (Icon icon) ->
                Ui.bitmapImage [ Ui.padding 4, Ui.width (Ui.fix 48) ]
                    (Ui.BitmapImageAttributes
                        { url = icon.url
                        , fitStyle = Ui.Contain
                        , alternativeText = icon.alternativeText
                        , rendering = Ui.ImageRenderingPixelated
                        }
                    )

            Nothing ->
                Ui.empty [ Ui.width (Ui.fix 32) ]
        , Ui.text
            [ Ui.padding 8, Ui.width Ui.stretch ]
            (Ui.TextAttributes
                { text = record.text
                , typeface = Style.normalTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                , textAlignment = Ui.TextAlignStart
                }
            )
        , Ui.button [ Ui.width (Ui.fix 32) ] (DeleteAt index) Icon.close
        ]
