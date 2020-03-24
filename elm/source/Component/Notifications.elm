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
import SubData
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
view imageBlobUrlDict (Model eventList) =
    Ui.column
        [ Ui.width (Ui.fix 480), Ui.gap 8 ]
        (List.indexedMap
            (\index event ->
                cardItem index (eventToCardStyle imageBlobUrlDict event)
            )
            (List.reverse eventList)
        )


eventToCardStyle : Dict.Dict String String -> Event -> CardStyle
eventToCardStyle imageBlobUrlDict event =
    case event of
        LogInSuccess userAndUserId ->
            CardStyle
                { icon =
                    case SubData.getUserImage imageBlobUrlDict userAndUserId.userPublic of
                        Just blobUrl ->
                            Just
                                (Icon
                                    { alternativeText =
                                        userAndUserId.userPublic.name ++ "のプロフィール画像"
                                    , url = blobUrl
                                    }
                                )

                        Nothing ->
                            Nothing
                , text = "「" ++ userAndUserId.userPublic.name ++ "」としてログインしました"
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
        , Ui.textBox
            [ Ui.padding 8, Ui.width Ui.stretch ]
            (Ui.TextBoxAttributes
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
