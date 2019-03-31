port module Main exposing (main)

import Browser
import Browser.Events
import Json.Decode
import Key
import Model exposing (Model, Msg)
import Task
import View


port input : ({ text : String, caretPos : Int } -> msg) -> Sub msg


port keyDown : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port runResult : ({ ref : List Int, index : Int, result : Int } -> msg) -> Sub msg


port fireClickEventInCapturePhase : (String -> msg) -> Sub msg


main : Program () Model Msg
main =
    Browser.document
        { init = always Model.init
        , view = View.view
        , update = Model.update
        , subscriptions = subscriptions
        }


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        ([ keyDown (Key.fromKeyEventObject >> Model.KeyPressed)
         , keyPrevented (always Model.KeyPrevented)
         , windowResize Model.WindowResize
         , runResult Model.ReceiveResultValue
         , fireClickEventInCapturePhase Model.FireClickEventInCapturePhase
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
