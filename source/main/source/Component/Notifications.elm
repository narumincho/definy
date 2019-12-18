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
import Data.User
import Ui


type Model
    = Model (List Event)


type Event
    = LogInSuccess Data.User.User
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
        []
        0
        [ Ui.monochromatic
            []
            []
            (Css.rgba 0 0 0 0)
        , Ui.column
            []
            [ Ui.Width 480 ]
            0
            [ Ui.monochromatic
                []
                []
                (Css.rgba 0 0 0 0)
            , mainView events
            ]
        ]


mainView : List Event -> Ui.Panel msg
mainView events =
    Ui.column
        []
        []
        8
        (events
            |> List.reverse
            |> List.map card
        )


card : Event -> Ui.Panel msg
card event =
    case event of
        LogInSuccess user ->
            cardItem
                (Just
                    (Icon
                        { alternativeText = Data.User.getName user ++ "のプロフィール画像"
                        , rendering = Ui.ImageRenderingAuto
                        , url = Data.User.getImageUrl user
                        }
                    )
                )
                ("「" ++ Data.User.getName user ++ "」としてログインしました")

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
        []
        [ Ui.Height 48 ]
        [ Ui.monochromatic
            []
            []
            (Css.rgb 0 100 0)
        , case iconMaybe of
            Just (Icon icon) ->
                Ui.row
                    []
                    [ Ui.Padding 8 ]
                    0
                    [ Ui.imageFromUrl
                        []
                        [ Ui.Width 32, Ui.Height 32 ]
                        { fitStyle = Ui.Contain
                        , alternativeText = icon.alternativeText
                        , rendering = icon.rendering
                        }
                        icon.url
                    , Ui.textBox
                        []
                        []
                        { align = Ui.TextAlignStart
                        , vertical = Ui.CenterY
                        , font = Style.normalFont
                        }
                        text
                    ]

            Nothing ->
                Ui.textBox
                    []
                    [ Ui.Padding 8 ]
                    { align = Ui.TextAlignStart
                    , vertical = Ui.CenterY
                    , font = Style.normalFont
                    }
                    "オフラインになりました"
        ]
