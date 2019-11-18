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
            [ Ui.Width (Ui.Fix 480) ]
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
            |> List.map cardWithBackGround
        )


cardWithBackGround : Event -> Ui.Panel msg
cardWithBackGround event =
    Ui.depth
        []
        []
        [ Ui.monochromatic
            []
            []
            (Css.rgb 0 100 0)
        , card event
        ]


card : Event -> Ui.Panel msg
card event =
    case event of
        LogInSuccess user ->
            Ui.row
                []
                [ Ui.Height (Ui.Fix 48), Ui.Padding 8 ]
                0
                [ Ui.imageFromUrl
                    []
                    [ Ui.Width (Ui.Fix 32), Ui.Height (Ui.Fix 32) ]
                    { fitStyle = Ui.Contain
                    , alternativeText = Data.User.getName user ++ "のプロフィール画像"
                    , rendering = Ui.ImageRenderingAuto
                    }
                    (Data.User.getImageUrl user)
                , Ui.text
                    []
                    [ Ui.AlignItems Ui.CenterY ]
                    Style.normalFont
                    ("「" ++ Data.User.getName user ++ "」としてログインしました")
                ]

        LogInFailure ->
            Ui.text
                []
                [ Ui.Height (Ui.Fix 48), Ui.AlignItems Ui.CenterY, Ui.Padding 8 ]
                Style.normalFont
                "ログイン失敗"

        OnLine ->
            Ui.text
                []
                [ Ui.Height (Ui.Fix 48), Ui.AlignItems Ui.CenterY, Ui.Padding 8 ]
                Style.normalFont
                "オンラインになりました"

        OffLine ->
            Ui.text
                []
                [ Ui.Height (Ui.Fix 48), Ui.AlignItems Ui.CenterY, Ui.Padding 8 ]
                Style.normalFont
                "オフラインになりました"
