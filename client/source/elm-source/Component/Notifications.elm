module Component.Notifications exposing (view)

import Component.Style as Style
import Ui


view : Ui.Panel msg
view =
    Ui.text
        []
        []
        Style.normalFont
        "通知。変化したときに大きく表示して、その後も固定して表示するものもある"
