module Component.Header exposing (view)

import Component.Style
import Css
import Ui


view : Ui.Panel msg
view =
    Ui.depth
        []
        [ Ui.Height 56
        ]
        [ Ui.monochromatic [] [] (Css.rgb 36 36 36)
        , Ui.row
            []
            []
            0
            [ logo
            , Ui.monochromatic
                []
                []
                (Css.rgba 0 0 0 0)
            , menuItem "ユーザー情報"
            , menuItem "通知"
            , menuItem "コルクボード"
            ]
        ]


logo : Ui.Panel msg
logo =
    Ui.textBox []
        [ Ui.Padding 8, Ui.Width 128 ]
        { align = Just Ui.TextAlignStart
        , vertical = Just Ui.CenterY
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
        []
        [ Ui.Width 128, Ui.Padding 8 ]
        { align = Just Ui.TextAlignStart
        , vertical = Just Ui.CenterY
        , font =
            Ui.Font
                { typeface = Component.Style.codeFontTypeface
                , size = 16
                , letterSpacing = 0
                , color = Css.rgb 200 200 200
                }
        }
        text
