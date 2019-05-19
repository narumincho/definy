module Main exposing (main)

import Browser
import Model
import View


main : Platform.Program { url : String, user : Maybe { name : String, imageUrl : String, token : String } } Model.Model Model.Msg
main =
    Browser.element
        { init = Model.init
        , view = View.view
        , update = Model.update
        , subscriptions = Model.subscriptions
        }
