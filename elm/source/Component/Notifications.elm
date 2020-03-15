module Component.Notifications exposing
    ( Event(..)
    , Message(..)
    , Model
    , addEvent
    , initModel
    , view
    )

import Component.Style as Style
import Css
import Data
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


initModel : Model
initModel =
    Model []


addEvent : Event -> Model -> Model
addEvent event (Model events) =
    Model (event :: events)


view : Model -> Ui.Panel msg
view (Model events) =
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
                        |> List.map card
                   )
            )
        ]


card : Event -> Ui.Panel msg
card event =
    case event of
        LogInSuccess userAndUserId ->
            cardItem
                Nothing
                ("「" ++ userAndUserId.userPublic.name ++ "」としてログインしました")

        LogInFailure ->
            cardItem
                Nothing
                "ログイン失敗"

        OnLine ->
            cardItem
                Nothing
                "オンラインになりました"

        OffLine ->
            cardItem
                Nothing
                "オフラインになりました"


type Icon
    = Icon
        { alternativeText : String
        , rendering : Ui.ImageRendering
        , url : String
        }


cardItem : Maybe Icon -> String -> Ui.Panel msg
cardItem iconMaybe text =
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
                    ]

            Nothing ->
                Ui.textBox
                    [ Ui.padding 8 ]
                    { align = Ui.TextAlignStart
                    , vertical = Ui.CenterY
                    , font = Style.normalFont
                    }
                    text
        ]
