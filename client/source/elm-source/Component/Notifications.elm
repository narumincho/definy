module Component.Notifications exposing (view)

import Component.Style as Style
import Css
import Ui


view : Ui.Panel msg
view =
    Ui.column
        []
        []
        0
        [ Ui.monochromatic
            []
            []
            (Css.rgba 0 0 0 0)
        , Ui.row
            []
            [ Ui.Height (Ui.Fix 64) ]
            0
            [ Ui.monochromatic
                []
                []
                (Css.rgba 0 0 0 0)
            , Ui.text
                []
                []
                Style.normalFont
                "通知。変化したときに大きく表示して、その後も固定して表示するものもある"
            ]
        ]
