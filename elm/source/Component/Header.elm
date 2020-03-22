module Component.Header exposing (view)

import Component.Style
import Css
import Ui


view : Ui.Panel msg
view =
    Ui.depthList
        [ Ui.height 56 ]
        [ Ui.monochromatic
            []
            (Css.rgb 36 36 36)
        , Ui.rowList
            []
            0
            [ logo
            , Ui.empty []
            ]
        ]


logo : Ui.Panel msg
logo =
    Ui.textBox
        [ Ui.padding 8, Ui.width 128 ]
        { align = Ui.TextAlignStart
        , vertical = Ui.CenterY
        , font =
            Ui.Font
                { typeface = Component.Style.codeFontTypeface
                , size = 32
                , letterSpacing = 0
                , color = Css.rgb 185 208 155
                }
        }
        "Definy"


menuItem : String -> Ui.Panel msg
menuItem text =
    Ui.textBox
        [ Ui.width 128, Ui.padding 8 ]
        { align = Ui.TextAlignStart
        , vertical = Ui.CenterY
        , font =
            Ui.Font
                { typeface = Component.Style.codeFontTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                }
        }
        text
