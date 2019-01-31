port module Main exposing (main)

import Browser
import Browser.Events
import Json.Decode
import Key
import Model exposing (Model, Msg)
import Task
import Update
import View



{-
   cd D:/Definy | elm make src/Main.elm --output main.js --optimize

   elm make src/Main.elm --output main.js --optimize
-}


port input : ({ text : String, caretPos : Int } -> msg) -> Sub msg


port keyDown : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (Int -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


main : Program () Model Msg
main =
    Browser.document
        { init = init
        , view = View.view
        , update = Update.update
        , subscriptions = subscriptions
        }


init : () -> ( Model, Cmd Msg )
init _ =
    ( Model.initModel
    , Model.initCmd Model.initModel
    )


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        ([ keyDown (Key.fromKeyEventObject >> Model.KeyPressed)
         , keyPrevented (always Model.KeyPrevented)
         , windowResize Model.WindowResize
         ]
            ++ (if Model.isCaptureMouseEvent model then
                    [ Browser.Events.onMouseMove
                        (Json.Decode.map2 (\x y -> Model.MouseMove { x = x, y = y })
                            (Json.Decode.field "clientX" Json.Decode.int)
                            (Json.Decode.field "clientY" Json.Decode.int)
                        )
                    , Browser.Events.onMouseUp
                        (Json.Decode.succeed Model.MouseUp)
                    , Browser.Events.onVisibilityChange
                        (always Model.MouseUp)
                    ]

                else
                    []
               )
        )
