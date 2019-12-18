module Component.Header exposing (view)

import Css
import Style
import Ui


view : Ui.Panel msg
view =
    Ui.depth
        []
        [ Ui.Height (Ui.Fix 48)
        ]
        [ Ui.monochromatic [] [] (Css.rgb 36 36 36)
        , Ui.row
            []
            [ Ui.AlignItems Ui.CenterY ]
            16
            [ Ui.text []
                []
                (Ui.Font
                    { typeface = Style.codeFontTypeface
                    , size = 32
                    , letterSpacing = 0
                    , color = Css.rgb 185 208 155
                    }
                )
                "Definy"
            , Ui.monochromatic
                []
                [ Ui.Width (Ui.Flex 1) ]
                (Css.rgba 0 0 0 0)
            , menuItem "ユーザー情報"
            , menuItem "通知"
            , menuItem "コルクボード"
            ]
        ]


menuItem : String -> Ui.Panel msg
menuItem text =
    Ui.text
        []
        []
        (Ui.Font
            { typeface = Style.codeFontTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            }
        )
        text
