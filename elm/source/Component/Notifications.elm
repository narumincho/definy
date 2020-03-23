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
view imageBlobUrlDict (Model events) =
    Ui.row
        (Ui.RowListAttributes
            { styleAndEvent = []
            , gap = 0
            , children =
                [ ( Ui.grow, Ui.empty [] )
                , ( Ui.fix 480
                  , cardListView imageBlobUrlDict events
                  )
                ]
            }
        )


cardListView :
    Dict.Dict String String
    -> List Event
    -> Ui.Panel Message
cardListView imageBlobUrlDict eventList =
    Ui.column
        (Ui.ColumnListAttributes
            { styleAndEvent = []
            , gap = 8
            , children =
                ( Ui.grow, Ui.empty [] )
                    :: List.indexedMap
                        (\index event ->
                            ( Ui.fix 48
                            , cardItem index (eventToCardStyle imageBlobUrlDict event)
                            )
                        )
                        (List.reverse eventList)
            }
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
    case record.icon of
        Just (Icon icon) ->
            { styleAndEvent =
                [ Ui.padding 8
                , Ui.backgroundColor (Css.rgb 0 100 0)
                ]
            , gap = 0
            , children =
                [ ( Ui.fix 32
                  , { styleAndEvent = []
                    , url = icon.url
                    , fitStyle = Ui.Contain
                    , alternativeText = icon.alternativeText
                    , rendering = Ui.ImageRenderingPixelated
                    }
                        |> Ui.BitmapImageAttributes
                        |> Ui.bitmapImage
                  )
                , ( Ui.grow
                  , { styleAndEvent = []
                    , text = record.text
                    , typeface = Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 255 255 255
                    , textAlignment = Ui.TextAlignStart
                    }
                        |> Ui.TextBoxAttributes
                        |> Ui.textBox
                  )
                , ( Ui.fix 32, Icon.close |> Ui.map (always (DeleteAt index)) )
                ]
            }
                |> Ui.RowListAttributes
                |> Ui.row

        Nothing ->
            Ui.RowListAttributes
                { styleAndEvent = [ Ui.backgroundColor (Css.rgb 0 100 0) ]
                , gap = 0
                , children =
                    [ ( Ui.grow
                      , { styleAndEvent = []
                        , text = record.text
                        , typeface = Style.normalTypeface
                        , size = 16
                        , letterSpacing = 0
                        , color = Css.rgb 255 255 255
                        , textAlignment = Ui.TextAlignStart
                        }
                            |> Ui.TextBoxAttributes
                            |> Ui.textBox
                      )
                    , ( Ui.fix 32, Icon.close |> Ui.map (always (DeleteAt index)) )
                    ]
                }
                |> Ui.row
