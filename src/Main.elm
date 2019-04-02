module Main exposing (main)

import Browser
import Model
import View


main : Platform.Program () Model.Model Model.Msg
main =
    Browser.document
        { init = always Model.init
        , view = View.view
        , update = Model.update
        , subscriptions = Model.subscriptions
        }
