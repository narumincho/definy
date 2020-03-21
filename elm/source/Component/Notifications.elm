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
import Dict
import Icon
import Ui


type Model
    = Model (List Event)


type Event
    = LogInSuccess Data.UserPublicAndUserId
    | LogInFailure
    | OnLine
    | OffLine


type Message
    = AddEvent Event
    | DeleteAt Int


init : ( Model, Command.Command )
init =
    ( Model [], Command.none )


update :
    Message
    -> Model
    -> ( Model, Command.Command )
update message (Model eventList) =
    case message of
        AddEvent (LogInSuccess userPublicAndUserId) ->
            ( Model (LogInSuccess userPublicAndUserId :: eventList)
            , Command.getBlobUrl userPublicAndUserId.userPublic.imageHash
            )

        AddEvent event ->
            ( Model (event :: eventList), Command.none )

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
            , Command.none
            )


view :
    Dict.Dict String String
    -> Model
    -> Ui.Panel Message
view imageBlobUrlDict (Model events) =
    Ui.row
        []
        0
        [ Ui.monochromatic
            []
            (Css.rgba 0 0 0 0)
        , Ui.column
            [ Ui.width 480 ]
            8
            (Ui.empty
                []
                :: (events
                        |> List.reverse
                        |> List.indexedMap (cardListView imageBlobUrlDict)
                   )
            )
        ]


cardListView : Dict.Dict String String -> Int -> Event -> Ui.Panel Message
cardListView imageBlobUrlDict index event =
    case event of
        LogInSuccess userAndUserId ->
            let
                (Data.FileHash fileHashAsString) =
                    userAndUserId.userPublic.imageHash
            in
            cardItem
                index
                (case Dict.get fileHashAsString imageBlobUrlDict of
                    Just blobUrl ->
                        Just
                            (Icon
                                { alternativeText = userAndUserId.userPublic.name ++ "のプロフィール画像"
                                , rendering = Ui.ImageRenderingPixelated
                                , url = blobUrl
                                }
                            )

                    Nothing ->
                        Nothing
                )
                ("「" ++ userAndUserId.userPublic.name ++ "」としてログインしました")

        LogInFailure ->
            cardItem
                index
                Nothing
                "ログイン失敗"

        OnLine ->
            cardItem
                index
                Nothing
                "オンラインになりました"

        OffLine ->
            cardItem
                index
                Nothing
                "オフラインになりました"


type Icon
    = Icon
        { alternativeText : String
        , rendering : Ui.ImageRendering
        , url : String
        }


cardItem : Int -> Maybe Icon -> String -> Ui.Panel Message
cardItem index iconMaybe text =
    Ui.depth
        [ Ui.height 48 ]
        [ Ui.monochromatic
            []
            (Css.rgb 0 100 0)
        , case iconMaybe of
            Just (Icon icon) ->
                Ui.row
                    [ Ui.padding 8 ]
                    0
                    [ Ui.imageFromUrl
                        [ Ui.width 32, Ui.height 32 ]
                        { fitStyle = Ui.Contain
                        , alternativeText = icon.alternativeText
                        , rendering = icon.rendering
                        }
                        icon.url
                    , Ui.textBox
                        []
                        { align = Ui.TextAlignStart
                        , vertical = Ui.CenterY
                        , font = Style.normalFont
                        }
                        text
                    , Icon.close |> Ui.map (always (DeleteAt index))
                    ]

            Nothing ->
                Ui.row
                    []
                    0
                    [ Ui.textBox
                        [ Ui.padding 8
                        ]
                        { align = Ui.TextAlignStart
                        , vertical = Ui.CenterY
                        , font = Style.normalFont
                        }
                        text
                    , Icon.close |> Ui.map (always (DeleteAt index))
                    ]
        ]
