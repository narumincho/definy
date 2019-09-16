module Panel.Editor.EditorKeyConfig exposing (Model(..), Msg, initModel, isInputKeyboardDirect, update, view)

{-| どのキーを選択しているか、検索文字はなにか
-}

import Color
import Css
import Data.Key as Key
import Html.Styled
import Html.Styled.Attributes
import Palette.X11 as P
import Panel.Style as Style
import VectorImage


type Model
    = Model
        { selectedKey : Maybe Key.OneKey
        , inputDevice : InputDevice
        }


type InputDevice
    = Keyboard
    | Mouse
    | Gamepad
    | MidiKeyboard


type Msg
    = SelectKey Key.OneKey
    | KeyDown Key.OneKey
    | KeyUp Key.OneKey
    | ChangeInputDevice InputDevice


type Cmd
    = Cmd


initModel : Model
initModel =
    Model
        { selectedKey = Nothing
        , inputDevice = Keyboard
        }


update : Msg -> Model -> ( Model, Maybe Cmd )
update msg (Model rec) =
    case msg of
        SelectKey oneKey ->
            ( Model
                { rec
                    | selectedKey = Just oneKey
                }
            , Nothing
            )

        KeyDown oneKey ->
            ( Model rec
            , Nothing
            )

        KeyUp oneKey ->
            ( Model rec
            , Nothing
            )

        ChangeInputDevice inputDevice ->
            ( Model
                { rec
                    | inputDevice = inputDevice
                }
            , Nothing
            )


view : Model -> { title : String, body : List (Html.Styled.Html Msg) }
view (Model { selectedKey, inputDevice }) =
    { title = "エディタのキーコンフィグ"
    , body =
        [ Html.Styled.div
            [ Html.Styled.Attributes.css
                [ Css.padding2 Css.zero (Css.px 16) ]
            ]
            ([ inputSourceTab inputDevice ]
                ++ (case inputDevice of
                        Keyboard ->
                            [ VectorImage.toHtml { x = 0, y = 0, width = 6500, height = 1800 } Nothing (keyboard selectedKey) ]

                        Mouse ->
                            [ Html.Styled.text "マウスの画面" ]

                        Gamepad ->
                            [ Html.Styled.text "ゲームパッドの画面" ]

                        MidiKeyboard ->
                            [ Html.Styled.text "MIDIキーボードの画面" ]
                   )
                ++ ([ "Up", "Down", "Select Parent Or Tree Close", "Select First Child Or TreeOpen" ]
                        |> List.map messageCard
                   )
                ++ [ Html.Styled.text "ゲームパッドの操作を受け付けるかどうかCtrlとWを押したときにWのメッセージを送信するかどうかと、GamePadとMIDIキーボードの入力" ]
            )
        ]
    }


isInputKeyboardDirect : Model -> Bool
isInputKeyboardDirect (Model { selectedKey }) =
    selectedKey == Nothing


inputSourceTab : InputDevice -> Html.Styled.Html Msg
inputSourceTab selectedDevice =
    Style.tabContainer
        selectedDevice
        [ ( Keyboard, "キーボード" )
        , ( Mouse, "マウス" )
        , ( Gamepad, "ゲームパッド" )
        , ( MidiKeyboard, "MIDIキーボード" )
        ]
        |> Html.Styled.map ChangeInputDevice


keyboard : Maybe Key.OneKey -> List (VectorImage.Element Msg)
keyboard oneKey =
    [ VectorImage.rect { width = 6500, height = 1800 } (VectorImage.strokeColorWidth P.black 3) VectorImage.fillNone ]
        ++ List.concat
            ((keyList
                |> List.map (addKeyFrameAndClick oneKey)
             )
                ++ (case oneKey of
                        Just key ->
                            [ [ selectFrame key ] ]

                        Nothing ->
                            []
                   )
            )


keyList : List { pos : ( Int, Int ), shape : KeyShape, stroke : List (VectorImage.Element Msg), key : Key.OneKey }
keyList =
    [ { pos = ( 0, 0 ), shape = KeyShape3x3, stroke = escapeKey, key = Key.Escape }
    , { pos = ( 4, 0 ), shape = KeyShape3x3, stroke = f1Key, key = Key.F1 }
    , { pos = ( 7, 0 ), shape = KeyShape3x3, stroke = f2Key, key = Key.F2 }
    , { pos = ( 10, 0 ), shape = KeyShape3x3, stroke = f3Key, key = Key.F3 }
    , { pos = ( 13, 0 ), shape = KeyShape3x3, stroke = f4Key, key = Key.F4 }
    , { pos = ( 17, 0 ), shape = KeyShape3x3, stroke = f5Key, key = Key.F5 }
    , { pos = ( 20, 0 ), shape = KeyShape3x3, stroke = f6Key, key = Key.F6 }
    , { pos = ( 23, 0 ), shape = KeyShape3x3, stroke = f7Key, key = Key.F7 }
    , { pos = ( 26, 0 ), shape = KeyShape3x3, stroke = f8Key, key = Key.F8 }
    , { pos = ( 30, 0 ), shape = KeyShape3x3, stroke = f9Key, key = Key.F9 }
    , { pos = ( 33, 0 ), shape = KeyShape3x3, stroke = f10Key, key = Key.F10 }
    , { pos = ( 36, 0 ), shape = KeyShape3x3, stroke = f11Key, key = Key.F11 }
    , { pos = ( 39, 0 ), shape = KeyShape3x3, stroke = f12Key, key = Key.F12 }
    , { pos = ( 43, 0 ), shape = KeyShape4x3, stroke = deleteKey, key = Key.Delete }
    , { pos = ( 0, 3 ), shape = KeyShape3x3, stroke = backquoteKey, key = Key.Backquote }
    , { pos = ( 3, 3 ), shape = KeyShape3x3, stroke = digit1Key, key = Key.Digit1 }
    , { pos = ( 6, 3 ), shape = KeyShape3x3, stroke = digit2Key, key = Key.Digit2 }
    , { pos = ( 9, 3 ), shape = KeyShape3x3, stroke = digit3Key, key = Key.Digit3 }
    , { pos = ( 12, 3 ), shape = KeyShape3x3, stroke = digit4Key, key = Key.Digit4 }
    , { pos = ( 15, 3 ), shape = KeyShape3x3, stroke = digit5Key, key = Key.Digit5 }
    , { pos = ( 18, 3 ), shape = KeyShape3x3, stroke = digit6Key, key = Key.Digit6 }
    , { pos = ( 21, 3 ), shape = KeyShape3x3, stroke = digit7Key, key = Key.Digit7 }
    , { pos = ( 24, 3 ), shape = KeyShape3x3, stroke = digit8Key, key = Key.Digit8 }
    , { pos = ( 27, 3 ), shape = KeyShape3x3, stroke = digit9Key, key = Key.Digit9 }
    , { pos = ( 30, 3 ), shape = KeyShape3x3, stroke = digit0Key, key = Key.Digit0 }
    , { pos = ( 33, 3 ), shape = KeyShape3x3, stroke = minusKey, key = Key.Minus }
    , { pos = ( 36, 3 ), shape = KeyShape3x3, stroke = equalKey, key = Key.Equal }
    , { pos = ( 39, 3 ), shape = KeyShape3x3, stroke = intlYen, key = Key.IntlYen }
    , { pos = ( 42, 3 ), shape = KeyShape5x3, stroke = backspaceKey, key = Key.Backspace }
    , { pos = ( 0, 6 ), shape = KeyShape4x3, stroke = tabKey, key = Key.Tab }
    , { pos = ( 4, 6 ), shape = KeyShape3x3, stroke = qKey, key = Key.KeyQ }
    , { pos = ( 7, 6 ), shape = KeyShape3x3, stroke = wKey, key = Key.KeyW }
    , { pos = ( 10, 6 ), shape = KeyShape3x3, stroke = eKey, key = Key.KeyE }
    , { pos = ( 13, 6 ), shape = KeyShape3x3, stroke = rKey, key = Key.KeyR }
    , { pos = ( 16, 6 ), shape = KeyShape3x3, stroke = tKey, key = Key.KeyT }
    , { pos = ( 19, 6 ), shape = KeyShape3x3, stroke = yKey, key = Key.KeyY }
    , { pos = ( 22, 6 ), shape = KeyShape3x3, stroke = uKey, key = Key.KeyU }
    , { pos = ( 25, 6 ), shape = KeyShape3x3, stroke = iKey, key = Key.KeyI }
    , { pos = ( 28, 6 ), shape = KeyShape3x3, stroke = oKey, key = Key.KeyO }
    , { pos = ( 31, 6 ), shape = KeyShape3x3, stroke = pKey, key = Key.KeyP }
    , { pos = ( 34, 6 ), shape = KeyShape3x3, stroke = bracketLeftKey, key = Key.BracketLeft }
    , { pos = ( 37, 6 ), shape = KeyShape3x3, stroke = bracketRightKey, key = Key.BracketRight }
    , { pos = ( 40, 6 ), shape = KeyShapeEnter, stroke = enterKey, key = Key.Enter }
    , { pos = ( 5, 9 ), shape = KeyShape3x3, stroke = aKey, key = Key.KeyA }
    , { pos = ( 8, 9 ), shape = KeyShape3x3, stroke = sKey, key = Key.KeyS }
    , { pos = ( 11, 9 ), shape = KeyShape3x3, stroke = dKey, key = Key.KeyD }
    , { pos = ( 14, 9 ), shape = KeyShape3x3, stroke = fKey, key = Key.KeyF }
    , { pos = ( 17, 9 ), shape = KeyShape3x3, stroke = gKey, key = Key.KeyG }
    , { pos = ( 20, 9 ), shape = KeyShape3x3, stroke = hKey, key = Key.KeyH }
    , { pos = ( 23, 9 ), shape = KeyShape3x3, stroke = jKey, key = Key.KeyJ }
    , { pos = ( 26, 9 ), shape = KeyShape3x3, stroke = kKey, key = Key.KeyK }
    , { pos = ( 29, 9 ), shape = KeyShape3x3, stroke = lKey, key = Key.KeyL }
    , { pos = ( 32, 9 ), shape = KeyShape3x3, stroke = semicolonKey, key = Key.Semicolon }
    , { pos = ( 35, 9 ), shape = KeyShape3x3, stroke = quoteKey, key = Key.Quote }
    , { pos = ( 38, 9 ), shape = KeyShape3x3, stroke = backslashKey, key = Key.Backslash }
    , { pos = ( 0, 12 ), shape = KeyShape6x3, stroke = shiftKey, key = Key.Shift }
    , { pos = ( 6, 12 ), shape = KeyShape3x3, stroke = zKey, key = Key.KeyZ }
    , { pos = ( 9, 12 ), shape = KeyShape3x3, stroke = xKey, key = Key.KeyX }
    , { pos = ( 12, 12 ), shape = KeyShape3x3, stroke = cKey, key = Key.KeyC }
    , { pos = ( 15, 12 ), shape = KeyShape3x3, stroke = vKey, key = Key.KeyV }
    , { pos = ( 18, 12 ), shape = KeyShape3x3, stroke = bKey, key = Key.KeyB }
    , { pos = ( 21, 12 ), shape = KeyShape3x3, stroke = nKey, key = Key.KeyN }
    , { pos = ( 24, 12 ), shape = KeyShape3x3, stroke = mKey, key = Key.KeyM }
    , { pos = ( 27, 12 ), shape = KeyShape3x3, stroke = commaKey, key = Key.Comma }
    , { pos = ( 30, 12 ), shape = KeyShape3x3, stroke = periodKey, key = Key.Period }
    , { pos = ( 33, 12 ), shape = KeyShape3x3, stroke = slashKey, key = Key.Slash }
    , { pos = ( 36, 12 ), shape = KeyShape3x3, stroke = intlRoKey, key = Key.IntlRo }
    , { pos = ( 0, 15 ), shape = KeyShape5x3, stroke = ctrlKey, key = Key.Control }
    , { pos = ( 5, 15 ), shape = KeyShape5x3, stroke = altKey, key = Key.Alt }
    , { pos = ( 10, 15 ), shape = KeyShape3x3, stroke = nonConvertKey, key = Key.NonConvert }
    , { pos = ( 13, 15 ), shape = KeyShape15x3, stroke = spaceKey, key = Key.Space }
    , { pos = ( 28, 15 ), shape = KeyShape3x3, stroke = convertKey, key = Key.Convert }
    , { pos = ( 31, 15 ), shape = KeyShape3x3, stroke = kanaModeKey, key = Key.KanaMode }
    , { pos = ( 34, 15 ), shape = KeyShape3x3, stroke = contextMenuKey, key = Key.ContextMenu }
    , { pos = ( 41, 12 ), shape = KeyShape3x3, stroke = arrowUpKey, key = Key.ArrowUp }
    , { pos = ( 38, 15 ), shape = KeyShape3x3, stroke = arrowLeftKey, key = Key.ArrowLeft }
    , { pos = ( 41, 15 ), shape = KeyShape3x3, stroke = arrowDownKey, key = Key.ArrowDown }
    , { pos = ( 44, 15 ), shape = KeyShape3x3, stroke = arrowRightKey, key = Key.ArrowRight }
    , { pos = ( 48, 1 ), shape = KeyShape4x3, stroke = homeKey, key = Key.Home }
    , { pos = ( 48, 4 ), shape = KeyShape4x3, stroke = endKey, key = Key.End }
    , { pos = ( 48, 8 ), shape = KeyShape4x3, stroke = pageUpKey, key = Key.PageUp }
    , { pos = ( 48, 11 ), shape = KeyShape4x3, stroke = pageDownKey, key = Key.PageDown }
    , { pos = ( 53, 0 ), shape = KeyShape6x3, stroke = numpadClearKey, key = Key.NumpadClear }
    , { pos = ( 59, 0 ), shape = KeyShape6x3, stroke = numpadBackspaceKey, key = Key.NumpadBackspace }
    , { pos = ( 53, 3 ), shape = KeyShape3x3, stroke = numpadEqualKey, key = Key.NumpadEqual }
    , { pos = ( 56, 3 ), shape = KeyShape3x3, stroke = numpadDivideKey, key = Key.NumpadDivide }
    , { pos = ( 59, 3 ), shape = KeyShape3x3, stroke = numpadMultiplyKey, key = Key.NumpadMultiply }
    , { pos = ( 62, 3 ), shape = KeyShape3x3, stroke = numpadSubtractKey, key = Key.NumpadSubtract }
    , { pos = ( 53, 6 ), shape = KeyShape3x3, stroke = numpad7Key, key = Key.Numpad7 }
    , { pos = ( 56, 6 ), shape = KeyShape3x3, stroke = numpad8Key, key = Key.Numpad8 }
    , { pos = ( 59, 6 ), shape = KeyShape3x3, stroke = numpad9Key, key = Key.Numpad9 }
    , { pos = ( 62, 6 ), shape = KeyShape3x6, stroke = numpadAdd, key = Key.NumpadAdd }
    , { pos = ( 53, 9 ), shape = KeyShape3x3, stroke = numpad4Key, key = Key.Numpad4 }
    , { pos = ( 56, 9 ), shape = KeyShape3x3, stroke = numpad5Key, key = Key.Numpad5 }
    , { pos = ( 59, 9 ), shape = KeyShape3x3, stroke = numpad6Key, key = Key.Numpad6 }
    , { pos = ( 53, 12 ), shape = KeyShape3x3, stroke = numpad1Key, key = Key.Numpad1 }
    , { pos = ( 56, 12 ), shape = KeyShape3x3, stroke = numpad2Key, key = Key.Numpad2 }
    , { pos = ( 59, 12 ), shape = KeyShape3x3, stroke = numpad3Key, key = Key.Numpad3 }
    , { pos = ( 62, 12 ), shape = KeyShape3x6, stroke = numpadEnterKey, key = Key.NumpadEnter }
    , { pos = ( 53, 15 ), shape = KeyShape6x3, stroke = numpad0Key, key = Key.Numpad0 }
    , { pos = ( 59, 15 ), shape = KeyShape3x3, stroke = numpadDecimal, key = Key.NumpadDecimal }
    ]


selectFrame : Key.OneKey -> VectorImage.Element msg
selectFrame oneKey =
    let
        shapeData =
            getPosAndKeyShapeFromOneKey oneKey
    in
    keyShapeToVectorImageShape shapeData.shape
        (VectorImage.strokeColorWidth P.orange 30)
        VectorImage.fillNone
        |> VectorImage.translate
            { x = Tuple.first shapeData.pos * 100
            , y = Tuple.second shapeData.pos * 100
            }


getPosAndKeyShapeFromOneKey : Key.OneKey -> { pos : ( Int, Int ), shape : KeyShape }
getPosAndKeyShapeFromOneKey oneKey =
    getPosAndKeyShapeFromOneKeyLoop oneKey keyList


getPosAndKeyShapeFromOneKeyLoop : Key.OneKey -> List { pos : ( Int, Int ), shape : KeyShape, stroke : List (VectorImage.Element Msg), key : Key.OneKey } -> { pos : ( Int, Int ), shape : KeyShape }
getPosAndKeyShapeFromOneKeyLoop oneKey list =
    case list of
        x :: xs ->
            if x.key == oneKey then
                { pos = x.pos, shape = x.shape }

            else
                getPosAndKeyShapeFromOneKeyLoop oneKey xs

        [] ->
            { pos = ( 0, 0 )
            , shape = KeyShape3x3
            }


type KeyShape
    = KeyShape3x2
    | KeyShape4x2
    | KeyShape3x3
    | KeyShape4x3
    | KeyShape5x3
    | KeyShape6x3
    | KeyShape15x3
    | KeyShapeEnter
    | KeyShape6x2
    | KeyShape3x6


keyShapeToVectorImage : KeyShape -> VectorImage.Element Msg
keyShapeToVectorImage keyShape =
    keyShapeToVectorImageShape keyShape
        (VectorImage.strokeColorWidth P.black 20)
        (VectorImage.fillColor (Color.fromRGB ( 65, 65, 65 )))


keyShapeToVectorImageShape : KeyShape -> VectorImage.StrokeStyle -> VectorImage.FillStyle -> VectorImage.Element msg
keyShapeToVectorImageShape keyShape =
    case keyShape of
        KeyShape3x2 ->
            VectorImage.rect { width = 300, height = 200 }

        KeyShape4x2 ->
            VectorImage.rect { width = 400, height = 200 }

        KeyShape3x3 ->
            VectorImage.rect { width = 300, height = 300 }

        KeyShape4x3 ->
            VectorImage.rect { width = 400, height = 300 }

        KeyShape5x3 ->
            VectorImage.rect { width = 500, height = 300 }

        KeyShape6x3 ->
            VectorImage.rect { width = 600, height = 300 }

        KeyShape15x3 ->
            VectorImage.rect { width = 1500, height = 300 }

        KeyShapeEnter ->
            VectorImage.polygon [ ( 0, 0 ), ( 700, 0 ), ( 700, 600 ), ( 100, 600 ), ( 100, 300 ), ( 0, 300 ) ]

        KeyShape6x2 ->
            VectorImage.rect { width = 600, height = 200 }

        KeyShape3x6 ->
            VectorImage.rect { width = 300, height = 600 }


addKeyFrameAndClick :
    Maybe Key.OneKey
    ->
        { pos : ( Int, Int )
        , shape : KeyShape
        , stroke :
            List (VectorImage.Element Msg)
        , key : Key.OneKey
        }
    -> List (VectorImage.Element Msg)
addKeyFrameAndClick selectedKey { pos, shape, stroke, key } =
    keyShapeToVectorImageShapeClick shape (SelectKey key)
        :: stroke
        |> List.map
            (VectorImage.translate
                { x = Tuple.first pos * 100
                , y = Tuple.second pos * 100
                }
            )


keyShapeToVectorImageShapeClick : KeyShape -> Msg -> VectorImage.Element Msg
keyShapeToVectorImageShapeClick keyShape msg =
    (case keyShape of
        KeyShape3x2 ->
            VectorImage.rectWithClickEvent { width = 300, height = 200 }

        KeyShape4x2 ->
            VectorImage.rectWithClickEvent { width = 400, height = 200 }

        KeyShape3x3 ->
            VectorImage.rectWithClickEvent { width = 300, height = 300 }

        KeyShape4x3 ->
            VectorImage.rectWithClickEvent { width = 400, height = 300 }

        KeyShape5x3 ->
            VectorImage.rectWithClickEvent { width = 500, height = 300 }

        KeyShape6x3 ->
            VectorImage.rectWithClickEvent { width = 600, height = 300 }

        KeyShape15x3 ->
            VectorImage.rectWithClickEvent { width = 1500, height = 300 }

        KeyShapeEnter ->
            VectorImage.polygonWithClickEvent [ ( 0, 0 ), ( 700, 0 ), ( 700, 600 ), ( 100, 600 ), ( 100, 300 ), ( 0, 300 ) ]

        KeyShape6x2 ->
            VectorImage.rectWithClickEvent { width = 600, height = 200 }

        KeyShape3x6 ->
            VectorImage.rectWithClickEvent { width = 300, height = 600 }
    )
        (VectorImage.strokeColorWidth
            P.black
            20
        )
        (VectorImage.fillColor (Color.fromRGB ( 65, 65, 65 )))
        msg



{- == Row F == -}
{- キーの大きさは300x300。フォントはNoto Sansでサイズは86 -}


escapeKey : List (VectorImage.Element Msg)
escapeKey =
    [ VectorImage.path "M 124.588 85.725 L 124.588 92.575 L 90.038 92.575 L 90.038 30.755 L 124.588 30.755 L 124.588 37.605 L 97.828 37.605 L 97.828 56.885 L 123.028 56.885 L 123.028 63.655 L 97.828 63.655 L 97.828 85.725 L 124.588 85.725 Z M 167.38 79.765 C 167.38 84.105 165.76 87.465 162.52 89.845 C 159.28 92.232 154.727 93.425 148.86 93.425 C 142.74 93.425 137.877 92.452 134.27 90.505 L 134.27 83.565 C 139.377 86.045 144.297 87.285 149.03 87.285 C 152.864 87.285 155.654 86.665 157.4 85.425 C 159.147 84.185 160.02 82.522 160.02 80.435 C 160.02 78.608 159.184 77.058 157.51 75.785 C 155.83 74.518 152.847 73.068 148.56 71.435 C 144.194 69.742 141.124 68.295 139.35 67.095 C 137.57 65.902 136.267 64.555 135.44 63.055 C 134.607 61.562 134.19 59.745 134.19 57.605 C 134.19 53.798 135.74 50.795 138.84 48.595 C 141.94 46.402 146.197 45.305 151.61 45.305 C 156.884 45.305 161.817 46.345 166.41 48.425 L 163.83 54.475 C 159.124 52.502 154.88 51.515 151.1 51.515 C 147.947 51.515 145.55 52.015 143.91 53.015 C 142.277 54.015 141.46 55.392 141.46 57.145 C 141.46 58.832 142.164 60.232 143.57 61.345 C 144.984 62.458 148.27 64.002 153.43 65.975 C 157.29 67.415 160.144 68.755 161.99 69.995 C 163.837 71.235 165.197 72.632 166.07 74.185 C 166.944 75.732 167.38 77.592 167.38 79.765 Z M 197.232 93.425 C 190.552 93.425 185.352 91.372 181.632 87.265 C 177.912 83.165 176.052 77.282 176.052 69.615 C 176.052 61.835 177.932 55.838 181.692 51.625 C 185.459 47.412 190.822 45.305 197.782 45.305 C 200.042 45.305 202.275 45.535 204.482 45.995 C 206.695 46.462 208.522 47.062 209.962 47.795 L 207.642 54.135 C 203.722 52.668 200.379 51.935 197.612 51.935 C 192.932 51.935 189.479 53.408 187.252 56.355 C 185.025 59.302 183.912 63.692 183.912 69.525 C 183.912 75.138 185.025 79.432 187.252 82.405 C 189.479 85.378 192.779 86.865 197.152 86.865 C 201.239 86.865 205.255 85.965 209.202 84.165 L 209.202 90.925 C 205.989 92.592 201.999 93.425 197.232 93.425 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f1Key : List (VectorImage.Element Msg)
f1Key =
    [ VectorImage.path "M 119.895 66.315 L 119.895 92.575 L 112.105 92.575 L 112.105 30.755 L 146.655 30.755 L 146.655 37.605 L 119.895 37.605 L 119.895 59.505 L 145.005 59.505 L 145.005 66.315 L 119.895 66.315 ZM 178.704 30.755 L 178.704 92.575 L 171.264 92.575 L 171.264 53.965 C 171.264 52.758 171.27 51.462 171.284 50.075 C 171.297 48.695 171.327 47.322 171.374 45.955 C 171.414 44.588 171.457 43.278 171.504 42.025 C 171.544 40.772 171.577 39.665 171.604 38.705 C 171.124 39.212 170.7 39.648 170.334 40.015 C 169.967 40.382 169.594 40.735 169.214 41.075 C 168.834 41.408 168.434 41.765 168.014 42.145 C 167.587 42.532 167.077 42.978 166.484 43.485 L 160.234 48.595 L 156.174 43.395 L 172.364 30.755 L 178.704 30.755 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f2Key : List (VectorImage.Element Msg)
f2Key =
    [ VectorImage.path "M 119.895 66.315 L 119.895 92.575 L 112.105 92.575 L 112.105 30.755 L 146.655 30.755 L 146.655 37.605 L 119.895 37.605 L 119.895 59.505 L 145.005 59.505 L 145.005 66.315 L 119.895 66.315 ZM 191.262 85.555 L 191.262 92.575 L 152.702 92.575 L 152.702 85.975 L 167.502 69.865 C 169.616 67.585 171.506 65.498 173.172 63.605 C 174.832 61.718 176.249 59.875 177.422 58.075 C 178.589 56.268 179.482 54.455 180.102 52.635 C 180.722 50.815 181.032 48.835 181.032 46.695 C 181.032 45.035 180.792 43.568 180.312 42.295 C 179.832 41.028 179.149 39.952 178.262 39.065 C 177.376 38.178 176.326 37.508 175.112 37.055 C 173.899 36.602 172.546 36.375 171.052 36.375 C 168.372 36.375 165.956 36.918 163.802 38.005 C 161.642 39.092 159.592 40.482 157.652 42.175 L 153.332 37.135 C 154.466 36.122 155.679 35.172 156.972 34.285 C 158.272 33.398 159.669 32.632 161.162 31.985 C 162.656 31.332 164.232 30.815 165.892 30.435 C 167.559 30.055 169.309 29.865 171.142 29.865 C 173.849 29.865 176.292 30.245 178.472 31.005 C 180.659 31.765 182.512 32.858 184.032 34.285 C 185.559 35.712 186.736 37.445 187.562 39.485 C 188.396 41.532 188.812 43.835 188.812 46.395 C 188.812 48.795 188.439 51.078 187.692 53.245 C 186.946 55.418 185.916 57.555 184.602 59.655 C 183.296 61.755 181.732 63.862 179.912 65.975 C 178.092 68.088 176.126 70.288 174.012 72.575 L 162.132 85.215 L 162.132 85.555 L 191.262 85.555 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f3Key : List (VectorImage.Element Msg)
f3Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 201.835 81.834 C 201.835 84.554 201.409 87.027 200.555 89.254 C 199.702 91.487 198.502 93.424 196.955 95.064 C 195.409 96.697 193.559 98.047 191.405 99.114 C 189.245 100.174 186.845 100.927 184.205 101.374 L 184.205 101.704 C 190.792 102.524 195.795 104.617 199.215 107.984 C 202.642 111.351 204.355 115.731 204.355 121.124 C 204.355 124.697 203.749 127.974 202.535 130.954 C 201.329 133.927 199.495 136.494 197.035 138.654 C 194.582 140.807 191.475 142.481 187.715 143.674 C 183.962 144.867 179.519 145.464 174.385 145.464 C 170.325 145.464 166.502 145.147 162.915 144.514 C 159.322 143.881 155.945 142.727 152.785 141.054 L 152.785 131.564 C 156.019 133.277 159.525 134.597 163.305 135.524 C 167.079 136.457 170.695 136.924 174.155 136.924 C 177.582 136.924 180.542 136.551 183.035 135.804 C 185.529 135.057 187.582 133.997 189.195 132.624 C 190.815 131.244 192.005 129.551 192.765 127.544 C 193.532 125.537 193.915 123.287 193.915 120.794 C 193.915 118.261 193.422 116.094 192.435 114.294 C 191.449 112.487 190.045 110.997 188.225 109.824 C 186.399 108.651 184.175 107.787 181.555 107.234 C 178.929 106.674 175.962 106.394 172.655 106.394 L 165.225 106.394 L 165.225 97.964 L 172.655 97.964 C 175.669 97.964 178.345 97.594 180.685 96.854 C 183.032 96.107 184.995 95.044 186.575 93.664 C 188.155 92.291 189.355 90.654 190.175 88.754 C 190.995 86.861 191.405 84.777 191.405 82.504 C 191.405 80.571 191.069 78.841 190.395 77.314 C 189.729 75.787 188.782 74.494 187.555 73.434 C 186.322 72.374 184.852 71.564 183.145 71.004 C 181.432 70.451 179.532 70.174 177.445 70.174 C 173.465 70.174 169.959 70.797 166.925 72.044 C 163.899 73.291 161.009 74.917 158.255 76.924 L 153.115 69.944 C 154.529 68.791 156.102 67.714 157.835 66.714 C 159.562 65.707 161.449 64.824 163.495 64.064 C 165.542 63.297 167.729 62.691 170.055 62.244 C 172.382 61.797 174.845 61.574 177.445 61.574 C 181.465 61.574 184.992 62.077 188.025 63.084 C 191.059 64.091 193.599 65.494 195.645 67.294 C 197.692 69.101 199.235 71.241 200.275 73.714 C 201.315 76.187 201.835 78.894 201.835 81.834 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f4Key : List (VectorImage.Element Msg)
f4Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 208.875 116.774 L 208.875 126.034 L 196.985 126.034 L 196.985 144.344 L 187.165 144.344 L 187.165 126.034 L 149.485 126.034 L 149.485 117.164 L 186.495 62.304 L 196.985 62.304 L 196.985 116.774 L 208.875 116.774 Z M 159.425 116.774 L 187.165 116.774 L 187.165 96.904 C 187.165 94.824 187.192 92.637 187.245 90.344 C 187.299 88.057 187.362 85.827 187.435 83.654 C 187.515 81.474 187.602 79.434 187.695 77.534 C 187.789 75.641 187.852 74.061 187.885 72.794 L 187.385 72.794 C 187.125 73.541 186.799 74.367 186.405 75.274 C 186.019 76.187 185.592 77.101 185.125 78.014 C 184.659 78.927 184.185 79.811 183.705 80.664 C 183.219 81.517 182.772 82.244 182.365 82.844 L 159.425 116.774 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f5Key : List (VectorImage.Element Msg)
f5Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 178.625 94.284 C 182.305 94.284 185.735 94.794 188.915 95.814 C 192.102 96.841 194.875 98.357 197.235 100.364 C 199.595 102.377 201.445 104.871 202.785 107.844 C 204.125 110.817 204.795 114.257 204.795 118.164 C 204.795 122.411 204.162 126.227 202.895 129.614 C 201.635 132.994 199.759 135.857 197.265 138.204 C 194.772 140.551 191.692 142.347 188.025 143.594 C 184.359 144.841 180.145 145.464 175.385 145.464 C 173.485 145.464 171.615 145.371 169.775 145.184 C 167.935 144.997 166.169 144.727 164.475 144.374 C 162.782 144.021 161.172 143.564 159.645 143.004 C 158.119 142.444 156.742 141.794 155.515 141.054 L 155.515 131.454 C 156.742 132.307 158.185 133.071 159.845 133.744 C 161.499 134.411 163.235 134.967 165.055 135.414 C 166.882 135.861 168.715 136.204 170.555 136.444 C 172.395 136.691 174.099 136.814 175.665 136.814 C 178.605 136.814 181.229 136.467 183.535 135.774 C 185.842 135.087 187.795 134.017 189.395 132.564 C 190.995 131.117 192.222 129.294 193.075 127.094 C 193.935 124.901 194.365 122.297 194.365 119.284 C 194.365 113.964 192.725 109.901 189.445 107.094 C 186.172 104.281 181.412 102.874 175.165 102.874 C 174.159 102.874 173.069 102.921 171.895 103.014 C 170.722 103.107 169.552 103.231 168.385 103.384 C 167.212 103.531 166.095 103.687 165.035 103.854 C 163.975 104.021 163.052 104.177 162.265 104.324 L 157.245 101.144 L 160.315 62.744 L 198.825 62.744 L 198.825 72.014 L 169.135 72.014 L 166.955 95.394 C 168.149 95.174 169.722 94.934 171.675 94.674 C 173.629 94.414 175.945 94.284 178.625 94.284 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f6Key : List (VectorImage.Element Msg)
f6Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 154.515 109.464 C 154.515 105.557 154.709 101.667 155.095 97.794 C 155.489 93.927 156.179 90.217 157.165 86.664 C 158.152 83.111 159.499 79.807 161.205 76.754 C 162.919 73.707 165.095 71.057 167.735 68.804 C 170.382 66.551 173.545 64.784 177.225 63.504 C 180.912 62.217 185.229 61.574 190.175 61.574 C 190.882 61.574 191.662 61.594 192.515 61.634 C 193.375 61.667 194.242 61.731 195.115 61.824 C 195.989 61.917 196.825 62.031 197.625 62.164 C 198.425 62.291 199.142 62.447 199.775 62.634 L 199.775 71.284 C 198.475 70.837 197.005 70.504 195.365 70.284 C 193.725 70.057 192.105 69.944 190.505 69.944 C 187.159 69.944 184.212 70.344 181.665 71.144 C 179.119 71.944 176.912 73.071 175.045 74.524 C 173.185 75.977 171.632 77.707 170.385 79.714 C 169.145 81.727 168.132 83.951 167.345 86.384 C 166.565 88.824 165.989 91.421 165.615 94.174 C 165.242 96.927 165.002 99.791 164.895 102.764 L 165.565 102.764 C 166.305 101.424 167.205 100.167 168.265 98.994 C 169.325 97.827 170.565 96.824 171.985 95.984 C 173.399 95.144 174.989 94.484 176.755 94.004 C 178.522 93.517 180.502 93.274 182.695 93.274 C 186.229 93.274 189.429 93.824 192.295 94.924 C 195.162 96.024 197.599 97.634 199.605 99.754 C 201.619 101.874 203.172 104.467 204.265 107.534 C 205.365 110.607 205.915 114.114 205.915 118.054 C 205.915 122.301 205.339 126.114 204.185 129.494 C 203.032 132.881 201.375 135.757 199.215 138.124 C 197.055 140.484 194.452 142.297 191.405 143.564 C 188.352 144.831 184.929 145.464 181.135 145.464 C 177.415 145.464 173.925 144.737 170.665 143.284 C 167.412 141.831 164.595 139.617 162.215 136.644 C 159.835 133.664 157.955 129.924 156.575 125.424 C 155.202 120.924 154.515 115.604 154.515 109.464 Z M 181.025 136.924 C 183.259 136.924 185.295 136.541 187.135 135.774 C 188.975 135.014 190.565 133.861 191.905 132.314 C 193.245 130.774 194.279 128.821 195.005 126.454 C 195.732 124.094 196.095 121.294 196.095 118.054 C 196.095 115.454 195.785 113.121 195.165 111.054 C 194.552 108.987 193.632 107.227 192.405 105.774 C 191.179 104.327 189.645 103.214 187.805 102.434 C 185.959 101.647 183.809 101.254 181.355 101.254 C 178.862 101.254 176.582 101.694 174.515 102.574 C 172.455 103.447 170.699 104.581 169.245 105.974 C 167.792 107.367 166.665 108.957 165.865 110.744 C 165.065 112.531 164.665 114.317 164.665 116.104 C 164.665 118.597 165.012 121.081 165.705 123.554 C 166.392 126.027 167.415 128.251 168.775 130.224 C 170.129 132.197 171.829 133.807 173.875 135.054 C 175.922 136.301 178.305 136.924 181.025 136.924 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f7Key : List (VectorImage.Element Msg)
f7Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 174.715 144.344 L 163.885 144.344 L 195.305 72.014 L 153.225 72.014 L 153.225 62.744 L 205.685 62.744 L 205.685 70.844 L 174.715 144.344 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f8Key : List (VectorImage.Element Msg)
f8Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 179.735 61.464 C 182.862 61.464 185.812 61.874 188.585 62.694 C 191.359 63.514 193.795 64.741 195.895 66.374 C 197.995 68.014 199.662 70.061 200.895 72.514 C 202.122 74.974 202.735 77.841 202.735 81.114 C 202.735 83.607 202.362 85.857 201.615 87.864 C 200.869 89.871 199.845 91.684 198.545 93.304 C 197.245 94.924 195.702 96.374 193.915 97.654 C 192.129 98.941 190.192 100.104 188.105 101.144 C 190.265 102.297 192.379 103.581 194.445 104.994 C 196.512 106.407 198.352 108.001 199.965 109.774 C 201.585 111.541 202.889 113.521 203.875 115.714 C 204.862 117.907 205.355 120.364 205.355 123.084 C 205.355 126.504 204.732 129.601 203.485 132.374 C 202.239 135.147 200.489 137.501 198.235 139.434 C 195.989 141.367 193.292 142.854 190.145 143.894 C 187.005 144.941 183.535 145.464 179.735 145.464 C 175.642 145.464 172.005 144.961 168.825 143.954 C 165.645 142.947 162.969 141.504 160.795 139.624 C 158.615 137.751 156.959 135.454 155.825 132.734 C 154.692 130.021 154.125 126.951 154.125 123.524 C 154.125 120.737 154.542 118.227 155.375 115.994 C 156.215 113.761 157.342 111.751 158.755 109.964 C 160.169 108.177 161.842 106.597 163.775 105.224 C 165.709 103.844 167.755 102.634 169.915 101.594 C 168.095 100.441 166.385 99.184 164.785 97.824 C 163.185 96.464 161.799 94.947 160.625 93.274 C 159.452 91.601 158.522 89.751 157.835 87.724 C 157.142 85.697 156.795 83.457 156.795 81.004 C 156.795 77.764 157.419 74.924 158.665 72.484 C 159.912 70.051 161.599 68.014 163.725 66.374 C 165.845 64.741 168.289 63.514 171.055 62.694 C 173.829 61.874 176.722 61.464 179.735 61.464 Z M 164.115 123.634 C 164.115 125.607 164.412 127.424 165.005 129.084 C 165.599 130.737 166.529 132.151 167.795 133.324 C 169.062 134.497 170.662 135.407 172.595 136.054 C 174.529 136.707 176.835 137.034 179.515 137.034 C 182.122 137.034 184.419 136.707 186.405 136.054 C 188.399 135.407 190.065 134.477 191.405 133.264 C 192.745 132.057 193.749 130.597 194.415 128.884 C 195.089 127.171 195.425 125.274 195.425 123.194 C 195.425 121.261 195.062 119.511 194.335 117.944 C 193.609 116.384 192.565 114.934 191.205 113.594 C 189.845 112.254 188.219 110.987 186.325 109.794 C 184.425 108.607 182.305 107.437 179.965 106.284 L 178.285 105.504 C 173.599 107.731 170.065 110.287 167.685 113.174 C 165.305 116.061 164.115 119.547 164.115 123.634 Z M 179.625 69.944 C 175.685 69.944 172.552 70.931 170.225 72.904 C 167.899 74.877 166.735 77.744 166.735 81.504 C 166.735 83.624 167.062 85.447 167.715 86.974 C 168.362 88.494 169.262 89.851 170.415 91.044 C 171.569 92.237 172.955 93.307 174.575 94.254 C 176.195 95.201 177.952 96.121 179.845 97.014 C 181.632 96.194 183.319 95.301 184.905 94.334 C 186.485 93.367 187.862 92.271 189.035 91.044 C 190.202 89.817 191.122 88.424 191.795 86.864 C 192.462 85.297 192.795 83.511 192.795 81.504 C 192.795 77.744 191.625 74.877 189.285 72.904 C 186.939 70.931 183.719 69.944 179.625 69.944 Z M 202.175 105.504 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f9Key : List (VectorImage.Element Msg)
f9Key =
    [ VectorImage.path "M 110.259 109.684 L 110.259 144.344 L 99.989 144.344 L 99.989 62.744 L 145.579 62.744 L 145.579 71.794 L 110.259 71.794 L 110.259 100.704 L 143.409 100.704 L 143.409 109.684 L 110.259 109.684 ZM 205.575 97.574 C 205.575 101.481 205.382 105.377 204.995 109.264 C 204.602 113.157 203.912 116.871 202.925 120.404 C 201.939 123.937 200.592 127.237 198.885 130.304 C 197.172 133.377 194.995 136.031 192.355 138.264 C 189.709 140.497 186.545 142.254 182.865 143.534 C 179.179 144.821 174.862 145.464 169.915 145.464 C 169.209 145.464 168.429 145.444 167.575 145.404 C 166.715 145.364 165.859 145.301 165.005 145.214 C 164.152 145.121 163.315 145.017 162.495 144.904 C 161.675 144.791 160.949 144.641 160.315 144.454 L 160.315 135.754 C 161.615 136.234 163.085 136.587 164.725 136.814 C 166.365 137.034 167.985 137.144 169.585 137.144 C 174.605 137.144 178.735 136.271 181.975 134.524 C 185.209 132.771 187.775 130.397 189.675 127.404 C 191.569 124.411 192.915 120.924 193.715 116.944 C 194.515 112.964 195.009 108.757 195.195 104.324 L 194.475 104.324 C 193.729 105.664 192.835 106.911 191.795 108.064 C 190.755 109.217 189.525 110.224 188.105 111.084 C 186.692 111.937 185.092 112.607 183.305 113.094 C 181.525 113.574 179.535 113.814 177.335 113.814 C 173.802 113.814 170.602 113.267 167.735 112.174 C 164.875 111.074 162.439 109.464 160.425 107.344 C 158.419 105.224 156.865 102.627 155.765 99.554 C 154.672 96.487 154.125 92.981 154.125 89.034 C 154.125 84.794 154.709 80.971 155.875 77.564 C 157.049 74.164 158.705 71.281 160.845 68.914 C 162.985 66.554 165.589 64.741 168.655 63.474 C 171.729 62.207 175.162 61.574 178.955 61.574 C 182.715 61.574 186.212 62.301 189.445 63.754 C 192.685 65.207 195.495 67.421 197.875 70.394 C 200.255 73.374 202.135 77.124 203.515 81.644 C 204.889 86.164 205.575 91.474 205.575 97.574 Z M 179.065 70.174 C 176.832 70.174 174.795 70.544 172.955 71.284 C 171.115 72.031 169.525 73.184 168.185 74.744 C 166.845 76.311 165.812 78.274 165.085 80.634 C 164.359 83.001 163.995 85.801 163.995 89.034 C 163.995 91.641 164.305 93.977 164.925 96.044 C 165.539 98.104 166.459 99.861 167.685 101.314 C 168.912 102.767 170.445 103.884 172.285 104.664 C 174.125 105.444 176.275 105.834 178.735 105.834 C 181.262 105.834 183.549 105.397 185.595 104.524 C 187.642 103.651 189.392 102.514 190.845 101.114 C 192.299 99.721 193.425 98.131 194.225 96.344 C 195.025 94.557 195.425 92.774 195.425 90.994 C 195.425 88.501 195.079 86.014 194.385 83.534 C 193.699 81.061 192.675 78.831 191.315 76.844 C 189.962 74.851 188.262 73.241 186.215 72.014 C 184.169 70.787 181.785 70.174 179.065 70.174 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f10Key : List (VectorImage.Element Msg)
f10Key =
    [ VectorImage.path "M 75.884 106.22 L 75.884 140.88 L 65.614 140.88 L 65.614 59.28 L 111.204 59.28 L 111.204 68.33 L 75.884 68.33 L 75.884 97.24 L 109.034 97.24 L 109.034 106.22 L 75.884 106.22 Z M 153.51 59.28 L 153.51 140.88 L 143.69 140.88 L 143.69 89.92 C 143.69 88.327 143.7 86.617 143.72 84.79 C 143.734 82.97 143.77 81.157 143.83 79.35 C 143.884 77.543 143.94 75.813 144 74.16 C 144.054 72.5 144.1 71.04 144.14 69.78 C 143.507 70.447 142.947 71.023 142.46 71.51 C 141.98 71.99 141.487 72.453 140.98 72.9 C 140.48 73.347 139.95 73.823 139.39 74.33 C 138.83 74.83 138.16 75.413 137.38 76.08 L 129.12 82.84 L 123.76 75.97 L 145.14 59.28 L 153.51 59.28 Z M 234.385 99.97 C 234.385 106.557 233.908 112.453 232.955 117.66 C 232.008 122.873 230.485 127.283 228.385 130.89 C 226.278 134.497 223.571 137.25 220.265 139.15 C 216.951 141.05 212.931 142 208.205 142 C 203.818 142 199.995 141.05 196.735 139.15 C 193.481 137.25 190.785 134.497 188.645 130.89 C 186.505 127.283 184.905 122.873 183.845 117.66 C 182.785 112.453 182.255 106.557 182.255 99.97 C 182.255 93.383 182.728 87.487 183.675 82.28 C 184.628 77.073 186.135 72.673 188.195 69.08 C 190.261 65.487 192.941 62.743 196.235 60.85 C 199.528 58.95 203.518 58 208.205 58 C 212.631 58 216.481 58.94 219.755 60.82 C 223.035 62.7 225.751 65.433 227.905 69.02 C 230.065 72.613 231.685 77.013 232.765 82.22 C 233.845 87.433 234.385 93.35 234.385 99.97 Z M 192.575 99.97 C 192.575 105.55 192.855 110.423 193.415 114.59 C 193.975 118.757 194.868 122.227 196.095 125 C 197.321 127.773 198.931 129.857 200.925 131.25 C 202.911 132.65 205.338 133.35 208.205 133.35 C 211.071 133.35 213.508 132.66 215.515 131.28 C 217.528 129.907 219.175 127.843 220.455 125.09 C 221.741 122.337 222.671 118.867 223.245 114.68 C 223.825 110.493 224.115 105.59 224.115 99.97 C 224.115 94.39 223.825 89.517 223.245 85.35 C 222.671 81.183 221.741 77.723 220.455 74.97 C 219.175 72.217 217.528 70.15 215.515 68.77 C 213.508 67.397 211.071 66.71 208.205 66.71 C 205.338 66.71 202.911 67.397 200.925 68.77 C 198.931 70.15 197.321 72.217 196.095 74.97 C 194.868 77.723 193.975 81.183 193.415 85.35 C 192.855 89.517 192.575 94.39 192.575 99.97 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f11Key : List (VectorImage.Element Msg)
f11Key =
    [ VectorImage.path "M 84.845 106.14 L 84.845 140.8 L 74.575 140.8 L 74.575 59.2 L 120.165 59.2 L 120.165 68.25 L 84.845 68.25 L 84.845 97.16 L 117.995 97.16 L 117.995 106.14 L 84.845 106.14 Z M 162.471 59.2 L 162.471 140.8 L 152.651 140.8 L 152.651 89.84 C 152.651 88.247 152.661 86.537 152.681 84.71 C 152.695 82.89 152.731 81.077 152.791 79.27 C 152.845 77.463 152.901 75.733 152.961 74.08 C 153.015 72.42 153.061 70.96 153.101 69.7 C 152.468 70.367 151.908 70.943 151.421 71.43 C 150.941 71.91 150.448 72.373 149.941 72.82 C 149.441 73.267 148.911 73.743 148.351 74.25 C 147.791 74.75 147.121 75.333 146.341 76 L 138.081 82.76 L 132.721 75.89 L 154.101 59.2 L 162.471 59.2 Z M 225.426 59.2 L 225.426 140.8 L 215.606 140.8 L 215.606 89.84 C 215.606 88.247 215.616 86.537 215.636 84.71 C 215.649 82.89 215.686 81.077 215.746 79.27 C 215.799 77.463 215.856 75.733 215.916 74.08 C 215.969 72.42 216.016 70.96 216.056 69.7 C 215.422 70.367 214.862 70.943 214.376 71.43 C 213.896 71.91 213.402 72.373 212.896 72.82 C 212.396 73.267 211.866 73.743 211.306 74.25 C 210.746 74.75 210.076 75.333 209.296 76 L 201.036 82.76 L 195.676 75.89 L 217.056 59.2 L 225.426 59.2 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


f12Key : List (VectorImage.Element Msg)
f12Key =
    [ VectorImage.path "M 76.554 106.725 L 76.554 141.385 L 66.284 141.385 L 66.284 59.785 L 111.874 59.785 L 111.874 68.835 L 76.554 68.835 L 76.554 97.745 L 109.704 97.745 L 109.704 106.725 L 76.554 106.725 Z M 154.18 59.785 L 154.18 141.385 L 144.36 141.385 L 144.36 90.425 C 144.36 88.832 144.37 87.122 144.39 85.295 C 144.404 83.475 144.44 81.662 144.5 79.855 C 144.554 78.048 144.61 76.318 144.67 74.665 C 144.724 73.005 144.77 71.545 144.81 70.285 C 144.177 70.952 143.617 71.528 143.13 72.015 C 142.65 72.495 142.157 72.958 141.65 73.405 C 141.15 73.852 140.62 74.328 140.06 74.835 C 139.5 75.335 138.83 75.918 138.05 76.585 L 129.79 83.345 L 124.43 76.475 L 145.81 59.785 L 154.18 59.785 Z M 233.715 132.125 L 233.715 141.385 L 182.815 141.385 L 182.815 132.675 L 202.345 111.415 C 205.138 108.402 207.631 105.648 209.825 103.155 C 212.018 100.662 213.888 98.225 215.435 95.845 C 216.981 93.465 218.161 91.075 218.975 88.675 C 219.795 86.275 220.205 83.662 220.205 80.835 C 220.205 78.635 219.888 76.698 219.255 75.025 C 218.621 73.352 217.721 71.928 216.555 70.755 C 215.381 69.582 213.995 68.698 212.395 68.105 C 210.795 67.512 209.008 67.215 207.035 67.215 C 203.501 67.215 200.311 67.932 197.465 69.365 C 194.618 70.798 191.911 72.628 189.345 74.855 L 183.645 68.215 C 185.138 66.875 186.738 65.622 188.445 64.455 C 190.158 63.282 192.001 62.265 193.975 61.405 C 195.948 60.552 198.031 59.875 200.225 59.375 C 202.418 58.868 204.725 58.615 207.145 58.615 C 210.718 58.615 213.945 59.118 216.825 60.125 C 219.711 61.132 222.158 62.575 224.165 64.455 C 226.178 66.328 227.731 68.615 228.825 71.315 C 229.925 74.015 230.475 77.055 230.475 80.435 C 230.475 83.602 229.981 86.618 228.995 89.485 C 228.008 92.345 226.651 95.162 224.925 97.935 C 223.191 100.708 221.125 103.492 218.725 106.285 C 216.325 109.072 213.731 111.972 210.945 114.985 L 195.255 131.675 L 195.255 132.125 L 233.715 132.125 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


deleteKey : List (VectorImage.Element Msg)
deleteKey =
    [ VectorImage.path "M 110.613 101.145 C 110.613 113.187 107.328 122.393 100.76 128.766 C 94.189 135.14 84.764 138.326 72.483 138.326 L 52.176 138.326 L 52.176 65.358 L 74.63 65.358 C 85.974 65.358 94.81 68.479 101.134 74.72 C 107.454 80.956 110.613 89.764 110.613 101.145 Z M 100.93 101.448 C 100.93 92.16 98.642 85.131 94.07 80.363 C 89.498 75.589 82.586 73.2 73.334 73.2 L 61.361 73.2 L 61.361 130.439 L 71.286 130.439 C 91.048 130.439 100.93 120.774 100.93 101.448 Z M 148.839 139.327 C 140.623 139.327 134.179 136.839 129.505 131.861 C 124.831 126.888 122.495 120.046 122.495 111.33 C 122.495 102.542 124.673 95.546 129.031 90.342 C 133.39 85.131 139.277 82.527 146.692 82.527 C 153.583 82.527 159.074 84.747 163.164 89.189 C 167.26 93.636 169.307 99.651 169.307 107.236 L 169.307 112.671 L 131.777 112.671 C 131.942 118.894 133.523 123.619 136.516 126.845 C 139.509 130.075 143.75 131.692 149.241 131.692 C 152.168 131.692 154.946 131.431 157.575 130.913 C 160.204 130.4 163.283 129.395 166.812 127.899 L 166.812 135.777 C 163.784 137.077 160.938 137.992 158.272 138.523 C 155.613 139.06 152.469 139.327 148.839 139.327 Z M 146.593 89.868 C 142.302 89.868 138.909 91.248 136.417 94.009 C 133.92 96.77 132.439 100.611 131.974 105.534 L 159.874 105.534 C 159.806 100.413 158.625 96.521 156.333 93.857 C 154.037 91.197 150.791 89.868 146.593 89.868 Z M 192.164 60.672 L 192.164 138.326 L 183.178 138.326 L 183.178 60.672 L 192.164 60.672 Z M 232.831 139.327 C 224.617 139.327 218.171 136.839 213.498 131.861 C 208.825 126.888 206.486 120.046 206.486 111.33 C 206.486 102.542 208.666 95.546 213.023 90.342 C 217.383 85.131 223.268 82.527 230.685 82.527 C 237.576 82.527 243.067 84.747 247.156 89.189 C 251.251 93.636 253.299 99.651 253.299 107.236 L 253.299 112.671 L 215.769 112.671 C 215.936 118.894 217.516 123.619 220.508 126.845 C 223.5 130.075 227.742 131.692 233.232 131.692 C 236.16 131.692 238.939 131.431 241.567 130.913 C 244.195 130.4 247.276 129.395 250.804 127.899 L 250.804 135.777 C 247.777 137.077 244.929 137.992 242.264 138.523 C 239.607 139.06 236.461 139.327 232.831 139.327 Z M 230.586 89.868 C 226.294 89.868 222.902 91.248 220.41 94.009 C 217.912 96.77 216.43 100.611 215.967 105.534 L 243.865 105.534 C 243.801 100.413 242.619 96.521 240.323 93.857 C 238.031 91.197 234.784 89.868 230.586 89.868 Z M 285.483 131.986 C 286.652 131.986 288.018 131.869 289.579 131.637 C 291.141 131.406 292.322 131.139 293.12 130.841 L 293.12 137.728 C 292.291 138.091 291.004 138.449 289.257 138.8 C 287.51 139.151 285.737 139.327 283.936 139.327 C 273.224 139.327 267.867 133.688 267.867 122.409 L 267.867 90.512 L 260.132 90.512 L 260.132 86.219 L 267.964 82.633 L 271.56 70.955 L 276.899 70.955 L 276.899 83.528 L 292.726 83.528 L 292.726 90.512 L 276.899 90.512 L 276.899 122.159 C 276.899 125.318 277.655 127.747 279.17 129.446 C 280.685 131.139 282.789 131.986 285.483 131.986 Z M 327.355 139.327 C 319.139 139.327 312.695 136.839 308.021 131.861 C 303.347 126.888 301.011 120.046 301.011 111.33 C 301.011 102.542 303.189 95.546 307.548 90.342 C 311.905 85.131 317.792 82.527 325.207 82.527 C 332.099 82.527 337.589 84.747 341.678 89.189 C 345.776 93.636 347.823 99.651 347.823 107.236 L 347.823 112.671 L 310.292 112.671 C 310.46 118.894 312.04 123.619 315.031 126.845 C 318.024 130.075 322.266 131.692 327.757 131.692 C 330.684 131.692 333.462 131.431 336.091 130.913 C 338.72 130.4 341.798 129.395 345.328 127.899 L 345.328 135.777 C 342.301 137.077 339.453 137.992 336.787 138.523 C 334.13 139.06 330.984 139.327 327.355 139.327 Z M 325.11 89.868 C 320.818 89.868 317.425 91.248 314.933 94.009 C 312.436 96.77 310.955 100.611 310.489 105.534 L 338.388 105.534 C 338.323 100.413 337.144 96.521 334.848 93.857 C 332.553 91.197 329.307 89.868 325.11 89.868 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]



{- == Row E == -}


backquoteKey : List (VectorImage.Element Msg)
backquoteKey =
    [ VectorImage.path "M 175.295 99.242 L 175.295 101.932 L 162.265 101.932 C 156.885 97.625 150.985 92.045 144.565 85.192 C 138.145 78.345 133.608 72.912 130.955 68.892 L 130.955 66.632 L 154.095 66.632 C 156.388 71.365 159.652 77.015 163.885 83.582 C 168.118 90.149 171.922 95.369 175.295 99.242 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.rect { width = 8, height = 105 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 67, y = 155 }
    , VectorImage.rect { width = 88, height = 8 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 28, y = 192 }
    , VectorImage.rect { width = 103, height = 8 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 20, y = 219 }
    , VectorImage.path "M38,158 L51,182 L45,186 L31,161Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue) -- 半の左上の点
    , VectorImage.path "M111,160 L96,187 L89,183 L102,157Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue) -- 半の右上の点
    , VectorImage.path "M172,159 L138,271 L131,271 L164,159Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue) -- /
    , VectorImage.path "M234,153 L284,196 L279,204 L231,162 L184,205 L180,197 L227,153 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue) -- 全の屋根
    , VectorImage.rect { width = 8, height = 60 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 227, y = 196 }
    , VectorImage.rect { width = 68, height = 8 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 199, y = 196 }
    , VectorImage.rect { width = 78, height = 8 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 193, y = 222 }
    , VectorImage.rect { width = 97, height = 8 } VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
        |> VectorImage.translate { x = 184, y = 249 }
    ]


digit1Key : List (VectorImage.Element Msg)
digit1Key =
    [ VectorImage.path "M 165.825 78.142 L 165.825 235.482 L 146.885 235.482 L 146.885 137.232 C 146.885 134.145 146.902 130.842 146.935 127.322 C 146.968 123.809 147.038 120.312 147.145 116.832 C 147.258 113.352 147.368 110.015 147.475 106.822 C 147.582 103.629 147.672 100.815 147.745 98.382 C 146.525 99.669 145.448 100.779 144.515 101.712 C 143.582 102.645 142.632 103.542 141.665 104.402 C 140.692 105.262 139.668 106.179 138.595 107.152 C 137.515 108.119 136.222 109.249 134.715 110.542 L 118.795 123.562 L 108.465 110.322 L 149.675 78.142 L 165.825 78.142 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit2Key : List (VectorImage.Element Msg)
digit2Key =
    [ VectorImage.path "M 197.785 217.622 L 197.785 235.482 L 99.635 235.482 L 99.635 218.692 L 137.305 177.692 C 142.685 171.879 147.492 166.569 151.725 161.762 C 155.958 156.955 159.562 152.255 162.535 147.662 C 165.515 143.075 167.795 138.469 169.375 133.842 C 170.948 129.209 171.735 124.169 171.735 118.722 C 171.735 114.489 171.128 110.755 169.915 107.522 C 168.695 104.295 166.955 101.552 164.695 99.292 C 162.435 97.032 159.762 95.329 156.675 94.182 C 153.588 93.035 150.145 92.462 146.345 92.462 C 139.525 92.462 133.372 93.842 127.885 96.602 C 122.398 99.362 117.178 102.895 112.225 107.202 L 101.255 94.392 C 104.122 91.812 107.205 89.392 110.505 87.132 C 113.805 84.872 117.355 82.915 121.155 81.262 C 124.962 79.615 128.982 78.309 133.215 77.342 C 137.448 76.369 141.895 75.882 146.555 75.882 C 153.442 75.882 159.665 76.852 165.225 78.792 C 170.785 80.732 175.505 83.512 179.385 87.132 C 183.258 90.752 186.252 95.165 188.365 100.372 C 190.485 105.572 191.545 111.435 191.545 117.962 C 191.545 124.062 190.592 129.875 188.685 135.402 C 186.785 140.922 184.168 146.355 180.835 151.702 C 177.495 157.049 173.512 162.412 168.885 167.792 C 164.258 173.172 159.255 178.769 153.875 184.582 L 123.635 216.752 L 123.635 217.622 L 197.785 217.622 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit3Key : List (VectorImage.Element Msg)
digit3Key =
    [ VectorImage.path "M 192.725 114.952 C 192.725 120.185 191.898 124.955 190.245 129.262 C 188.598 133.569 186.285 137.299 183.305 140.452 C 180.332 143.612 176.765 146.215 172.605 148.262 C 168.438 150.302 163.808 151.752 158.715 152.612 L 158.715 153.262 C 171.415 154.842 181.065 158.879 187.665 165.372 C 194.265 171.865 197.565 180.312 197.565 190.712 C 197.565 197.599 196.402 203.912 194.075 209.652 C 191.742 215.392 188.208 220.342 183.475 224.502 C 178.735 228.662 172.742 231.892 165.495 234.192 C 158.248 236.485 149.675 237.632 139.775 237.632 C 131.955 237.632 124.585 237.022 117.665 235.802 C 110.738 234.582 104.225 232.359 98.125 229.132 L 98.125 210.842 C 104.372 214.142 111.135 216.689 118.415 218.482 C 125.695 220.275 132.672 221.172 139.345 221.172 C 145.945 221.172 151.648 220.452 156.455 219.012 C 161.262 217.579 165.225 215.535 168.345 212.882 C 171.472 210.229 173.768 206.965 175.235 203.092 C 176.708 199.219 177.445 194.879 177.445 190.072 C 177.445 185.192 176.495 181.012 174.595 177.532 C 172.688 174.052 169.978 171.182 166.465 168.922 C 162.952 166.662 158.665 164.992 153.605 163.912 C 148.545 162.839 142.825 162.302 136.445 162.302 L 122.125 162.302 L 122.125 146.052 L 136.445 146.052 C 142.252 146.052 147.415 145.335 151.935 143.902 C 156.455 142.469 160.242 140.422 163.295 137.762 C 166.342 135.109 168.655 131.952 170.235 128.292 C 171.815 124.632 172.605 120.615 172.605 116.242 C 172.605 112.509 171.958 109.172 170.665 106.232 C 169.372 103.292 167.542 100.799 165.175 98.752 C 162.808 96.712 159.975 95.152 156.675 94.072 C 153.375 92.999 149.715 92.462 145.695 92.462 C 138.022 92.462 131.262 93.662 125.415 96.062 C 119.562 98.469 113.982 101.609 108.675 105.482 L 98.775 92.032 C 101.502 89.805 104.532 87.722 107.865 85.782 C 111.205 83.849 114.848 82.145 118.795 80.672 C 122.742 79.205 126.955 78.042 131.435 77.182 C 135.922 76.315 140.675 75.882 145.695 75.882 C 153.442 75.882 160.238 76.852 166.085 78.792 C 171.938 80.732 176.835 83.439 180.775 86.912 C 184.722 90.392 187.702 94.519 189.715 99.292 C 191.722 104.065 192.725 109.285 192.725 114.952 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit4Key : List (VectorImage.Element Msg)
digit4Key =
    [ VectorImage.path "M 206.285 182.322 L 206.285 200.182 L 183.365 200.182 L 183.365 235.482 L 164.425 235.482 L 164.425 200.182 L 91.785 200.182 L 91.785 183.072 L 163.135 77.282 L 183.365 77.282 L 183.365 182.322 L 206.285 182.322 Z M 110.935 182.322 L 164.425 182.322 L 164.425 144.012 C 164.425 139.992 164.478 135.775 164.585 131.362 C 164.692 126.949 164.815 122.645 164.955 118.452 C 165.102 114.252 165.265 110.322 165.445 106.662 C 165.625 103.002 165.752 99.952 165.825 97.512 L 164.855 97.512 C 164.348 98.952 163.718 100.549 162.965 102.302 C 162.212 104.062 161.388 105.822 160.495 107.582 C 159.595 109.335 158.678 111.039 157.745 112.692 C 156.818 114.339 155.958 115.739 155.165 116.892 L 110.935 182.322 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit5Key : List (VectorImage.Element Msg)
digit5Key =
    [ VectorImage.path "M 147.955 138.952 C 155.062 138.952 161.682 139.939 167.815 141.912 C 173.948 143.885 179.292 146.809 183.845 150.682 C 188.405 154.555 191.975 159.362 194.555 165.102 C 197.135 170.842 198.425 177.479 198.425 185.012 C 198.425 193.192 197.205 200.545 194.765 207.072 C 192.332 213.599 188.712 219.122 183.905 223.642 C 179.098 228.162 173.158 231.625 166.085 234.032 C 159.018 236.432 150.895 237.632 141.715 237.632 C 138.055 237.632 134.448 237.452 130.895 237.092 C 127.348 236.739 123.942 236.219 120.675 235.532 C 117.408 234.852 114.305 233.975 111.365 232.902 C 108.425 231.822 105.772 230.565 103.405 229.132 L 103.405 210.622 C 105.772 212.275 108.552 213.745 111.745 215.032 C 114.938 216.325 118.292 217.402 121.805 218.262 C 125.318 219.122 128.852 219.785 132.405 220.252 C 135.958 220.719 139.242 220.952 142.255 220.952 C 147.922 220.952 152.978 220.289 157.425 218.962 C 161.872 217.635 165.638 215.572 168.725 212.772 C 171.812 209.979 174.178 206.465 175.825 202.232 C 177.478 197.999 178.305 192.975 178.305 187.162 C 178.305 176.902 175.148 169.065 168.835 163.652 C 162.522 158.232 153.338 155.522 141.285 155.522 C 139.345 155.522 137.245 155.612 134.985 155.792 C 132.725 155.972 130.465 156.205 128.205 156.492 C 125.945 156.779 123.795 157.082 121.755 157.402 C 119.708 157.729 117.932 158.035 116.425 158.322 L 106.735 152.182 L 112.655 78.142 L 186.915 78.142 L 186.915 96.012 L 129.665 96.012 L 125.465 141.102 C 127.758 140.669 130.788 140.202 134.555 139.702 C 138.322 139.202 142.788 138.952 147.955 138.952 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit6Key : List (VectorImage.Element Msg)
digit6Key =
    [ VectorImage.path "M 101.465 168.222 C 101.465 160.689 101.842 153.192 102.595 145.732 C 103.348 138.272 104.675 131.115 106.575 124.262 C 108.475 117.409 111.075 111.042 114.375 105.162 C 117.682 99.275 121.882 94.162 126.975 89.822 C 132.068 85.482 138.165 82.075 145.265 79.602 C 152.372 77.122 160.695 75.882 170.235 75.882 C 171.595 75.882 173.102 75.919 174.755 75.992 C 176.402 76.065 178.068 76.192 179.755 76.372 C 181.442 76.552 183.058 76.765 184.605 77.012 C 186.145 77.265 187.525 77.572 188.745 77.932 L 188.745 94.612 C 186.232 93.752 183.398 93.105 180.245 92.672 C 177.085 92.245 173.962 92.032 170.875 92.032 C 164.422 92.032 158.738 92.802 153.825 94.342 C 148.905 95.882 144.652 98.052 141.065 100.852 C 137.478 103.652 134.485 106.989 132.085 110.862 C 129.678 114.735 127.722 119.022 126.215 123.722 C 124.708 128.422 123.598 133.425 122.885 138.732 C 122.165 144.045 121.698 149.572 121.485 155.312 L 122.775 155.312 C 124.208 152.725 125.948 150.302 127.995 148.042 C 130.042 145.782 132.425 143.845 135.145 142.232 C 137.872 140.619 140.942 139.345 144.355 138.412 C 147.762 137.479 151.582 137.012 155.815 137.012 C 162.628 137.012 168.798 138.069 174.325 140.182 C 179.845 142.302 184.545 145.405 188.425 149.492 C 192.298 153.585 195.292 158.592 197.405 164.512 C 199.525 170.425 200.585 177.185 200.585 184.792 C 200.585 192.972 199.472 200.325 197.245 206.852 C 195.018 213.385 191.825 218.929 187.665 223.482 C 183.505 228.035 178.485 231.532 172.605 233.972 C 166.718 236.412 160.115 237.632 152.795 237.632 C 145.622 237.632 138.898 236.235 132.625 233.442 C 126.345 230.642 120.908 226.372 116.315 220.632 C 111.722 214.892 108.098 207.682 105.445 199.002 C 102.792 190.322 101.465 180.062 101.465 168.222 Z M 152.585 221.172 C 156.892 221.172 160.818 220.435 164.365 218.962 C 167.918 217.489 170.985 215.265 173.565 212.292 C 176.152 209.312 178.145 205.545 179.545 200.992 C 180.945 196.432 181.645 191.032 181.645 184.792 C 181.645 179.772 181.052 175.272 179.865 171.292 C 178.678 167.305 176.902 163.915 174.535 161.122 C 172.168 158.322 169.208 156.169 165.655 154.662 C 162.108 153.155 157.965 152.402 153.225 152.402 C 148.418 152.402 144.025 153.245 140.045 154.932 C 136.065 156.619 132.675 158.805 129.875 161.492 C 127.075 164.185 124.905 167.252 123.365 170.692 C 121.825 174.139 121.055 177.585 121.055 181.032 C 121.055 185.839 121.718 190.625 123.045 195.392 C 124.372 200.165 126.345 204.452 128.965 208.252 C 131.578 212.059 134.858 215.162 138.805 217.562 C 142.752 219.969 147.345 221.172 152.585 221.172 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit7Key : List (VectorImage.Element Msg)
digit7Key =
    [ VectorImage.path "M 140.425 235.482 L 119.545 235.482 L 180.135 96.012 L 98.995 96.012 L 98.995 78.142 L 200.155 78.142 L 200.155 93.752 L 140.425 235.482 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit8Key : List (VectorImage.Element Msg)
digit8Key =
    [ VectorImage.path "M 150.105 75.672 C 156.132 75.672 161.818 76.462 167.165 78.042 C 172.512 79.615 177.212 81.982 181.265 85.142 C 185.318 88.295 188.528 92.242 190.895 96.982 C 193.262 101.715 194.445 107.239 194.445 113.552 C 194.445 118.359 193.728 122.699 192.295 126.572 C 190.862 130.445 188.888 133.942 186.375 137.062 C 183.862 140.189 180.885 142.989 177.445 145.462 C 173.998 147.935 170.268 150.175 166.255 152.182 C 170.415 154.409 174.485 156.885 178.465 159.612 C 182.445 162.339 185.995 165.405 189.115 168.812 C 192.242 172.219 194.755 176.039 196.655 180.272 C 198.555 184.505 199.505 189.242 199.505 194.482 C 199.505 201.082 198.302 207.055 195.895 212.402 C 193.495 217.742 190.125 222.279 185.785 226.012 C 181.445 229.745 176.242 232.615 170.175 234.622 C 164.115 236.629 157.425 237.632 150.105 237.632 C 142.218 237.632 135.205 236.665 129.065 234.732 C 122.932 232.792 117.768 230.012 113.575 226.392 C 109.375 222.765 106.182 218.335 103.995 213.102 C 101.808 207.862 100.715 201.942 100.715 195.342 C 100.715 189.962 101.522 185.119 103.135 180.812 C 104.748 176.505 106.918 172.632 109.645 169.192 C 112.372 165.745 115.602 162.695 119.335 160.042 C 123.062 157.389 127.005 155.059 131.165 153.052 C 127.652 150.825 124.352 148.402 121.265 145.782 C 118.178 143.162 115.505 140.239 113.245 137.012 C 110.985 133.785 109.192 130.215 107.865 126.302 C 106.538 122.395 105.875 118.072 105.875 113.332 C 105.875 107.092 107.078 101.622 109.485 96.922 C 111.885 92.222 115.132 88.295 119.225 85.142 C 123.312 81.982 128.028 79.615 133.375 78.042 C 138.722 76.462 144.298 75.672 150.105 75.672 Z M 119.975 195.552 C 119.975 199.359 120.548 202.859 121.695 206.052 C 122.842 209.245 124.635 211.972 127.075 214.232 C 129.515 216.492 132.602 218.249 136.335 219.502 C 140.062 220.755 144.508 221.382 149.675 221.382 C 154.702 221.382 159.132 220.755 162.965 219.502 C 166.805 218.249 170.018 216.455 172.605 214.122 C 175.185 211.789 177.122 208.972 178.415 205.672 C 179.702 202.372 180.345 198.712 180.345 194.692 C 180.345 190.965 179.648 187.595 178.255 184.582 C 176.855 181.569 174.845 178.769 172.225 176.182 C 169.605 173.602 166.465 171.162 162.805 168.862 C 159.145 166.569 155.055 164.312 150.535 162.092 L 147.315 160.582 C 138.275 164.889 131.458 169.822 126.865 175.382 C 122.272 180.942 119.975 187.665 119.975 195.552 Z M 149.895 92.032 C 142.288 92.032 136.242 93.932 131.755 97.732 C 127.275 101.532 125.035 107.055 125.035 114.302 C 125.035 118.395 125.662 121.912 126.915 124.852 C 128.175 127.792 129.915 130.412 132.135 132.712 C 134.362 135.005 137.035 137.065 140.155 138.892 C 143.275 140.725 146.665 142.502 150.325 144.222 C 153.765 142.642 157.012 140.922 160.065 139.062 C 163.112 137.195 165.765 135.079 168.025 132.712 C 170.285 130.339 172.062 127.645 173.355 124.632 C 174.648 121.619 175.295 118.175 175.295 114.302 C 175.295 107.055 173.035 101.532 168.515 97.732 C 163.995 93.932 157.788 92.032 149.895 92.032 Z M 193.375 160.582 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit9Key : List (VectorImage.Element Msg)
digit9Key =
    [ VectorImage.path "M 199.935 145.302 C 199.935 152.835 199.558 160.349 198.805 167.842 C 198.052 175.342 196.725 182.499 194.825 189.312 C 192.925 196.132 190.325 202.499 187.025 208.412 C 183.725 214.332 179.528 219.445 174.435 223.752 C 169.335 228.059 163.235 231.449 156.135 233.922 C 149.035 236.395 140.712 237.632 131.165 237.632 C 129.805 237.632 128.298 237.595 126.645 237.522 C 124.998 237.455 123.348 237.332 121.695 237.152 C 120.048 236.972 118.435 236.775 116.855 236.562 C 115.275 236.342 113.875 236.055 112.655 235.702 L 112.655 218.912 C 115.168 219.845 118.002 220.525 121.155 220.952 C 124.315 221.385 127.438 221.602 130.525 221.602 C 140.212 221.602 148.175 219.915 154.415 216.542 C 160.655 213.169 165.605 208.595 169.265 202.822 C 172.925 197.042 175.525 190.315 177.065 182.642 C 178.612 174.962 179.562 166.855 179.915 158.322 L 178.515 158.322 C 177.082 160.902 175.362 163.305 173.355 165.532 C 171.348 167.752 168.982 169.689 166.255 171.342 C 163.528 172.995 160.442 174.285 156.995 175.212 C 153.555 176.145 149.718 176.612 145.485 176.612 C 138.665 176.612 132.495 175.555 126.975 173.442 C 121.448 171.322 116.748 168.219 112.875 164.132 C 109.002 160.045 106.005 155.042 103.885 149.122 C 101.772 143.202 100.715 136.439 100.715 128.832 C 100.715 120.652 101.845 113.282 104.105 106.722 C 106.365 100.155 109.558 94.595 113.685 90.042 C 117.805 85.482 122.825 81.982 128.745 79.542 C 134.665 77.102 141.285 75.882 148.605 75.882 C 155.852 75.882 162.595 77.282 168.835 80.082 C 175.075 82.882 180.492 87.152 185.085 92.892 C 189.678 98.632 193.302 105.859 195.955 114.572 C 198.608 123.292 199.935 133.535 199.935 145.302 Z M 148.815 92.462 C 144.515 92.462 140.588 93.179 137.035 94.612 C 133.482 96.045 130.415 98.269 127.835 101.282 C 125.248 104.295 123.255 108.079 121.855 112.632 C 120.462 117.192 119.765 122.592 119.765 128.832 C 119.765 133.852 120.355 138.355 121.535 142.342 C 122.722 146.322 124.498 149.712 126.865 152.512 C 129.232 155.305 132.192 157.455 135.745 158.962 C 139.292 160.469 143.435 161.222 148.175 161.222 C 153.048 161.222 157.458 160.382 161.405 158.702 C 165.352 157.015 168.725 154.825 171.525 152.132 C 174.325 149.439 176.495 146.372 178.035 142.932 C 179.575 139.485 180.345 136.042 180.345 132.602 C 180.345 127.795 179.682 123.005 178.355 118.232 C 177.028 113.459 175.055 109.155 172.435 105.322 C 169.822 101.482 166.542 98.379 162.595 96.012 C 158.648 93.645 154.055 92.462 148.815 92.462 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


digit0Key : List (VectorImage.Element Msg)
digit0Key =
    [ VectorImage.path "M 200.365 156.602 C 200.365 169.295 199.452 180.665 197.625 190.712 C 195.792 200.759 192.848 209.262 188.795 216.222 C 184.742 223.182 179.522 228.489 173.135 232.142 C 166.755 235.802 159.008 237.632 149.895 237.632 C 141.428 237.632 134.055 235.802 127.775 232.142 C 121.502 228.489 116.302 223.182 112.175 216.222 C 108.048 209.262 104.962 200.759 102.915 190.712 C 100.875 180.665 99.855 169.295 99.855 156.602 C 99.855 143.902 100.768 132.529 102.595 122.482 C 104.422 112.442 107.328 103.959 111.315 97.032 C 115.295 90.112 120.458 84.822 126.805 81.162 C 133.158 77.502 140.855 75.672 149.895 75.672 C 158.428 75.672 165.855 77.482 172.175 81.102 C 178.488 84.729 183.725 90.002 187.885 96.922 C 192.045 103.849 195.165 112.332 197.245 122.372 C 199.325 132.419 200.365 143.829 200.365 156.602 Z M 119.765 156.602 C 119.765 167.362 120.302 176.759 121.375 184.792 C 122.448 192.832 124.172 199.522 126.545 204.862 C 128.912 210.209 132.012 214.229 135.845 216.922 C 139.685 219.609 144.368 220.952 149.895 220.952 C 155.422 220.952 160.122 219.625 163.995 216.972 C 167.868 214.319 171.042 210.335 173.515 205.022 C 175.988 199.715 177.782 193.025 178.895 184.952 C 180.008 176.885 180.565 167.435 180.565 156.602 C 180.565 145.835 180.008 136.435 178.895 128.402 C 177.782 120.369 175.988 113.695 173.515 108.382 C 171.042 103.075 167.868 99.095 163.995 96.442 C 160.122 93.789 155.422 92.462 149.895 92.462 C 144.368 92.462 139.685 93.789 135.845 96.442 C 132.012 99.095 128.912 103.075 126.545 108.382 C 124.172 113.695 122.448 120.369 121.375 128.402 C 120.302 136.435 119.765 145.835 119.765 156.602 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


minusKey : List (VectorImage.Element Msg)
minusKey =
    [ VectorImage.path "M 153.445 179.092 L 100.065 179.092 L 100.065 161.012 L 153.445 161.012 L 153.445 179.092 Z M 138.055 98.382 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


equalKey : List (VectorImage.Element Msg)
equalKey =
    [ VectorImage.path "M 199.725 121.352 L 100.285 121.352 L 100.285 105.322 L 199.725 105.322 L 199.725 121.352 Z M 199.725 165.482 L 100.285 165.482 L 100.285 149.342 L 199.725 149.342 L 199.725 165.482 Z M 138.055 69.382 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M 130.116 267.257 L 120.776 267.257 L 147.406 213.657 L 153.316 213.657 L 179.246 267.257 L 169.906 267.257 L 150.356 224.627 L 130.116 267.257 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]


intlYen : List (VectorImage.Element Msg)
intlYen =
    [ VectorImage.path "M 112.875 78.142 L 152.155 154.982 L 191.545 78.142 L 211.885 78.142 L 167.545 160.792 L 194.875 160.792 L 194.875 174.892 L 161.625 174.892 L 161.625 192.972 L 194.875 192.972 L 194.875 207.072 L 161.625 207.072 L 161.625 235.482 L 142.685 235.482 L 142.685 207.072 L 109.325 207.072 L 109.325 192.972 L 142.685 192.972 L 142.685 174.892 L 109.325 174.892 L 109.325 160.792 L 136.225 160.792 L 92.425 78.142 L 112.875 78.142 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]


backspaceKey : List (VectorImage.Element Msg)
backspaceKey =
    [ VectorImage.path "M 32.2 173.69 L 32.2 108.59 L 50.77 108.59 C 59.497 108.59 65.797 109.887 69.67 112.48 C 73.55 115.08 75.49 119.157 75.49 124.71 C 75.49 128.563 74.433 131.747 72.32 134.26 C 70.213 136.767 67.143 138.39 63.11 139.13 L 63.11 139.58 C 68.123 140.44 71.81 142.177 74.17 144.79 C 76.53 147.403 77.71 150.86 77.71 155.16 C 77.71 160.98 75.723 165.523 71.75 168.79 C 67.77 172.057 62.217 173.69 55.09 173.69 L 32.2 173.69 Z M 40.4 115.58 L 40.4 136.28 L 52.42 136.28 C 57.527 136.28 61.237 135.463 63.55 133.83 C 65.87 132.203 67.03 129.473 67.03 125.64 C 67.03 122.08 65.76 119.513 63.22 117.94 C 60.68 116.367 56.663 115.58 51.17 115.58 L 40.4 115.58 Z M 52.91 143.14 L 40.4 143.14 L 40.4 166.74 L 53.53 166.74 C 58.757 166.74 62.63 165.733 65.15 163.72 C 67.677 161.7 68.94 158.64 68.94 154.54 C 68.94 150.653 67.603 147.78 64.93 145.92 C 62.257 144.067 58.25 143.14 52.91 143.14 Z M 126.38 173.69 L 120.55 173.69 L 118.99 166.74 L 118.64 166.74 C 116.2 169.8 113.77 171.873 111.35 172.96 C 108.937 174.04 105.887 174.58 102.2 174.58 C 97.394 174.58 93.624 173.32 90.89 170.8 C 88.164 168.273 86.8 164.71 86.8 160.11 C 86.8 150.19 94.62 144.993 110.26 144.52 L 118.55 144.21 L 118.55 141.32 C 118.55 137.607 117.747 134.867 116.14 133.1 C 114.54 131.333 111.974 130.45 108.44 130.45 C 105.854 130.45 103.41 130.837 101.11 131.61 C 98.81 132.383 96.65 133.243 94.63 134.19 L 92.18 128.18 C 94.647 126.873 97.334 125.85 100.24 125.11 C 103.154 124.363 106.034 123.99 108.88 123.99 C 114.794 123.99 119.187 125.297 122.06 127.91 C 124.94 130.523 126.38 134.68 126.38 140.38 L 126.38 173.69 Z M 104.03 168.12 C 108.51 168.12 112.037 166.91 114.61 164.49 C 117.177 162.07 118.46 158.637 118.46 154.19 L 118.46 149.78 L 111.24 150.09 C 105.634 150.297 101.547 151.187 98.98 152.76 C 96.407 154.333 95.12 156.813 95.12 160.2 C 95.12 162.753 95.9 164.713 97.46 166.08 C 99.02 167.44 101.21 168.12 104.03 168.12 Z M 161.116 174.58 C 154.083 174.58 148.606 172.42 144.686 168.1 C 140.766 163.78 138.806 157.583 138.806 149.51 C 138.806 141.317 140.789 135 144.756 130.56 C 148.716 126.12 154.363 123.9 161.696 123.9 C 164.069 123.9 166.423 124.147 168.756 124.64 C 171.089 125.127 173.013 125.757 174.526 126.53 L 172.076 133.21 C 167.949 131.67 164.429 130.9 161.516 130.9 C 156.589 130.9 152.953 132.45 150.606 135.55 C 148.259 138.65 147.086 143.273 147.086 149.42 C 147.086 155.327 148.259 159.847 150.606 162.98 C 152.953 166.113 156.426 167.68 161.026 167.68 C 165.333 167.68 169.563 166.73 173.716 164.83 L 173.716 171.95 C 170.336 173.703 166.136 174.58 161.116 174.58 Z M 192.87 148.53 L 193.23 148.53 L 195.94 145.06 L 199.06 141.32 L 214.69 124.79 L 224.04 124.79 L 204.27 145.68 L 225.42 173.69 L 215.76 173.69 L 198.79 150.89 L 193.23 155.74 L 193.23 173.69 L 185.3 173.69 L 185.3 104.4 L 193.23 104.4 L 193.23 140.6 L 192.87 148.53 Z M 265.856 160.2 C 265.856 164.767 264.15 168.307 260.736 170.82 C 257.323 173.327 252.526 174.58 246.346 174.58 C 239.906 174.58 234.786 173.557 230.986 171.51 L 230.986 164.2 C 236.36 166.813 241.54 168.12 246.526 168.12 C 250.566 168.12 253.506 167.467 255.346 166.16 C 257.186 164.853 258.106 163.103 258.106 160.91 C 258.106 158.977 257.223 157.343 255.456 156.01 C 253.69 154.677 250.55 153.147 246.036 151.42 C 241.436 149.64 238.2 148.12 236.326 146.86 C 234.46 145.6 233.086 144.183 232.206 142.61 C 231.333 141.037 230.896 139.12 230.896 136.86 C 230.896 132.853 232.53 129.693 235.796 127.38 C 239.063 125.06 243.546 123.9 249.246 123.9 C 254.8 123.9 259.993 125 264.826 127.2 L 262.116 133.57 C 257.156 131.49 252.686 130.45 248.706 130.45 C 245.386 130.45 242.863 130.977 241.136 132.03 C 239.416 133.083 238.556 134.53 238.556 136.37 C 238.556 138.15 239.3 139.627 240.786 140.8 C 242.266 141.973 245.723 143.6 251.156 145.68 C 255.223 147.193 258.23 148.603 260.176 149.91 C 262.123 151.217 263.556 152.687 264.476 154.32 C 265.396 155.953 265.856 157.913 265.856 160.2 Z M 300.851 174.58 C 294.291 174.58 289.244 172.22 285.711 167.5 L 285.181 167.5 L 285.361 169.33 C 285.594 171.643 285.711 173.707 285.711 175.52 L 285.711 195.6 L 277.701 195.6 L 277.701 124.79 L 284.291 124.79 L 285.361 131.47 L 285.711 131.47 C 287.611 128.803 289.807 126.877 292.301 125.69 C 294.801 124.497 297.681 123.9 300.941 123.9 C 307.294 123.9 312.231 126.107 315.751 130.52 C 319.271 134.927 321.031 141.137 321.031 149.15 C 321.031 157.137 319.264 163.373 315.731 167.86 C 312.197 172.34 307.237 174.58 300.851 174.58 Z M 299.521 130.63 C 294.681 130.63 291.184 131.997 289.031 134.73 C 286.877 137.457 285.771 141.743 285.711 147.59 L 285.711 149.15 C 285.711 155.77 286.811 160.557 289.011 163.51 C 291.204 166.47 294.767 167.95 299.701 167.95 C 303.794 167.95 306.991 166.287 309.291 162.96 C 311.591 159.633 312.741 155 312.741 149.06 C 312.741 143.093 311.591 138.53 309.291 135.37 C 306.991 132.21 303.734 130.63 299.521 130.63 Z M 369.829 173.69 L 363.999 173.69 L 362.439 166.74 L 362.089 166.74 C 359.649 169.8 357.219 171.873 354.799 172.96 C 352.386 174.04 349.336 174.58 345.649 174.58 C 340.843 174.58 337.073 173.32 334.339 170.8 C 331.613 168.273 330.249 164.71 330.249 160.11 C 330.249 150.19 338.069 144.993 353.709 144.52 L 361.999 144.21 L 361.999 141.32 C 361.999 137.607 361.196 134.867 359.589 133.1 C 357.989 131.333 355.423 130.45 351.889 130.45 C 349.303 130.45 346.859 130.837 344.559 131.61 C 342.259 132.383 340.099 133.243 338.079 134.19 L 335.629 128.18 C 338.096 126.873 340.783 125.85 343.689 125.11 C 346.603 124.363 349.483 123.99 352.329 123.99 C 358.243 123.99 362.636 125.297 365.509 127.91 C 368.389 130.523 369.829 134.68 369.829 140.38 L 369.829 173.69 Z M 347.479 168.12 C 351.959 168.12 355.486 166.91 358.059 164.49 C 360.626 162.07 361.909 158.637 361.909 154.19 L 361.909 149.78 L 354.689 150.09 C 349.083 150.297 344.996 151.187 342.429 152.76 C 339.856 154.333 338.569 156.813 338.569 160.2 C 338.569 162.753 339.349 164.713 340.909 166.08 C 342.469 167.44 344.659 168.12 347.479 168.12 Z M 404.565 174.58 C 397.532 174.58 392.055 172.42 388.135 168.1 C 384.215 163.78 382.255 157.583 382.255 149.51 C 382.255 141.317 384.239 135 388.205 130.56 C 392.165 126.12 397.812 123.9 405.145 123.9 C 407.519 123.9 409.872 124.147 412.205 124.64 C 414.539 125.127 416.462 125.757 417.975 126.53 L 415.525 133.21 C 411.399 131.67 407.879 130.9 404.965 130.9 C 400.039 130.9 396.402 132.45 394.055 135.55 C 391.709 138.65 390.535 143.273 390.535 149.42 C 390.535 155.327 391.709 159.847 394.055 162.98 C 396.402 166.113 399.875 167.68 404.475 167.68 C 408.782 167.68 413.012 166.73 417.165 164.83 L 417.165 171.95 C 413.785 173.703 409.585 174.58 404.565 174.58 Z M 449.539 174.58 C 442.212 174.58 436.462 172.36 432.289 167.92 C 428.116 163.487 426.029 157.38 426.029 149.6 C 426.029 141.76 427.976 135.517 431.869 130.87 C 435.756 126.223 441.009 123.9 447.629 123.9 C 453.776 123.9 458.676 125.883 462.329 129.85 C 465.976 133.81 467.799 139.177 467.799 145.95 L 467.799 150.8 L 434.309 150.8 C 434.462 156.353 435.876 160.57 438.549 163.45 C 441.216 166.33 444.999 167.77 449.899 167.77 C 452.512 167.77 454.992 167.54 457.339 167.08 C 459.686 166.62 462.432 165.72 465.579 164.38 L 465.579 171.42 C 462.872 172.58 460.332 173.397 457.959 173.87 C 455.586 174.343 452.779 174.58 449.539 174.58 Z M 447.539 130.45 C 443.712 130.45 440.686 131.683 438.459 134.15 C 436.232 136.61 434.909 140.037 434.489 144.43 L 459.389 144.43 C 459.329 139.863 458.272 136.39 456.219 134.01 C 454.172 131.637 451.279 130.45 447.539 130.45 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]



{- == Row D == -}


tabKey : List (VectorImage.Element Msg)
tabKey =
    [ VectorImage.path "M 106.678 107.293 L 106.678 211.652 L 91.819 211.652 L 91.819 107.293 L 55.139 107.293 L 55.139 94.275 L 143.114 94.275 L 143.114 107.293 L 106.678 107.293 Z M 217.457 211.652 L 206.942 211.652 L 204.137 199.123 L 203.49 199.123 C 199.098 204.637 194.725 208.373 190.371 210.329 C 186.008 212.285 180.509 213.263 173.872 213.263 C 165.204 213.263 158.405 210.986 153.475 206.431 C 148.556 201.885 146.096 195.466 146.096 187.17 C 146.096 169.295 160.198 159.926 188.401 159.063 L 203.332 158.502 L 203.332 153.295 C 203.332 146.602 201.889 141.662 199.002 138.479 C 196.106 135.295 191.475 133.703 185.107 133.703 C 180.446 133.703 176.044 134.398 171.902 135.789 C 167.75 137.18 163.856 138.733 160.222 140.449 L 155.805 129.604 C 160.246 127.255 165.089 125.408 170.334 124.066 C 175.58 122.732 180.773 122.066 185.912 122.066 C 196.557 122.066 204.478 124.421 209.675 129.129 C 214.864 133.837 217.457 141.327 217.457 151.597 L 217.457 211.652 Z M 177.152 201.612 C 185.236 201.612 191.594 199.436 196.226 195.081 C 200.857 190.719 203.173 184.519 203.173 176.482 L 203.173 168.542 L 190.17 169.103 C 180.053 169.477 172.678 171.084 168.047 173.922 C 163.415 176.76 161.099 181.229 161.099 187.328 C 161.099 191.931 162.504 195.466 165.314 197.93 C 168.124 200.385 172.07 201.612 177.152 201.612 Z M 286.497 122.066 C 298.111 122.066 307.076 126.065 313.395 134.063 C 319.706 142.06 322.86 153.233 322.86 167.578 C 322.86 182.135 319.653 193.388 313.237 201.339 C 306.813 209.289 297.899 213.263 286.497 213.263 C 280.562 213.263 275.262 212.189 270.602 210.041 C 265.951 207.902 262.154 204.719 259.209 200.49 L 258.087 200.49 C 256.429 206.916 255.436 210.635 255.11 211.652 L 244.753 211.652 L 244.753 86.738 L 259.209 86.738 L 259.209 117.089 C 259.209 123.131 258.942 129.176 258.404 135.228 L 259.209 135.228 C 265.146 126.453 274.241 122.066 286.497 122.066 Z M 284.094 134.02 C 275.205 134.02 268.838 136.537 264.992 141.571 C 261.137 146.596 259.209 155.107 259.209 167.104 L 259.209 167.737 C 259.209 179.781 261.176 188.383 265.107 193.542 C 269.04 198.711 275.474 201.296 284.411 201.296 C 292.332 201.296 298.234 198.39 302.118 192.579 C 305.993 186.777 307.929 178.391 307.929 167.42 C 307.929 156.287 305.979 147.939 302.075 142.377 C 298.172 136.806 292.178 134.02 284.094 134.02 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
        |> VectorImage.translate { x = 10, y = 10 }
    ]


qKey : List (VectorImage.Element Msg)
qKey =
    [ VectorImage.path "M 212.567 147.847 C 212.567 164.867 209.154 179.064 202.327 190.437 C 195.507 201.804 185.827 209.637 173.287 213.937 L 205.557 247.497 L 181.217 247.497 L 155.127 217.077 L 150.427 217.257 C 130.58 217.257 115.23 211.19 104.377 199.057 C 93.53 186.917 88.107 169.784 88.107 147.657 C 88.107 125.717 93.5 108.71 104.287 96.637 C 115.074 84.557 130.517 78.517 150.617 78.517 C 170.157 78.517 185.367 84.647 196.247 96.907 C 207.127 109.167 212.567 126.147 212.567 147.847 Z M 105.997 147.847 C 105.997 165.667 109.777 179.247 117.337 188.587 C 124.897 197.934 135.927 202.607 150.427 202.607 C 164.874 202.607 175.844 197.997 183.337 188.777 C 190.837 179.557 194.587 165.914 194.587 147.847 C 194.587 129.84 190.87 116.274 183.437 107.147 C 175.997 98.02 165.057 93.457 150.617 93.457 C 135.99 93.457 124.897 98.08 117.337 107.327 C 109.777 116.574 105.997 130.08 105.997 147.847 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


wKey : List (VectorImage.Element Msg)
wKey =
    [ VectorImage.path "M 235.415 82.61 L 199.555 217.39 L 182.405 217.39 L 156.135 129.07 C 152.262 115.923 149.988 107.043 149.315 102.43 C 148.328 109.497 146.175 118.563 142.855 129.63 L 117.415 217.39 L 100.265 217.39 L 64.585 82.61 L 82.285 82.61 L 103.215 164.94 C 106.042 175.693 108.192 186.387 109.665 197.02 C 111.018 186.94 113.418 175.907 116.865 163.92 L 140.645 82.61 L 158.165 82.61 L 182.955 164.57 C 186.155 175.197 188.615 186.013 190.335 197.02 C 191.315 188.533 193.495 177.777 196.875 164.75 L 217.715 82.61 L 235.415 82.61 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


eKey : List (VectorImage.Element Msg)
eKey =
    [ VectorImage.path "M 187.655 202.46 L 187.655 217.39 L 112.345 217.39 L 112.345 82.61 L 187.655 82.61 L 187.655 97.55 L 129.305 97.55 L 129.305 139.58 L 184.245 139.58 L 184.245 154.33 L 129.305 154.33 L 129.305 202.46 L 187.655 202.46 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


rKey : List (VectorImage.Element Msg)
rKey =
    [ VectorImage.path "M 118.84 97.27 L 118.84 147.33 L 139.03 147.33 C 149.97 147.33 157.96 145.177 163 140.87 C 168.04 136.57 170.56 130.18 170.56 121.7 C 170.56 113.22 168.007 107.027 162.9 103.12 C 157.8 99.22 149.537 97.27 138.11 97.27 L 118.84 97.27 Z M 145.66 161.71 L 118.84 161.71 L 118.84 217.39 L 101.88 217.39 L 101.88 82.61 L 139.03 82.61 C 155.743 82.61 168.11 85.79 176.13 92.15 C 184.15 98.51 188.16 108.083 188.16 120.87 C 188.16 138.757 179.157 150.803 161.15 157.01 L 198.12 217.39 L 178.3 217.39 L 145.66 161.71 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


tKey : List (VectorImage.Element Msg)
tKey =
    [ VectorImage.path "M 158.67 97.55 L 158.67 217.39 L 141.61 217.39 L 141.61 97.55 L 99.48 97.55 L 99.48 82.61 L 200.52 82.61 L 200.52 97.55 L 158.67 97.55 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


yKey : List (VectorImage.Element Msg)
yKey =
    [ VectorImage.path "M 115.105 82.61 L 150.045 148.89 L 185.165 82.61 L 203.425 82.61 L 158.525 165.12 L 158.525 217.39 L 141.475 217.39 L 141.475 165.86 L 96.575 82.61 L 115.105 82.61 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


uKey : List (VectorImage.Element Msg)
uKey =
    [ VectorImage.path "M 185.08 81.69 L 201.95 81.69 L 201.95 168.9 C 201.95 184.267 197.31 196.343 188.03 205.13 C 178.75 213.917 165.873 218.31 149.4 218.31 C 133.113 218.31 120.483 213.87 111.51 204.99 C 102.537 196.11 98.05 183.957 98.05 168.53 L 98.05 81.69 L 115.11 81.69 L 115.11 169.09 C 115.11 180.09 118.043 188.6 123.91 194.62 C 129.783 200.647 138.62 203.66 150.42 203.66 C 161.54 203.66 170.097 200.677 176.09 194.71 C 182.083 188.75 185.08 180.147 185.08 168.9 L 185.08 81.69 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


iKey : List (VectorImage.Element Msg)
iKey =
    [ VectorImage.path "M 174.335 207.62 L 174.335 217.39 L 125.665 217.39 L 125.665 207.62 L 141.525 204.02 L 141.525 96.16 L 125.665 92.38 L 125.665 82.61 L 174.335 82.61 L 174.335 92.38 L 158.485 96.16 L 158.485 204.02 L 174.335 207.62 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


oKey : List (VectorImage.Element Msg)
oKey =
    [ VectorImage.path "M 212.23 149.96 C 212.23 171.527 206.773 188.487 195.86 200.84 C 184.953 213.193 169.697 219.37 150.09 219.37 C 130.243 219.37 114.893 213.303 104.04 201.17 C 93.193 189.03 87.77 171.897 87.77 149.77 C 87.77 127.83 93.163 110.823 103.95 98.75 C 114.737 86.67 130.18 80.63 150.28 80.63 C 169.82 80.63 185.03 86.76 195.91 99.02 C 206.79 111.28 212.23 128.26 212.23 149.96 Z M 105.66 149.96 C 105.66 167.78 109.44 181.36 117 190.7 C 124.56 200.047 135.59 204.72 150.09 204.72 C 164.537 204.72 175.507 200.11 183 190.89 C 190.5 181.67 194.25 168.027 194.25 149.96 C 194.25 131.953 190.533 118.387 183.1 109.26 C 175.66 100.133 164.72 95.57 150.28 95.57 C 135.653 95.57 124.56 100.193 117 109.44 C 109.44 118.687 105.66 132.193 105.66 149.96 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


pKey : List (VectorImage.Element Msg)
pKey =
    [ VectorImage.path "M 193.14 122.25 C 193.14 136.017 188.44 146.573 179.04 153.92 C 169.633 161.267 156.39 164.94 139.31 164.94 L 123.82 164.94 L 123.82 217.39 L 106.86 217.39 L 106.86 82.61 L 142.53 82.61 C 176.27 82.61 193.14 95.823 193.14 122.25 Z M 123.82 97.09 L 123.82 150.37 L 137.37 150.37 C 150.77 150.37 160.48 148.203 166.5 143.87 C 172.527 139.537 175.54 132.577 175.54 122.99 C 175.54 114.323 172.743 107.84 167.15 103.54 C 161.557 99.24 152.827 97.09 140.96 97.09 L 123.82 97.09 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


bracketLeftKey : List (VectorImage.Element Msg)
bracketLeftKey =
    [ VectorImage.path "M 166.477 182.811 L 166.477 192.101 L 140.697 192.101 L 140.697 59.421 L 166.477 59.421 L 166.477 68.711 L 151.417 68.711 L 151.417 182.811 L 166.477 182.811 Z M 155.767 87.341 Z M 155.437 50.851 Z M 157.457 205.671 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M 179.676 240.161 C 179.676 243.621 179.129 246.804 178.036 249.711 C 176.936 252.624 175.399 254.894 173.426 256.521 C 171.453 258.154 169.169 258.971 166.576 258.971 C 164.483 258.971 162.719 258.358 161.286 257.131 C 159.853 255.911 158.963 254.328 158.616 252.381 L 158.246 252.381 C 157.286 254.428 155.883 256.038 154.036 257.211 C 152.183 258.384 150.023 258.971 147.556 258.971 C 143.803 258.971 140.853 257.718 138.706 255.211 C 136.559 252.704 135.486 249.254 135.486 244.861 C 135.486 241.581 136.146 238.641 137.466 236.041 C 138.786 233.434 140.679 231.411 143.146 229.971 C 145.613 228.524 148.426 227.801 151.586 227.801 C 153.293 227.801 155.236 227.958 157.416 228.271 C 159.603 228.578 161.523 229.028 163.176 229.621 L 162.326 246.941 L 162.326 247.751 C 162.326 252.098 163.893 254.271 167.026 254.271 C 169.219 254.271 170.996 252.974 172.356 250.381 C 173.709 247.788 174.386 244.358 174.386 240.091 C 174.386 235.678 173.479 231.804 171.666 228.471 C 169.853 225.138 167.276 222.578 163.936 220.791 C 160.589 219.004 156.769 218.111 152.476 218.111 C 147.049 218.111 142.319 219.238 138.286 221.491 C 134.253 223.751 131.163 226.971 129.016 231.151 C 126.869 235.338 125.796 240.204 125.796 245.751 C 125.796 253.204 127.756 258.938 131.676 262.951 C 135.596 266.958 141.296 268.961 148.776 268.961 C 154.009 268.961 159.436 267.874 165.056 265.701 L 165.056 270.851 C 160.123 272.924 154.696 273.961 148.776 273.961 C 139.796 273.961 132.813 271.498 127.826 266.571 C 122.839 261.651 120.346 254.798 120.346 246.011 C 120.346 239.624 121.673 233.918 124.326 228.891 C 126.979 223.871 130.749 219.988 135.636 217.241 C 140.523 214.488 146.136 213.111 152.476 213.111 C 157.783 213.111 162.513 214.234 166.666 216.481 C 170.826 218.721 174.036 221.904 176.296 226.031 C 178.549 230.151 179.676 234.861 179.676 240.161 Z M 141.406 245.011 C 141.406 251.184 143.789 254.271 148.556 254.271 C 153.609 254.271 156.359 250.458 156.806 242.831 L 157.256 233.351 C 155.449 232.838 153.586 232.581 151.666 232.581 C 148.479 232.581 145.973 233.678 144.146 235.871 C 142.319 238.071 141.406 241.118 141.406 245.011 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]


bracketRightKey : List (VectorImage.Element Msg)
bracketRightKey =
    [ VectorImage.path "M 133.037 190.557 L 133.037 181.017 L 148.437 181.017 L 148.437 63.897 L 133.037 63.897 L 133.037 54.357 L 159.577 54.357 L 159.577 190.557 L 133.037 190.557 Z M 142.567 82.977 Z M 142.237 45.487 Z M 157.647 204.497 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M 159.394 274.471 L 159.394 279.771 L 144.704 279.771 L 144.704 204.151 L 159.394 204.151 L 159.394 209.441 L 150.814 209.441 L 150.814 274.471 L 159.394 274.471 Z M 153.294 220.071 Z M 153.104 199.271 Z M 154.254 287.501 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]



{- == Row C == -}


capsLockKey : List (VectorImage.Element Msg)
capsLockKey =
    [ VectorImage.path "M48.7 115.4c-7.8 0-14 2.3-18.5 7a26 26 0 0 0-6.8 18.9c0 8.2 2.2 14.6 6.6 19.1 4.3 4.5 10.6 6.7 18.6 6.7 5.2 0 11-.8 17.5-2.5v7a50 50 0 0 1-18.8 2.6c-10.7 0-19-2.9-24.8-8.6-5.8-5.8-8.7-13.9-8.7-24.4a35 35 0 0 1 4.1-17.4 28 28 0 0 1 12.2-11.5 49.8 49.8 0 0 1 39-.3l-3.8 7a44.5 44.5 0 0 0-16.6-3.6zm72.5 58h-6.5l-1.8-7h-.4c-2.7 3.1-5.4 5.1-8.1 6.2-2.7 1-6.2 1.6-10.3 1.6-5.4 0-9.6-1.2-12.7-3.7-3-2.5-4.6-6-4.6-10.5 0-9.8 8.8-15 26.4-15.4l9.2-.3v-2.8c0-3.7-.9-6.4-2.7-8.1-1.8-1.8-4.6-2.7-8.6-2.7a29 29 0 0 0-8.2 1.2c-2.6.7-5 1.6-7.3 2.5l-2.7-5.9a44.6 44.6 0 0 1 18.7-4.1c6.6 0 11.6 1.3 14.8 3.9 3.2 2.5 4.8 6.6 4.8 12.2v32.8zm-25-5.6c5 0 9-1.1 11.8-3.5 2.9-2.4 4.3-5.8 4.3-10.2v-4.3l-8 .3c-6.3.2-11 1-13.8 2.6a7.8 7.8 0 0 0-4.3 7.3c0 2.6.8 4.5 2.6 5.8 1.7 1.4 4.2 2 7.4 2zm68 6.4a21 21 0 0 1-17-7h-.6l.2 1.8c.3 2.3.4 4.3.4 6.1V195h-9v-69.7h7.4l1.2 6.6h.4c2.1-2.7 4.6-4.6 7.4-5.7 2.8-1.2 6-1.8 9.7-1.8 7.1 0 12.6 2.2 16.6 6.5 4 4.4 5.9 10.5 5.9 18.4 0 7.8-2 14-6 18.4-4 4.4-9.5 6.6-16.6 6.6zm-1.5-43.3c-5.4 0-9.4 1.4-11.8 4-2.4 2.7-3.6 7-3.7 12.7v1.6c0 6.5 1.2 11.2 3.7 14.1 2.5 3 6.5 4.4 12 4.4a13 13 0 0 0 10.7-5c2.6-3.2 4-7.8 4-13.6 0-5.9-1.4-10.4-4-13.5a13.4 13.4 0 0 0-11-4.7zm74.1 29.1c0 4.5-1.9 8-5.7 10.5a29.7 29.7 0 0 1-16.1 3.7c-7.3 0-13-1-17.3-3V164c6 2.6 11.9 3.8 17.5 3.8 4.5 0 7.8-.6 9.8-1.9 2.1-1.3 3.1-3 3.1-5.2 0-1.9-1-3.5-3-4.8-2-1.3-5.4-2.8-10.5-4.5a63.6 63.6 0 0 1-10.9-4.5c-2-1.2-3.6-2.6-4.6-4.2-1-1.5-1.5-3.4-1.5-5.6 0-4 1.9-7.1 5.5-9.4 3.7-2.3 8.7-3.4 15.1-3.4 6.2 0 12 1 17.5 3.2l-3 6.3c-5.6-2-10.6-3-15-3-3.8 0-6.6.5-8.6 1.5s-2.9 2.5-2.9 4.3c0 1.7.9 3.2 2.5 4.3 1.7 1.2 5.6 2.8 11.7 4.8 4.5 1.5 7.9 3 10 4.2a14 14 0 0 1 4.9 4.4c1 1.6 1.5 3.5 1.5 5.7zm82.2 13.3h-41v-64h9.1V166h32v7.2zm59-24.1c0 7.8-2.4 14-6.9 18.4a25.7 25.7 0 0 1-18.8 6.6c-5 0-9.3-1-13.1-3-3.9-2-6.8-5-8.9-8.8-2-3.8-3-8.2-3-13.2 0-7.9 2.2-14 6.6-18.3a25.7 25.7 0 0 1 18.8-6.6c7.7 0 13.9 2.2 18.4 6.7a24.3 24.3 0 0 1 6.8 18.2zm-41.5 0c0 6 1.4 10.6 4 13.8 2.8 3.1 6.8 4.7 12.1 4.7 5.2 0 9.2-1.6 12-4.7 2.7-3.2 4-7.8 4-13.8 0-6-1.3-10.6-4-13.7-2.8-3-6.9-4.6-12.2-4.6-10.6 0-15.9 6.1-15.9 18.3zm77.6 25c-7.9 0-14-2.1-18.4-6.4-4.4-4.2-6.6-10.3-6.6-18.3s2.2-14.3 6.7-18.6c4.4-4.4 10.8-6.6 19-6.6a43.7 43.7 0 0 1 14.4 2.6l-2.8 6.6a39.1 39.1 0 0 0-11.8-2.3c-5.6 0-9.6 1.5-12.3 4.6-2.6 3-3.9 7.6-3.9 13.6 0 5.8 1.3 10.3 4 13.4 2.6 3 6.5 4.6 11.6 4.6 4.9 0 9.6-1 14.3-2.8v7a34 34 0 0 1-14.2 2.6zm35.6-25.6h.4l3-3.5 3.6-3.6 17.5-16.3h10.5l-22.2 20.5 23.7 27.6h-10.8l-19-22.4-6.3 4.8v17.6h-8.9v-68.2h9v35.6l-.5 7.9z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


aKey : List (VectorImage.Element Msg)
aKey =
    [ VectorImage.path "M 210.245 217.665 L 192.635 217.665 L 176.415 175.905 L 122.945 175.905 L 106.905 217.665 L 89.755 217.665 L 142.395 82.335 L 157.695 82.335 L 210.245 217.665 Z M 128.655 160.875 L 171.345 160.875 L 156.225 120.035 L 149.765 99.845 C 147.925 107.225 145.992 113.955 143.965 120.035 L 128.655 160.875 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


sKey : List (VectorImage.Element Msg)
sKey =
    [ VectorImage.path "M 192.59 181.385 C 192.59 193.125 188.35 202.375 179.87 209.135 C 171.39 215.895 159.59 219.275 144.47 219.275 C 128.49 219.275 116.137 217.155 107.41 212.915 L 107.41 196.695 C 113.123 199.155 119.377 201.092 126.17 202.505 C 132.957 203.918 139.3 204.625 145.2 204.625 C 155.28 204.625 162.87 202.688 167.97 198.815 C 173.077 194.942 175.63 189.625 175.63 182.865 C 175.63 178.378 174.707 174.692 172.86 171.805 C 171.02 168.912 167.933 166.205 163.6 163.685 C 159.267 161.165 152.703 158.308 143.91 155.115 C 131.437 150.568 122.527 145.205 117.18 139.025 C 111.833 132.852 109.16 124.878 109.16 115.105 C 109.16 104.598 113.11 96.242 121.01 90.035 C 128.903 83.828 139.303 80.725 152.21 80.725 C 165.67 80.725 178.053 83.245 189.36 88.285 L 184.11 102.845 C 172.557 98.052 161.8 95.655 151.84 95.655 C 143.853 95.655 137.6 97.375 133.08 100.815 C 128.567 104.262 126.31 109.088 126.31 115.295 C 126.31 119.715 127.183 123.385 128.93 126.305 C 130.683 129.225 133.51 131.885 137.41 134.285 C 141.317 136.678 147.45 139.412 155.81 142.485 C 165.823 146.172 173.29 149.752 178.21 153.225 C 183.123 156.698 186.75 160.695 189.09 165.215 C 191.423 169.728 192.59 175.118 192.59 181.385 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


dKey : List (VectorImage.Element Msg)
dKey =
    [ VectorImage.path "M 203.975 148.71 C 203.975 170.957 197.905 187.967 185.765 199.74 C 173.625 211.507 156.218 217.39 133.545 217.39 L 96.025 217.39 L 96.025 82.61 L 137.505 82.61 C 158.465 82.61 174.782 88.373 186.455 99.9 C 198.135 111.42 203.975 127.69 203.975 148.71 Z M 186.085 149.26 C 186.085 132.113 181.862 119.13 173.415 110.31 C 164.962 101.497 152.192 97.09 135.105 97.09 L 112.985 97.09 L 112.985 202.82 L 131.325 202.82 C 167.832 202.82 186.085 184.967 186.085 149.26 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


fKey : List (VectorImage.Element Msg)
fKey =
    [ VectorImage.path "M 129.305 160.14 L 129.305 217.39 L 112.345 217.39 L 112.345 82.61 L 187.655 82.61 L 187.655 97.55 L 129.305 97.55 L 129.305 145.3 L 184.065 145.3 L 184.065 160.14 L 129.305 160.14 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


gKey : List (VectorImage.Element Msg)
gKey =
    [ VectorImage.path "M 159.4 161.385 L 159.4 146.265 L 205.96 146.265 L 205.96 212.365 C 198.833 214.638 191.58 216.358 184.2 217.525 C 176.827 218.692 168.283 219.275 158.57 219.275 C 138.043 219.275 122.157 213.192 110.91 201.025 C 99.663 188.858 94.04 171.865 94.04 150.045 C 94.04 135.972 96.837 123.682 102.43 113.175 C 108.023 102.662 116.09 94.625 126.63 89.065 C 137.17 83.505 149.6 80.725 163.92 80.725 C 178.3 80.725 191.7 83.365 204.12 88.645 L 197.66 103.395 C 185.8 98.235 174.217 95.655 162.91 95.655 C 146.87 95.655 134.333 100.512 125.3 110.225 C 116.26 119.932 111.74 133.205 111.74 150.045 C 111.74 167.872 116.073 181.425 124.74 190.705 C 133.407 199.985 146.007 204.625 162.54 204.625 C 171.573 204.625 180.393 203.548 189 201.395 L 189 161.385 L 159.4 161.385 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


hKey : List (VectorImage.Element Msg)
hKey =
    [ VectorImage.path "M 201.53 82.61 L 201.53 217.39 L 184.57 217.39 L 184.57 154.52 L 115.43 154.52 L 115.43 217.39 L 98.47 217.39 L 98.47 82.61 L 115.43 82.61 L 115.43 139.58 L 184.57 139.58 L 184.57 82.61 L 201.53 82.61 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


jKey : List (VectorImage.Element Msg)
jKey =
    [ VectorImage.path "M 139.44 235.32 C 133.667 235.32 128.997 234.49 125.43 232.83 L 125.43 218.54 C 129.797 219.773 134.343 220.39 139.07 220.39 C 145.217 220.39 149.827 218.53 152.9 214.81 C 155.973 211.09 157.51 205.727 157.51 198.72 L 157.51 64.68 L 174.57 64.68 L 174.57 197.34 C 174.57 209.507 171.543 218.88 165.49 225.46 C 159.437 232.033 150.753 235.32 139.44 235.32 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


kKey : List (VectorImage.Element Msg)
kKey =
    [ VectorImage.path "M 143.78 141.34 L 199.27 217.39 L 179.27 217.39 L 131.42 153.04 L 117.69 165.12 L 117.69 217.39 L 100.73 217.39 L 100.73 82.61 L 117.69 82.61 L 117.69 149.08 L 129.3 136.26 L 177.33 82.61 L 197.15 82.61 L 143.78 141.34 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


lKey : List (VectorImage.Element Msg)
lKey =
    [ VectorImage.path "M 187.935 217.39 L 112.065 217.39 L 112.065 82.61 L 129.025 82.61 L 129.025 202.27 L 187.935 202.27 L 187.935 217.39 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


semicolonKey : List (VectorImage.Element Msg)
semicolonKey =
    [ VectorImage.path "M 143.73 174.615 L 161.98 174.615 L 163.37 176.735 C 162.51 180.055 161.48 183.588 160.28 187.335 C 159.08 191.082 157.757 194.862 156.31 198.675 C 154.87 202.488 153.367 206.285 151.8 210.065 C 150.233 213.845 148.68 217.455 147.14 220.895 L 134.42 220.895 C 135.34 217.142 136.247 213.238 137.14 209.185 C 138.033 205.132 138.893 201.092 139.72 197.065 C 140.547 193.038 141.3 189.105 141.98 185.265 C 142.653 181.425 143.237 177.875 143.73 174.615 Z M 142.16 105.565 C 142.16 103.172 142.467 101.158 143.08 99.525 C 143.7 97.898 144.53 96.578 145.57 95.565 C 146.617 94.552 147.847 93.828 149.26 93.395 C 150.673 92.968 152.21 92.755 153.87 92.755 C 155.47 92.755 156.99 92.968 158.43 93.395 C 159.877 93.828 161.123 94.552 162.17 95.565 C 163.21 96.578 164.04 97.898 164.66 99.525 C 165.273 101.158 165.58 103.172 165.58 105.565 C 165.58 107.838 165.273 109.775 164.66 111.375 C 164.04 112.975 163.21 114.295 162.17 115.335 C 161.123 116.382 159.877 117.152 158.43 117.645 C 156.99 118.132 155.47 118.375 153.87 118.375 C 152.21 118.375 150.673 118.132 149.26 117.645 C 147.847 117.152 146.617 116.382 145.57 115.335 C 144.53 114.295 143.7 112.975 143.08 111.375 C 142.467 109.775 142.16 107.838 142.16 105.565 Z M 153.87 79.105 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


quoteKey : List (VectorImage.Element Msg)
quoteKey =
    [ VectorImage.path "M 141.477 69.782 L 156.437 69.782 L 153.077 104.592 L 144.837 104.592 L 141.477 69.782 Z M 155.847 84.222 Z M 155.517 47.172 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M 143.004 263.111 C 143.004 262.178 143.127 261.381 143.374 260.721 C 143.621 260.068 143.954 259.538 144.374 259.131 C 144.794 258.724 145.287 258.428 145.854 258.241 C 146.421 258.061 147.037 257.971 147.704 257.971 C 148.344 257.971 148.954 258.061 149.534 258.241 C 150.114 258.428 150.614 258.724 151.034 259.131 C 151.454 259.538 151.787 260.068 152.034 260.721 C 152.281 261.381 152.404 262.178 152.404 263.111 C 152.404 264.024 152.281 264.808 152.034 265.461 C 151.787 266.114 151.454 266.651 151.034 267.071 C 150.614 267.491 150.114 267.801 149.534 268.001 C 148.954 268.194 148.344 268.291 147.704 268.291 C 147.037 268.291 146.421 268.194 145.854 268.001 C 145.287 267.801 144.794 267.491 144.374 267.071 C 143.954 266.651 143.621 266.114 143.374 265.461 C 143.127 264.808 143.004 264.024 143.004 263.111 Z M 143.004 230.691 C 143.004 229.731 143.127 228.924 143.374 228.271 C 143.621 227.611 143.954 227.078 144.374 226.671 C 144.794 226.264 145.287 225.974 145.854 225.801 C 146.421 225.628 147.037 225.541 147.704 225.541 C 148.344 225.541 148.954 225.628 149.534 225.801 C 150.114 225.974 150.614 226.264 151.034 226.671 C 151.454 227.078 151.787 227.611 152.034 228.271 C 152.281 228.924 152.404 229.731 152.404 230.691 C 152.404 231.604 152.281 232.381 152.034 233.021 C 151.787 233.661 151.454 234.191 151.034 234.611 C 150.614 235.031 150.114 235.341 149.534 235.541 C 148.954 235.734 148.344 235.831 147.704 235.831 C 147.037 235.831 146.421 235.734 145.854 235.541 C 145.287 235.341 144.794 235.031 144.374 234.611 C 143.954 234.191 143.621 233.661 143.374 233.021 C 143.127 232.381 143.004 231.604 143.004 230.691 Z M 147.704 220.071 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]


backslashKey : List (VectorImage.Element Msg)
backslashKey =
    [ VectorImage.path "M 131.657 55.942 L 142.727 55.942 L 178.257 190.552 L 167.187 190.552 L 131.657 55.942 Z M 155.847 84.222 Z M 155.517 47.172 Z M 157.557 204.322 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M 140.594 279.771 L 140.594 274.471 L 149.144 274.471 L 149.144 209.481 L 140.594 209.481 L 140.594 204.191 L 155.324 204.191 L 155.324 279.771 L 140.594 279.771 Z M 145.884 220.071 Z M 145.704 199.271 Z M 154.254 287.501 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue)
    ]


enterKey : List (VectorImage.Element Msg)
enterKey =
    [ VectorImage.path "M123.5 180.6v9H77.9V108h45.6v9H88v25.5h33.3v9H88.1v29h35.4zm68.2 9h-10v-39.2c0-5-1-8.7-3.2-11.1-2.2-2.4-5.7-3.7-10.4-3.7-6.3 0-10.9 1.8-13.7 5.3-2.9 3.4-4.3 9.1-4.3 17v31.7h-10v-61.3h8l1.5 8.4h.6c1.9-3 4.6-5.3 8-7 3.4-1.7 7.2-2.5 11.3-2.5 7.5 0 13.1 1.8 16.8 5.5 3.6 3.6 5.4 9.3 5.4 17v40zm39.5-7a31.6 31.6 0 0 0 8.5-1.4v7.7a30 30 0 0 1-10.3 1.8c-12 0-18-6.3-18-18.9v-35.7h-8.6v-4.8l8.8-4 4-13h6v14h17.7v7.8h-17.7v35.4c0 3.6.8 6.3 2.5 8.2a9 9 0 0 0 7 2.8zm46.8 8.1c-9.2 0-16.4-2.8-21.6-8.3a32.2 32.2 0 0 1-7.9-23c0-9.8 2.5-17.6 7.4-23.4a24.4 24.4 0 0 1 19.7-8.8c7.7 0 13.9 2.5 18.4 7.5 4.6 5 6.9 11.7 6.9 20.1v6.1h-42c.2 7 2 12.3 5.3 15.9 3.4 3.6 8.1 5.4 14.3 5.4A48 48 0 0 0 298 178v8.8a48.3 48.3 0 0 1-20.1 4zm-2.5-55.3c-4.8 0-8.6 1.6-11.4 4.7-2.8 3-4.4 7.3-5 12.8h31.2c0-5.7-1.3-10-4-13-2.5-3-6.1-4.5-10.8-4.5zm69.5-8.2c2.7 0 5.1.2 7.2.7l-1.2 9.3c-2.3-.6-4.5-.8-6.7-.8-3.2 0-6.2.9-9 2.7-2.8 1.7-5 4.2-6.5 7.3a23.2 23.2 0 0 0-2.3 10.5v32.7h-10v-61.3h8.2l1 11.3h.5c2.4-4.1 5.1-7.2 8.3-9.3 3.2-2 6.7-3 10.5-3z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]



{- == Row B == -}


shiftKey : List (VectorImage.Element Msg)
shiftKey =
    [ VectorImage.path "M82.7 173.6c0 7.4-2.7 13.3-8 17.6a35 35 0 0 1-22.5 6.4 55 55 0 0 1-23.5-4v-10.3a61.6 61.6 0 0 0 24 5c6.3 0 11.2-1.2 14.4-3.7a12 12 0 0 0 4.8-10c0-2.9-.5-5.2-1.7-7a17 17 0 0 0-5.9-5.2 82.9 82.9 0 0 0-12.5-5.4c-7.9-3-13.5-6.3-16.9-10.2-3.4-4-5-9-5-15.2 0-6.6 2.4-12 7.4-15.9 5-3.9 11.6-5.9 19.8-5.9 8.5 0 16.4 1.6 23.5 4.8l-3.3 9.2c-7.3-3-14.1-4.5-20.4-4.5-5 0-9 1-12 3.3a10.9 10.9 0 0 0-4.2 9.1c0 2.8.5 5.2 1.7 7 1 1.9 2.9 3.5 5.3 5 2.5 1.6 6.4 3.3 11.7 5.3 6.3 2.3 11 4.6 14.2 6.8 3 2.2 5.4 4.7 6.9 7.6a22 22 0 0 1 2.2 10.2zm69.8 22.8h-10.4v-41c0-5.2-1.1-9-3.4-11.6-2.4-2.6-6-3.8-11-3.8-6.4 0-11.2 1.8-14.2 5.4-3 3.6-4.5 9.6-4.5 18v33H98.4v-90.8H109v26.6c0 3.5-.2 6.5-.6 9h.7c1.9-3.1 4.6-5.6 8.1-7.3 3.5-1.8 7.4-2.6 11.8-2.6 7.8 0 13.7 1.8 17.6 5.5 4 3.8 6 9.7 6 17.9v41.7zm30.4-64v64h-10.5v-64h10.5zM171.6 115c0-2.4.6-4 1.7-5.1 1.2-1 2.7-1.6 4.4-1.6 1.7 0 3.1.5 4.3 1.6 1.3 1 1.9 2.7 1.9 5 0 2.4-.6 4-1.9 5.1a6.3 6.3 0 0 1-4.3 1.7c-1.7 0-3.2-.6-4.4-1.7-1.1-1-1.7-2.7-1.7-5zm61.2 17.3v8.2h-16.2v56H206v-56h-11.2v-5L206 132v-3.7c0-7.8 1.7-13.6 5-17.5 3.5-4 8.7-5.9 15.8-5.9 4.1 0 8.3.7 12.5 2.2l-2.8 8.2a31.6 31.6 0 0 0-9.6-1.7c-3.5 0-6.1 1.1-7.8 3.5-1.8 2.3-2.6 6-2.6 11v4.2h16.2zm33 56.7a33 33 0 0 0 9-1.3v8a31.3 31.3 0 0 1-10.8 1.9c-12.5 0-18.8-6.6-18.8-19.8v-37.3h-9v-5l9.1-4.2 4.2-13.7h6.3v14.7h18.5v8.2h-18.5v37c0 3.7.9 6.6 2.6 8.5 1.8 2 4.3 3 7.4 3z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


zKey : List (VectorImage.Element Msg)
zKey =
    [ VectorImage.path "M 196.74 202.27 L 196.74 217.39 L 103.26 217.39 L 103.26 204.58 L 174.25 97.73 L 105.47 97.73 L 105.47 82.61 L 194.8 82.61 L 194.8 95.43 L 123.82 202.27 L 196.74 202.27 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


xKey : List (VectorImage.Element Msg)
xKey =
    [ VectorImage.path "M 159.675 146.77 L 204.575 217.39 L 185.305 217.39 L 149.625 158.85 L 113.395 217.39 L 95.425 217.39 L 140.225 147.14 L 98.285 82.61 L 117.175 82.61 L 150.185 135.44 L 183.465 82.61 L 201.345 82.61 L 159.675 146.77 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


cKey : List (VectorImage.Element Msg)
cKey =
    [ VectorImage.path "M 163.55 95.655 C 149.05 95.655 137.65 100.512 129.35 110.225 C 121.057 119.932 116.91 133.205 116.91 150.045 C 116.91 167.438 120.933 180.852 128.98 190.285 C 137.033 199.718 148.497 204.435 163.37 204.435 C 172.957 204.435 183.743 202.652 195.73 199.085 L 195.73 213.835 C 190.01 215.928 184.51 217.358 179.23 218.125 C 173.943 218.892 167.857 219.275 160.97 219.275 C 141.123 219.275 125.837 213.238 115.11 201.165 C 104.383 189.085 99.02 171.985 99.02 149.865 C 99.02 135.972 101.587 123.802 106.72 113.355 C 111.853 102.908 119.32 94.858 129.12 89.205 C 138.927 83.552 150.467 80.725 163.74 80.725 C 178 80.725 190.413 83.365 200.98 88.645 L 194.16 103.035 C 183.407 98.115 173.203 95.655 163.55 95.655 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


vKey : List (VectorImage.Element Msg)
vKey =
    [ VectorImage.path "M 141.47 217.39 L 93.35 82.61 L 111.14 82.61 L 141.47 169.08 C 145.343 180.02 148.17 189.823 149.95 198.49 C 151.49 190.75 154.35 180.823 158.53 168.71 L 188.67 82.61 L 206.65 82.61 L 158.53 217.39 L 141.47 217.39 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


bKey : List (VectorImage.Element Msg)
bKey =
    [ VectorImage.path "M 102.895 217.39 L 102.895 82.61 L 141.335 82.61 C 159.402 82.61 172.445 85.3 180.465 90.68 C 188.485 96.053 192.495 104.487 192.495 115.98 C 192.495 123.973 190.315 130.567 185.955 135.76 C 181.588 140.953 175.225 144.317 166.865 145.85 L 166.865 146.77 C 177.252 148.557 184.888 152.153 189.775 157.56 C 194.662 162.967 197.105 170.127 197.105 179.04 C 197.105 191.087 192.988 200.49 184.755 207.25 C 176.515 214.01 165.022 217.39 150.275 217.39 L 102.895 217.39 Z M 119.855 97.09 L 119.855 139.95 L 144.745 139.95 C 155.312 139.95 162.995 138.26 167.795 134.88 C 172.588 131.5 174.985 125.847 174.985 117.92 C 174.985 110.547 172.355 105.23 167.095 101.97 C 161.842 98.717 153.532 97.09 142.165 97.09 L 119.855 97.09 Z M 145.755 154.15 L 119.855 154.15 L 119.855 203.01 L 147.045 203.01 C 157.865 203.01 165.885 200.92 171.105 196.74 C 176.332 192.56 178.945 186.23 178.945 177.75 C 178.945 169.697 176.178 163.75 170.645 159.91 C 165.118 156.07 156.822 154.15 145.755 154.15 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


nKey : List (VectorImage.Element Msg)
nKey =
    [ VectorImage.path "M 203.42 82.61 L 203.42 217.39 L 183.6 217.39 L 111.42 105.47 L 110.68 105.47 L 111.14 112.94 C 111.88 124.127 112.25 133.837 112.25 142.07 L 112.25 217.39 L 96.58 217.39 L 96.58 82.61 L 116.21 82.61 L 120.36 89.16 L 164.61 157.56 L 188.12 194.16 L 188.86 194.16 C 188.733 192.687 188.487 187.417 188.12 178.35 C 187.747 169.283 187.56 162.723 187.56 158.67 L 187.56 82.61 L 203.42 82.61 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


mKey : List (VectorImage.Element Msg)
mKey =
    [ VectorImage.path "M 156.085 217.39 L 142.165 217.39 L 97.725 99.21 L 96.985 99.21 C 97.912 109.043 98.375 121.18 98.375 135.62 L 98.375 217.39 L 82.705 217.39 L 82.705 82.61 L 107.775 82.61 L 149.355 193.05 L 150.085 193.05 L 192.405 82.61 L 217.295 82.61 L 217.295 217.39 L 200.515 217.39 L 200.515 134.51 C 200.515 125.297 200.945 113.59 201.805 99.39 L 201.065 99.39 L 156.085 217.39 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


commaKey : List (VectorImage.Element Msg)
commaKey =
    [ VectorImage.path "M 144.84 193.477 L 163.09 193.477 L 164.47 195.597 C 163.61 198.917 162.583 202.45 161.39 206.197 C 160.19 209.944 158.867 213.724 157.42 217.537 C 155.98 221.35 154.477 225.147 152.91 228.927 C 151.337 232.707 149.783 236.317 148.25 239.757 L 135.53 239.757 C 136.45 236.004 137.357 232.1 138.25 228.047 C 139.137 223.994 139.997 219.954 140.83 215.927 C 141.657 211.9 142.41 207.967 143.09 204.127 C 143.763 200.287 144.347 196.737 144.84 193.477 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


periodKey : List (VectorImage.Element Msg)
periodKey =
    [ VectorImage.path "M 138.29 205.187 C 138.29 202.847 138.597 200.864 139.21 199.237 C 139.83 197.61 140.66 196.29 141.7 195.277 C 142.747 194.264 143.977 193.524 145.39 193.057 C 146.803 192.597 148.34 192.367 150 192.367 C 151.6 192.367 153.12 192.597 154.56 193.057 C 156.007 193.524 157.253 194.264 158.3 195.277 C 159.34 196.29 160.17 197.61 160.79 199.237 C 161.403 200.864 161.71 202.847 161.71 205.187 C 161.71 207.46 161.403 209.41 160.79 211.037 C 160.17 212.664 159.34 214 158.3 215.047 C 157.253 216.094 156.007 216.864 154.56 217.357 C 153.12 217.844 151.6 218.087 150 218.087 C 148.34 218.087 146.803 217.844 145.39 217.357 C 143.977 216.864 142.747 216.094 141.7 215.047 C 140.66 214 139.83 212.664 139.21 211.037 C 138.597 209.41 138.29 207.46 138.29 205.187 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


slashKey : List (VectorImage.Element Msg)
slashKey =
    [ VectorImage.path "M 167.105 52.19 L 182.585 52.19 L 133.085 240.62 L 117.415 240.62 L 167.105 52.19 Z M 151.245 91.92 Z M 150.785 40.11 Z M 153.645 259.89 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


intlRoKey : List (VectorImage.Element Msg)
intlRoKey =
    [ VectorImage.path "M 117.415 52.37 L 132.905 52.37 L 182.585 240.62 L 167.105 240.62 L 117.415 52.37 Z M 151.245 91.92 Z M 150.785 40.11 Z M 153.645 259.89 Z" VectorImage.strokeNone (VectorImage.fillColor P.skyBlue) ]



{- == Row A == -}


ctrlKey : List (VectorImage.Element Msg)
ctrlKey =
    [ VectorImage.path "M 112.807 115.882 C 104.027 115.882 97.127 118.822 92.107 124.702 C 87.08 130.582 84.567 138.619 84.567 148.812 C 84.567 159.345 87.004 167.465 91.877 173.172 C 96.757 178.885 103.697 181.742 112.697 181.742 C 118.504 181.742 125.034 180.662 132.287 178.502 L 132.287 187.432 C 128.827 188.699 125.497 189.565 122.297 190.032 C 119.097 190.499 115.414 190.732 111.247 190.732 C 99.227 190.732 89.974 187.075 83.487 179.762 C 76.994 172.449 73.747 162.095 73.747 148.702 C 73.747 140.295 75.3 132.929 78.407 126.602 C 81.514 120.275 86.034 115.402 91.967 111.982 C 97.9 108.555 104.887 106.842 112.927 106.842 C 121.554 106.842 129.067 108.442 135.467 111.642 L 131.337 120.352 C 124.83 117.372 118.654 115.882 112.807 115.882 ZM 169.176 182.522 C 170.482 182.522 172.009 182.392 173.756 182.132 C 175.502 181.872 176.822 181.575 177.716 181.242 L 177.716 188.942 C 176.789 189.349 175.349 189.749 173.396 190.142 C 171.442 190.535 169.459 190.732 167.446 190.732 C 155.466 190.732 149.476 184.425 149.476 171.812 L 149.476 136.142 L 140.826 136.142 L 140.826 131.342 L 149.586 127.332 L 153.606 114.272 L 159.576 114.272 L 159.576 128.332 L 177.276 128.332 L 177.276 136.142 L 159.576 136.142 L 159.576 171.532 C 159.576 175.065 160.422 177.782 162.116 179.682 C 163.809 181.575 166.162 182.522 169.176 182.522 ZM 218.52 127.212 C 221.233 127.212 223.633 127.435 225.72 127.882 L 224.49 137.152 C 222.216 136.632 220.003 136.372 217.85 136.372 C 214.61 136.372 211.603 137.265 208.83 139.052 C 206.063 140.832 203.896 143.295 202.33 146.442 C 200.77 149.589 199.99 153.079 199.99 156.912 L 199.99 189.612 L 189.94 189.612 L 189.94 128.332 L 198.2 128.332 L 199.32 139.552 L 199.76 139.552 C 202.106 135.492 204.88 132.422 208.08 130.342 C 211.28 128.255 214.76 127.212 218.52 127.212 ZM 247.205 102.772 L 247.205 189.612 L 237.155 189.612 L 237.155 102.772 L 247.205 102.772 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


altKey : List (VectorImage.Element Msg)
altKey =
    [ VectorImage.path "M 139.707 189.612 L 129.047 189.612 L 119.227 164.332 L 86.857 164.332 L 77.147 189.612 L 66.767 189.612 L 98.637 107.682 L 107.897 107.682 L 139.707 189.612 Z M 90.317 155.232 L 116.157 155.232 L 107.007 130.512 L 103.097 118.282 C 101.984 122.749 100.814 126.825 99.587 130.512 L 90.317 155.232 ZM 159.583 102.772 L 159.583 189.612 L 149.533 189.612 L 149.533 102.772 L 159.583 102.772 ZM 199.481 182.522 C 200.787 182.522 202.314 182.392 204.061 182.132 C 205.807 181.872 207.127 181.575 208.021 181.242 L 208.021 188.942 C 207.094 189.349 205.654 189.749 203.701 190.142 C 201.747 190.535 199.764 190.732 197.751 190.732 C 185.771 190.732 179.781 184.425 179.781 171.812 L 179.781 136.142 L 171.131 136.142 L 171.131 131.342 L 179.891 127.332 L 183.911 114.272 L 189.881 114.272 L 189.881 128.332 L 207.581 128.332 L 207.581 136.142 L 189.881 136.142 L 189.881 171.532 C 189.881 175.065 190.727 177.782 192.421 179.682 C 194.114 181.575 196.467 182.522 199.481 182.522 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


nonConvertKey : List (VectorImage.Element Msg)
nonConvertKey =
    [ VectorImage.path "M227 117.4c-2 4.1-7 10.8-10.7 14.4l-2.8 2.7V132c0-2.6-.1-2.6-2.8-2.6h-2.8v-14.6h-6.2v14.6h-8.4v4.8h8.4V152l-5.5 2-5.5 2 .7 2.2.9 2.4 4.8-1.5 4.6-1.8-.2 11.3-.2 11.2-4 .2-4 .2.2 2.6.2 2.6 4.1.2c5 .3 7-.2 8.7-2 1.3-1.3 1.4-2.3 1.4-15.2v-14l1.9-.7c1-.4 2.9-1.3 4.1-2 2-1.3 2.2-1.6 1.5-3.5l-.7-2-3.4 1.7-3.4 1.7v-15.3h2.6c2 0 3.2.5 4.3 1.8l1.6 1.6 2-1.3 2-1.4v27.8h-2c-2 0-2.2.2-2.2 2v2.2H235l-1.3 1.8a42.2 42.2 0 0 1-19 11.7c-2.2.6-4 1.3-4 1.4 0 .1.3 1.1.8 2 .7 1.6 1.1 1.8 3 1.4a49.4 49.4 0 0 0 22.9-13l2.7-3 3 3.3c3.8 4.2 12 9.7 17.4 11.7l4 1.5 1.5-2 1.6-1.9-1.6-.6c-8-3.2-16.9-9-19.6-12.8l-1-1.5h20.8v-2.1c0-1.9-.2-2.1-2-2.1H262v-30.5h-7.6a41 41 0 0 1-7.6-.4c0-.1 1.4-2.3 3.2-4.8 1.8-2.6 3-5 2.7-5.6-.2-.8-2.2-1-10.5-1H232l1.4-2.5c1.5-2.6 1.5-2.8-2.1-3.4-2.6-.5-2.7-.4-4.3 2.9zm17.7 8c0 .4-1 2.1-2 3.6l-1.9 2.8-9.2.2-9.3.2 3.4-3.9 3.4-3.8h7.8c5.8 0 7.8.2 7.8.9zm-12.2 13.8c-.7 4.3-2 7.8-4 10.8-1.9 2.6-1.9 2.6-.5 4 1.3 1.3 1.4 1.3 2.7.1 2.3-2 5.5-8.9 6.3-13.2l.8-4.4c0-.1 1.2-.2 2.7-.2h2.8v6.2c0 7.8.6 8.4 8.1 8.4h5v11.8h-13.1v-7.6h-5.5v7.6h-11.9v-26.4h7l-.4 3zm24 2.3v5.3l-4-.2-4-.2-.2-5-.2-5h8.4v5.1zM45.4 119.7a68.5 68.5 0 0 1-8 10l-5 5.1 1.7 1.6c1.8 1.7 1.6 1.9 7-3.1l2.3-2.1v10.7h-9.1v4.8h9.1v14H35.7v4.8h69.5v-4.9h-8.4v-13.9h10.4V142H96.8v-13.2H104.5v-4.9H49.7l2.4-3.5c2.6-3.9 2.9-4.8 1.4-4.8a21 21 0 0 1-3-.4c-1.8-.3-2.1.1-5 4.6zm14 15.6v6.6h-9.8v-13.2h9.7v6.6zm15.9 0v6.6h-9.7v-13.2h9.7v6.6zm16 0v6.6H80.9v-13.2h10.4v6.6zm-32 18.4v7h-9.7v-14h9.7v7zm16 0v7h-9.7v-14h9.7v7zm16 0v7H80.9v-14h10.4v7zM146.1 119v3.4H115v4.9h24.5l-.4 3.1c-1 6.9-5.9 13.1-13.5 17.2l-4.2 2.3 1.6 2 1.6 2 4.3-2.4c5.4-2.9 11.7-9 13.6-13 .8-1.8 1.8-5 2.3-7.2l.8-4h11v8.5c0 5.7-.3 8.9-.8 9.4s-2.4.8-4.2.8H148l.2 2.3.2 2.3 4.5.2c5.2.2 7.9-.7 9-3 .4-1.1.8-5.7.8-11.1v-9.4h21.5v-4.9H153v-6.9h-7v3.5z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M123.1 134c-2 2-5.4 4.9-7.4 6.3l-3.7 2.5 1.8 1.8 1.7 1.7 3-2c4-2.8 13.1-11.4 12.7-12.1-.2-.3-1.3-1-2.4-1.3-1.8-.6-2.2-.4-5.7 3zM169.9 131.8l-2.4 1 1.7 2.3c2.1 3 10.2 11.2 12 12.2 1 .5 1.8.3 3.4-1l2-1.7-3.5-3c-4-3.3-10-9.6-10-10.3 0-.7-.6-.6-3.2.5zM136 153.7a64.5 64.5 0 0 1-15 11.3l-5.4 3 1.1 1.7c.7 1 1.2 1.8 1.4 1.9.2.3 9.1-4.3 11.6-6l2.1-1.4 3.1 2.9c1.8 1.6 4.7 3.9 6.5 5 1.9 1.2 3.3 2.3 3.3 2.5 0 .9-16.4 4.9-25.5 6.2l-5.6.8.7 2c.8 2.4.6 2.4 10 .9 8.6-1.2 18.7-3.7 23.3-5.8l3.3-1.3 6 2c6.4 2.1 16.4 4.4 22.5 5.2 3.8.5 4 .4 4.9-1.6l1.2-2.3c.1-.3-1.6-.7-3.8-1-5.3-.6-16.3-2.8-21-4.2l-3.6-1.1 3.7-2.5c4-2.6 11.3-9.4 12.5-11.5.4-.9.4-1.6-.2-2.3-.6-.7-3.7-1-16.4-1h-15.6l1.9-2.4c1.5-2 1.7-2.7 1-3.2a4 4 0 0 0-1.8-.6l-1.8-.3c-.5-.3-2.4 1.1-4.4 3.1zm25.5 11c-2 1.9-5.2 4.2-7 5.2l-3.5 1.9-4-2.2a46.6 46.6 0 0 1-7.6-5.2l-3.4-3h29.2l-3.7 3.3zM94.3 168.5c-2.3.7-3 2-1.6 2.9a59 59 0 0 1 4.5 7c3 5 4.3 6.5 5.1 6.2.6-.3 2-.7 3-.9 1.1-.2 2-.5 1.9-.8-.1-.9-9.4-15-10-15-.4-.1-1.8.1-3 .6zM75.6 168.9c-2.5.5-2.5.6.6 8.8l2.3 6.2 2.4-.2c4.3-.5 4.3-.7 1.2-8.4-1.5-3.8-3.2-7-3.6-7l-2.9.6zM41.2 171.9a83 83 0 0 1-4.4 7.3l-3 4.3 2.8 1c2.6 1.1 2.7 1.1 4-.4 1.9-2.3 7.6-12 7.6-13 0-.9-.5-1.2-3.2-1.7-2.1-.5-2.3-.4-3.8 2.5zM57.1 169.4c-1.1.2-2 .5-2 .8l2 7.6 1.7 7.3 2.1-.5 3-.4c1.4 0 1.3-1.5-.8-8.8-1.4-4.9-2.2-6.4-3-6.4l-3 .4z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


spaceKey : List (VectorImage.Element Msg)
spaceKey =
    []


convertKey : List (VectorImage.Element Msg)
convertKey =
    [ VectorImage.path "M193 109l-9 11c-5 5-6 6-6 4s0-2-3-2h-4v-17h-7v17h-5c-5 0-5 0-5 3 0 2 0 2 5 2h5v20l-6 2c-6 2-7 2-6 4 1 4 1 4 6 3l5-2 1 13v12l-5 1c-5 0-5 0-5 3 1 2 1 3 7 3 5 0 6 0 8-2s2-3 2-18v-16l5-1c4-2 5-3 3-6 0-2-1-2-4-1l-4 2v-17h3l5 2c2 2 2 2 4 0 2-1 2-1 2 15 0 15 0 16-2 16-1 0-2 1-2 3v2h11c10 0 10 0 9 2-2 3-13 10-20 12-6 2-7 2-6 4 1 3 2 3 9 1 8-3 14-6 20-12l5-4 3 3c4 5 13 11 20 13 5 2 5 2 7 0l1-2-7-3c-6-3-18-11-18-13l12-1h12v-3c0-2 0-2-2-2h-3v-35h-9l-9-1 4-6 3-6-13-1h-11l2-3c2-3 2-3-2-3-3-1-4-1-6 4zm21 8l-2 4-3 4h-21l4-4 4-5h9l9 1zm-14 14c0 3-3 11-5 14s-2 3-1 5c2 1 2 1 5-2 3-4 6-11 6-15 0-3 0-3 4-3h3v7c0 9 1 10 9 10h6v13h-15v-4c0-5 0-5-3-5s-3 0-3 5v4h-14v-30h4l4 1zm27 5v6h-9v-12h9v6zM100 109v4H64v5h28l-1 3c-2 9-7 17-16 21l-3 3c2 4 2 4 7 1 10-5 17-13 19-23l1-4 6-1h7v10l-1 11-5 1c-4 0-4 0-4 3v3h6c5 0 7 0 9-2 2-3 2-3 2-14v-12h25v-5h-37v-4c0-4 0-4-3-4-4 0-4 0-4 4z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    , VectorImage.path "M75 125l-8 7c-7 4-7 4-5 6s2 2 6 0c7-5 15-13 14-14-4-2-5-2-7 0zM127 123l-2 2 14 16c3 2 3 2 5 0l3-2-8-8-8-8h-4zM86 150l-13 11c-9 5-9 5-7 7l1 2 8-4 8-4 8 6 7 6-6 1-17 4-13 2 1 3c0 2 1 2 6 2 9-1 19-4 29-7l8-2 7 2c6 3 25 7 28 7l3-3 2-3-8-1-23-5-2-1 5-3 9-9c7-8 7-8-15-8H94l2-3 2-3-3-1-3-1-6 5zm32 11l-8 7-5 2-5-3-9-5-3-4h33l-3 3z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


kanaModeKey : List (VectorImage.Element Msg)
kanaModeKey =
    [ VectorImage.path "M50 96v6h-9c-8 0-9 0-9 2s1 2 9 2l9 1-1 6c-2 8-7 17-13 22-5 4-6 6-5 7 2 2 6-1 13-8 6-7 8-12 10-21l1-7h22v3l-3 24c-3 4-5 5-12 5-5-1-6-1-6 1l2 2c4 2 13 1 16 0 5-3 8-15 8-31v-8H55v-6c0-6 0-6-2-6-3 0-3 0-3 6zM109 97c-2 5-6 10-11 15s-7 7-6 8 3 0 6-2l15-16 13-1h14l-1 4c-1 6-4 13-6 14-1 1-3 0-11-3-9-3-11-4-13-3-2 2-1 3 3 4l17 8-5 4c-5 4-11 7-18 9-4 1-5 3-3 5 2 0 16-5 21-8 6-4 13-11 16-17 3-5 5-14 5-18v-3h-29l1-2c1-4 1-4-2-5-2 0-3 1-6 7zM174 96v6h-9c-8 0-9 0-9 2s1 2 9 2l9 1-1 6c-2 8-7 17-13 22-5 4-6 6-5 7 2 2 6-1 13-8 6-7 8-12 10-21l1-7h22v3l-3 24c-3 4-5 5-12 5-5-1-6-1-6 1l2 2c4 2 13 1 16 0 5-3 8-15 8-31v-8h-27v-6c0-6 0-6-2-6-3 0-3 0-3 6zM243 98v7h-14c-13 0-14 0-14 2s1 2 14 2h14v4c0 11-5 19-15 24-5 2-6 3-5 4 2 2 2 2 7 0 7-2 14-10 16-17l2-10v-5h12c10 0 11 0 11-2s-1-2-11-2h-12v-7c0-8 0-8-2-8-3 0-3 0-3 8zM205 150c-2 1 2 9 5 8l1-1-4-8-2 1zM196 151c-2 1 2 9 5 8 2 0 1-2-1-6-2-3-2-3-4-2zM106 155l-1 2 10 2 15 4c6 2 6 2 7 0s0-2-5-4l-25-6-1 2zM166 159v6h-6c-6 0-7 0-7 2s1 2 6 2c7 0 7 0 5 10-2 7-5 13-9 19-2 3-3 4-1 5 1 1 1 1 3-1 4-3 10-17 12-26l1-8h6c9 0 10 1 10 10 0 10-2 17-4 20-2 1-5 1-11-2l-1 2c-1 2 0 3 3 4 11 5 16 0 18-17 1-11 0-15-3-18-2-3-3-3-10-3h-7v-5c0-6 0-6-3-6-2 0-2 0-2 6zM227 159v4h-6c-4 0-5 0-5 2s1 2 5 2 5 0 5 2c0 3-6 18-8 22-3 4-3 4-1 6 1 1 2 1 3-1 3-4 9-17 10-23l1-6h7c6 0 7 0 7-2s-1-2-7-2h-6v-4c1-5 1-5-1-5-3 0-3 1-4 5zM44 158l-11 1c-4 1-5 2-5 3 0 2 2 2 10 1l8-2-4 5c-7 6-9 12-10 20 0 5 0 7 2 10 6 9 23 11 32 3 5-4 7-10 7-19v-8l2 3 6 6c3 4 3 4 5 2 1-2 1-2-4-7l-8-12c-3-6-4-6-6-5v8c2 8 1 20-2 25-3 7-14 10-22 6-11-6-9-20 4-33 5-5 6-6 5-8l-2-1-7 1zM253 157c-1 2 0 2 3 5l8 7c3 3 4 4 6 2 1-1 1-1-2-5l-13-10-2 1zM193 160c-1 1 0 3 2 7l6 11c2 6 3 7 5 6l2-1-6-14c-4-8-7-11-9-9zM100 168l-3 11v8c2 1 2 1 6-2 9-7 22-10 29-7 4 2 6 4 7 8 0 3 0 4-3 7-3 4-9 6-21 7-8 0-9 0-9 2s1 2 10 2c12-1 20-3 24-7 3-4 4-8 3-13-2-12-20-15-37-6-4 2-4 2-3-3l1-8c1-5 1-5-1-5-3 0-3 1-4 6zM253 179v8h-6c-7 0-12 2-14 5s-1 8 2 10c5 4 18 4 21-1l2-4v-3l6 3c4 3 5 4 6 3 2-2 0-4-7-8l-5-3v-9c0-9 0-9-2-9-3 0-3 0-3 8zm-2 13c3 0 3 5 0 7-3 3-10 2-13 0-6-4 3-10 13-7z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


contextMenuKey : List (VectorImage.Element Msg)
contextMenuKey =
    [ VectorImage.rect { width = 140, height = 200 } (VectorImage.strokeColorWidth P.white 10) VectorImage.fillNone |> VectorImage.translate { x = 80, y = 50 }
    , VectorImage.line ( 100, 95 ) ( 200, 95 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.line ( 100, 150 ) ( 200, 150 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.line ( 100, 205 ) ( 200, 205 ) (VectorImage.strokeColorWidth P.white 10)
    ]



{- == Arrow Key == -}


arrowUpKey : List (VectorImage.Element Msg)
arrowUpKey =
    [ VectorImage.line ( 150, 100 ) ( 150, 250 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.polygon [ ( 150, 50 ), ( 190, 150 ), ( 110, 150 ) ] VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


arrowDownKey : List (VectorImage.Element Msg)
arrowDownKey =
    [ VectorImage.line ( 150, 50 ) ( 150, 200 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.polygon [ ( 150, 250 ), ( 190, 150 ), ( 110, 150 ) ] VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


arrowLeftKey : List (VectorImage.Element Msg)
arrowLeftKey =
    [ VectorImage.line ( 100, 150 ) ( 250, 150 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.polygon [ ( 50, 150 ), ( 150, 190 ), ( 150, 110 ) ] VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


arrowRightKey : List (VectorImage.Element Msg)
arrowRightKey =
    [ VectorImage.line ( 50, 150 ) ( 200, 150 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.polygon [ ( 250, 150 ), ( 150, 190 ), ( 150, 110 ) ] VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


homeKey : List (VectorImage.Element Msg)
homeKey =
    [ VectorImage.path "M 108.244 108.64 L 108.244 190.24 L 97.974 190.24 L 97.974 152.18 L 56.124 152.18 L 56.124 190.24 L 45.854 190.24 L 45.854 108.64 L 56.124 108.64 L 56.124 143.14 L 97.974 143.14 L 97.974 108.64 L 108.244 108.64 Z M 182.413 159.49 C 182.413 169.497 179.883 177.31 174.823 182.93 C 169.763 188.55 162.77 191.36 153.843 191.36 C 148.296 191.36 143.386 190.067 139.113 187.48 C 134.833 184.893 131.54 181.18 129.233 176.34 C 126.926 171.507 125.773 165.89 125.773 159.49 C 125.773 149.517 128.266 141.75 133.253 136.19 C 138.233 130.623 145.226 127.84 154.233 127.84 C 162.866 127.84 169.723 130.677 174.803 136.35 C 179.876 142.03 182.413 149.743 182.413 159.49 Z M 136.153 159.49 C 136.153 167.19 137.67 173.04 140.703 177.04 C 143.73 181.04 148.203 183.04 154.123 183.04 C 159.963 183.04 164.41 181.04 167.463 177.04 C 170.51 173.04 172.033 167.19 172.033 159.49 C 172.033 151.79 170.5 145.993 167.433 142.1 C 164.36 138.213 159.866 136.27 153.953 136.27 C 142.086 136.27 136.153 144.01 136.153 159.49 Z M 286.221 190.24 L 276.291 190.24 L 276.291 150.78 C 276.291 141.107 272.141 136.27 263.841 136.27 C 258.148 136.27 253.964 137.927 251.291 141.24 C 248.611 144.553 247.271 149.613 247.271 156.42 L 247.271 190.24 L 237.281 190.24 L 237.281 150.78 C 237.281 145.947 236.268 142.32 234.241 139.9 C 232.208 137.48 229.034 136.27 224.721 136.27 C 219.068 136.27 214.928 138 212.301 141.46 C 209.681 144.92 208.371 150.593 208.371 158.48 L 208.371 190.24 L 198.321 190.24 L 198.321 128.96 L 206.411 128.96 L 207.921 137.33 L 208.481 137.33 C 210.228 134.357 212.691 132.033 215.871 130.36 C 219.058 128.68 222.621 127.84 226.561 127.84 C 236.161 127.84 242.411 131.263 245.311 138.11 L 245.871 138.11 C 247.844 134.837 250.534 132.307 253.941 130.52 C 257.341 128.733 261.201 127.84 265.521 127.84 C 272.441 127.84 277.621 129.627 281.061 133.2 C 284.501 136.773 286.221 142.487 286.221 150.34 L 286.221 190.24 Z M 331.256 191.36 C 322.07 191.36 314.863 188.577 309.636 183.01 C 304.41 177.45 301.796 169.797 301.796 160.05 C 301.796 150.223 304.233 142.4 309.106 136.58 C 313.98 130.753 320.563 127.84 328.856 127.84 C 336.563 127.84 342.703 130.323 347.276 135.29 C 351.856 140.263 354.146 146.99 354.146 155.47 L 354.146 161.55 L 312.176 161.55 C 312.363 168.51 314.13 173.793 317.476 177.4 C 320.823 181.013 325.566 182.82 331.706 182.82 C 334.98 182.82 338.086 182.53 341.026 181.95 C 343.966 181.377 347.41 180.253 351.356 178.58 L 351.356 187.39 C 347.97 188.843 344.786 189.867 341.806 190.46 C 338.833 191.06 335.316 191.36 331.256 191.36 Z M 328.746 136.05 C 323.946 136.05 320.153 137.593 317.366 140.68 C 314.573 143.767 312.916 148.063 312.396 153.57 L 343.596 153.57 C 343.523 147.843 342.203 143.49 339.636 140.51 C 337.07 137.537 333.44 136.05 328.746 136.05 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


endKey : List (VectorImage.Element Msg)
endKey =
    [ VectorImage.path "M 153.759 183.82 L 153.759 192.86 L 108.169 192.86 L 108.169 111.26 L 153.759 111.26 L 153.759 120.31 L 118.439 120.31 L 118.439 145.76 L 151.699 145.76 L 151.699 154.69 L 118.439 154.69 L 118.439 183.82 L 153.759 183.82 Z M 222.016 192.86 L 212.086 192.86 L 212.086 153.68 C 212.086 148.693 210.979 144.983 208.766 142.55 C 206.553 140.11 203.083 138.89 198.356 138.89 C 192.069 138.89 187.503 140.63 184.656 144.11 C 181.809 147.59 180.386 153.253 180.386 161.1 L 180.386 192.86 L 170.336 192.86 L 170.336 131.58 L 178.426 131.58 L 179.936 139.95 L 180.496 139.95 C 182.389 136.937 185.049 134.603 188.476 132.95 C 191.896 131.29 195.673 130.46 199.806 130.46 C 207.319 130.46 212.899 132.283 216.546 135.93 C 220.193 139.577 222.016 145.253 222.016 152.96 L 222.016 192.86 Z M 262.701 193.98 C 254.741 193.98 248.564 191.227 244.171 185.72 C 239.784 180.213 237.591 172.417 237.591 162.33 C 237.591 152.323 239.794 144.51 244.201 138.89 C 248.608 133.27 254.811 130.46 262.811 130.46 C 271.038 130.46 277.364 133.477 281.791 139.51 L 282.511 139.51 C 282.404 138.763 282.258 137.263 282.071 135.01 C 281.884 132.763 281.791 131.247 281.791 130.46 L 281.791 106.02 L 291.831 106.02 L 291.831 192.86 L 283.741 192.86 L 282.241 184.66 L 281.791 184.66 C 277.511 190.873 271.148 193.98 262.701 193.98 Z M 264.321 185.66 C 270.421 185.66 274.878 183.997 277.691 180.67 C 280.498 177.337 281.901 171.877 281.901 164.29 L 281.901 162.44 C 281.901 153.92 280.478 147.847 277.631 144.22 C 274.784 140.593 270.311 138.78 264.211 138.78 C 259.038 138.78 255.038 140.837 252.211 144.95 C 249.384 149.057 247.971 154.923 247.971 162.55 C 247.971 170.143 249.374 175.893 252.181 179.8 C 254.988 183.707 259.034 185.66 264.321 185.66 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


pageUpKey : List (VectorImage.Element Msg)
pageUpKey =
    [ page
    , VectorImage.path "M 184.036 191.224 L 194.256 191.224 L 194.256 244.024 C 194.256 253.324 191.446 260.637 185.826 265.964 C 180.206 271.284 172.413 273.944 162.446 273.944 C 152.586 273.944 144.94 271.254 139.506 265.874 C 134.073 260.501 131.356 253.144 131.356 243.804 L 131.356 191.224 L 141.676 191.224 L 141.676 244.134 C 141.676 250.794 143.453 255.947 147.006 259.594 C 150.56 263.241 155.91 265.064 163.056 265.064 C 169.79 265.064 174.97 263.261 178.596 259.654 C 182.223 256.047 184.036 250.837 184.036 244.024 L 184.036 191.224 Z M 243.363 273.944 C 235.143 273.944 228.82 270.984 224.393 265.064 L 223.723 265.064 L 223.943 267.354 C 224.243 270.254 224.393 272.841 224.393 275.114 L 224.393 300.284 L 214.343 300.284 L 214.343 211.544 L 222.603 211.544 L 223.943 219.914 L 224.393 219.914 C 226.773 216.567 229.527 214.151 232.653 212.664 C 235.773 211.171 239.38 210.424 243.473 210.424 C 251.44 210.424 257.627 213.187 262.033 218.714 C 266.44 224.241 268.643 232.027 268.643 242.074 C 268.643 252.081 266.43 259.894 262.003 265.514 C 257.577 271.134 251.363 273.944 243.363 273.944 Z M 241.693 218.854 C 235.627 218.854 231.243 220.567 228.543 223.994 C 225.85 227.414 224.467 232.791 224.393 240.124 L 224.393 242.074 C 224.393 250.367 225.77 256.367 228.523 260.074 C 231.277 263.774 235.74 265.624 241.913 265.624 C 247.047 265.624 251.057 263.541 253.943 259.374 C 256.823 255.207 258.263 249.404 258.263 241.964 C 258.263 234.484 256.823 228.764 253.943 224.804 C 251.057 220.837 246.973 218.854 241.693 218.854 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


pageDownKey : List (VectorImage.Element Msg)
pageDownKey =
    [ page
    , VectorImage.path "M 122.734 231.244 C 122.734 244.711 119.061 255.007 111.714 262.134 C 104.367 269.261 93.827 272.824 80.094 272.824 L 57.384 272.824 L 57.384 191.224 L 82.494 191.224 C 95.181 191.224 105.061 194.714 112.134 201.694 C 119.201 208.667 122.734 218.517 122.734 231.244 Z M 111.904 231.584 C 111.904 221.197 109.347 213.337 104.234 208.004 C 99.121 202.664 91.391 199.994 81.044 199.994 L 67.654 199.994 L 67.654 264.004 L 78.754 264.004 C 100.854 264.004 111.904 253.197 111.904 231.584 Z M 192.659 242.074 C 192.659 252.081 190.129 259.894 185.069 265.514 C 180.009 271.134 173.016 273.944 164.089 273.944 C 158.543 273.944 153.633 272.651 149.359 270.064 C 145.079 267.477 141.786 263.764 139.479 258.924 C 137.173 254.091 136.019 248.474 136.019 242.074 C 136.019 232.101 138.513 224.334 143.499 218.774 C 148.479 213.207 155.473 210.424 164.479 210.424 C 173.113 210.424 179.969 213.261 185.049 218.934 C 190.123 224.614 192.659 232.327 192.659 242.074 Z M 146.399 242.074 C 146.399 249.774 147.916 255.624 150.949 259.624 C 153.976 263.624 158.449 265.624 164.369 265.624 C 170.209 265.624 174.656 263.624 177.709 259.624 C 180.756 255.624 182.279 249.774 182.279 242.074 C 182.279 234.374 180.746 228.577 177.679 224.684 C 174.606 220.797 170.113 218.854 164.199 218.854 C 152.333 218.854 146.399 226.594 146.399 242.074 Z M 269.291 272.824 L 257.511 272.824 L 247.021 238.334 C 246.055 235.467 244.641 230.054 242.781 222.094 L 242.331 222.094 C 240.771 229.347 239.395 234.797 238.201 238.444 L 227.211 272.824 L 215.821 272.824 L 199.021 211.544 L 209.401 211.544 C 213.275 226.611 216.225 238.071 218.251 245.924 C 220.278 253.777 221.478 259.321 221.851 262.554 L 222.301 262.554 L 223.081 259.094 C 224.235 253.774 225.351 249.441 226.431 246.094 L 237.311 211.544 L 248.251 211.544 L 258.801 246.094 C 259.168 247.394 259.568 248.777 260.001 250.244 C 260.428 251.717 260.828 253.171 261.201 254.604 C 261.568 256.037 261.901 257.431 262.201 258.784 C 262.501 260.144 262.725 261.364 262.871 262.444 L 263.371 262.444 C 263.711 259.617 265.071 253.554 267.451 244.254 L 276.041 211.544 L 286.311 211.544 L 269.291 272.824 Z M 348.985 272.824 L 339.055 272.824 L 339.055 233.644 C 339.055 228.657 337.948 224.947 335.735 222.514 C 333.521 220.074 330.051 218.854 325.325 218.854 C 319.038 218.854 314.471 220.594 311.625 224.074 C 308.778 227.554 307.355 233.217 307.355 241.064 L 307.355 272.824 L 297.305 272.824 L 297.305 211.544 L 305.395 211.544 L 306.905 219.914 L 307.465 219.914 C 309.358 216.901 312.018 214.567 315.445 212.914 C 318.865 211.254 322.641 210.424 326.775 210.424 C 334.288 210.424 339.868 212.247 343.515 215.894 C 347.161 219.541 348.985 225.217 348.985 232.924 L 348.985 272.824 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)
    ]


page : VectorImage.Element Msg
page =
    VectorImage.path "M 126.658 100.924 C 126.658 109.264 123.815 115.654 118.128 120.094 C 112.435 124.541 104.415 126.764 94.068 126.764 L 84.698 126.764 L 84.698 158.524 L 74.428 158.524 L 74.428 76.924 L 96.018 76.924 C 116.445 76.924 126.658 84.924 126.658 100.924 Z M 84.698 85.694 L 84.698 117.954 L 92.898 117.954 C 101.011 117.954 106.891 116.641 110.538 114.014 C 114.185 111.394 116.008 107.181 116.008 101.374 C 116.008 96.127 114.315 92.201 110.928 89.594 C 107.541 86.994 102.258 85.694 95.078 85.694 L 84.698 85.694 Z M 187.326 158.524 L 180.016 158.524 L 178.066 149.814 L 177.616 149.814 C 174.563 153.647 171.523 156.244 168.496 157.604 C 165.463 158.964 161.639 159.644 157.026 159.644 C 150.999 159.644 146.273 158.061 142.846 154.894 C 139.426 151.734 137.716 147.271 137.716 141.504 C 137.716 129.077 147.519 122.564 167.126 121.964 L 177.506 121.574 L 177.506 117.954 C 177.506 113.301 176.503 109.867 174.496 107.654 C 172.483 105.441 169.263 104.334 164.836 104.334 C 161.596 104.334 158.536 104.817 155.656 105.784 C 152.769 106.751 150.063 107.831 147.536 109.024 L 144.466 101.484 C 147.553 99.851 150.919 98.567 154.566 97.634 C 158.213 96.707 161.823 96.244 165.396 96.244 C 172.796 96.244 178.303 97.881 181.916 101.154 C 185.523 104.427 187.326 109.634 187.326 116.774 L 187.326 158.524 Z M 159.306 151.544 C 164.926 151.544 169.346 150.031 172.566 147.004 C 175.786 143.971 177.396 139.661 177.396 134.074 L 177.396 128.554 L 168.356 128.944 C 161.323 129.204 156.196 130.321 152.976 132.294 C 149.756 134.267 148.146 137.374 148.146 141.614 C 148.146 144.814 149.123 147.271 151.076 148.984 C 153.029 150.691 155.773 151.544 159.306 151.544 Z M 229.631 151.434 C 235.805 151.434 240.298 149.771 243.111 146.444 C 245.918 143.111 247.321 137.761 247.321 130.394 L 247.321 127.994 C 247.321 119.807 245.908 113.854 243.081 110.134 C 240.255 106.414 235.698 104.554 229.411 104.554 C 224.271 104.554 220.298 106.591 217.491 110.664 C 214.685 114.737 213.281 120.551 213.281 128.104 C 213.281 135.697 214.648 141.484 217.381 145.464 C 220.115 149.444 224.198 151.434 229.631 151.434 Z M 247.211 160.364 L 247.211 157.964 L 247.551 150.434 L 247.101 150.434 C 242.968 156.574 236.641 159.644 228.121 159.644 C 220.201 159.644 214.018 156.881 209.571 151.354 C 205.125 145.827 202.901 138.041 202.901 127.994 C 202.901 118.134 205.141 110.357 209.621 104.664 C 214.108 98.971 220.238 96.124 228.011 96.124 C 236.311 96.124 242.711 99.214 247.211 105.394 L 247.821 105.394 L 249.161 97.244 L 257.141 97.244 L 257.141 159.524 C 257.141 168.311 254.921 174.917 250.481 179.344 C 246.035 183.771 239.121 185.984 229.741 185.984 C 220.815 185.984 213.468 184.681 207.701 182.074 L 207.701 172.814 C 213.655 176.014 221.188 177.614 230.301 177.614 C 235.508 177.614 239.628 176.087 242.661 173.034 C 245.695 169.981 247.211 165.757 247.211 160.364 Z M 302.681 159.644 C 293.495 159.644 286.288 156.861 281.061 151.294 C 275.835 145.734 273.221 138.081 273.221 128.334 C 273.221 118.507 275.658 110.684 280.531 104.864 C 285.405 99.037 291.988 96.124 300.281 96.124 C 307.988 96.124 314.128 98.607 318.701 103.574 C 323.281 108.547 325.571 115.274 325.571 123.754 L 325.571 129.834 L 283.601 129.834 C 283.788 136.794 285.555 142.077 288.901 145.684 C 292.248 149.297 296.991 151.104 303.131 151.104 C 306.405 151.104 309.511 150.814 312.451 150.234 C 315.391 149.661 318.835 148.537 322.781 146.864 L 322.781 155.674 C 319.395 157.127 316.211 158.151 313.231 158.744 C 310.258 159.344 306.741 159.644 302.681 159.644 Z M 300.171 104.334 C 295.371 104.334 291.578 105.877 288.791 108.964 C 285.998 112.051 284.341 116.347 283.821 121.854 L 315.021 121.854 C 314.948 116.127 313.628 111.774 311.061 108.794 C 308.495 105.821 304.865 104.334 300.171 104.334 Z" VectorImage.strokeNone (VectorImage.fillColor P.white)



{- == Numpad == -}


numpadClearKey : List (VectorImage.Element Msg)
numpadClearKey =
    [ VectorImage.path "M 204.668 69.13 C 195.888 69.13 188.988 72.07 183.968 77.95 C 178.941 83.83 176.428 91.867 176.428 102.06 C 176.428 112.593 178.865 120.713 183.738 126.42 C 188.618 132.133 195.558 134.99 204.558 134.99 C 210.365 134.99 216.895 133.91 224.148 131.75 L 224.148 140.68 C 220.688 141.947 217.358 142.813 214.158 143.28 C 210.958 143.747 207.275 143.98 203.108 143.98 C 191.088 143.98 181.835 140.323 175.348 133.01 C 168.855 125.697 165.608 115.343 165.608 101.95 C 165.608 93.543 167.161 86.177 170.268 79.85 C 173.375 73.523 177.895 68.65 183.828 65.23 C 189.761 61.803 196.748 60.09 204.788 60.09 C 213.415 60.09 220.928 61.69 227.328 64.89 L 223.198 73.6 C 216.691 70.62 210.515 69.13 204.668 69.13 Z M 250.607 56.02 L 250.607 142.86 L 240.557 142.86 L 240.557 56.02 L 250.607 56.02 Z M 296.085 143.98 C 286.898 143.98 279.691 141.197 274.465 135.63 C 269.238 130.07 266.625 122.417 266.625 112.67 C 266.625 102.843 269.061 95.02 273.935 89.2 C 278.808 83.373 285.391 80.46 293.685 80.46 C 301.391 80.46 307.531 82.943 312.105 87.91 C 316.685 92.883 318.975 99.61 318.975 108.09 L 318.975 114.17 L 277.005 114.17 C 277.191 121.13 278.958 126.413 282.305 130.02 C 285.651 133.633 290.395 135.44 296.535 135.44 C 299.808 135.44 302.915 135.15 305.855 134.57 C 308.795 133.997 312.238 132.873 316.185 131.2 L 316.185 140.01 C 312.798 141.463 309.615 142.487 306.635 143.08 C 303.661 143.68 300.145 143.98 296.085 143.98 Z M 293.575 88.67 C 288.775 88.67 284.981 90.213 282.195 93.3 C 279.401 96.387 277.745 100.683 277.225 106.19 L 308.425 106.19 C 308.351 100.463 307.031 96.11 304.465 93.13 C 301.898 90.157 298.268 88.67 293.575 88.67 Z M 379.636 142.86 L 372.326 142.86 L 370.376 134.15 L 369.926 134.15 C 366.872 137.983 363.832 140.58 360.806 141.94 C 357.772 143.3 353.949 143.98 349.336 143.98 C 343.309 143.98 338.582 142.397 335.156 139.23 C 331.736 136.07 330.026 131.607 330.026 125.84 C 330.026 113.413 339.829 106.9 359.436 106.3 L 369.816 105.91 L 369.816 102.29 C 369.816 97.637 368.812 94.203 366.806 91.99 C 364.792 89.777 361.572 88.67 357.146 88.67 C 353.906 88.67 350.846 89.153 347.966 90.12 C 345.079 91.087 342.372 92.167 339.846 93.36 L 336.776 85.82 C 339.862 84.187 343.229 82.903 346.876 81.97 C 350.522 81.043 354.132 80.58 357.706 80.58 C 365.106 80.58 370.612 82.217 374.226 85.49 C 377.832 88.763 379.636 93.97 379.636 101.11 L 379.636 142.86 Z M 351.616 135.88 C 357.236 135.88 361.656 134.367 364.876 131.34 C 368.096 128.307 369.706 123.997 369.706 118.41 L 369.706 112.89 L 360.666 113.28 C 353.632 113.54 348.506 114.657 345.286 116.63 C 342.066 118.603 340.456 121.71 340.456 125.95 C 340.456 129.15 341.432 131.607 343.386 133.32 C 345.339 135.027 348.082 135.88 351.616 135.88 Z M 427.192 80.46 C 429.905 80.46 432.305 80.683 434.392 81.13 L 433.162 90.4 C 430.888 89.88 428.675 89.62 426.522 89.62 C 423.282 89.62 420.275 90.513 417.502 92.3 C 414.735 94.08 412.568 96.543 411.002 99.69 C 409.442 102.837 408.662 106.327 408.662 110.16 L 408.662 142.86 L 398.612 142.86 L 398.612 81.58 L 406.872 81.58 L 407.992 92.8 L 408.432 92.8 C 410.778 88.74 413.552 85.67 416.752 83.59 C 419.952 81.503 423.432 80.46 427.192 80.46 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


numpadBackspaceKey : List (VectorImage.Element Msg)
numpadBackspaceKey =
    [ VectorImage.path "M 27.031 129.69 L 27.031 48.09 L 50.301 48.09 C 61.241 48.09 69.138 49.72 73.991 52.98 C 78.844 56.233 81.271 61.34 81.271 68.3 C 81.271 73.133 79.951 77.123 77.311 80.27 C 74.671 83.417 70.821 85.453 65.761 86.38 L 65.761 86.94 C 72.048 88.02 76.671 90.197 79.631 93.47 C 82.584 96.743 84.061 101.077 84.061 106.47 C 84.061 113.763 81.571 119.457 76.591 123.55 C 71.604 127.643 64.644 129.69 55.711 129.69 L 27.031 129.69 Z M 37.301 56.86 L 37.301 82.81 L 52.361 82.81 C 58.761 82.81 63.414 81.787 66.321 79.74 C 69.221 77.693 70.671 74.27 70.671 69.47 C 70.671 65.003 69.081 61.787 65.901 59.82 C 62.721 57.847 57.688 56.86 50.801 56.86 L 37.301 56.86 Z M 52.981 91.4 L 37.301 91.4 L 37.301 120.98 L 53.761 120.98 C 60.308 120.98 65.164 119.717 68.331 117.19 C 71.491 114.657 73.071 110.823 73.071 105.69 C 73.071 100.817 71.398 97.217 68.051 94.89 C 64.698 92.563 59.674 91.4 52.981 91.4 Z M 145.065 129.69 L 137.755 129.69 L 135.805 120.98 L 135.355 120.98 C 132.301 124.813 129.261 127.41 126.235 128.77 C 123.201 130.13 119.378 130.81 114.765 130.81 C 108.738 130.81 104.011 129.227 100.585 126.06 C 97.165 122.9 95.455 118.437 95.455 112.67 C 95.455 100.243 105.258 93.73 124.865 93.13 L 135.245 92.74 L 135.245 89.12 C 135.245 84.467 134.241 81.033 132.235 78.82 C 130.221 76.607 127.001 75.5 122.575 75.5 C 119.335 75.5 116.275 75.983 113.395 76.95 C 110.508 77.917 107.801 78.997 105.275 80.19 L 102.205 72.65 C 105.291 71.017 108.658 69.733 112.305 68.8 C 115.951 67.873 119.561 67.41 123.135 67.41 C 130.535 67.41 136.041 69.047 139.655 72.32 C 143.261 75.593 145.065 80.8 145.065 87.94 L 145.065 129.69 Z M 117.045 122.71 C 122.665 122.71 127.085 121.197 130.305 118.17 C 133.525 115.137 135.135 110.827 135.135 105.24 L 135.135 99.72 L 126.095 100.11 C 119.061 100.37 113.935 101.487 110.715 103.46 C 107.495 105.433 105.885 108.54 105.885 112.78 C 105.885 115.98 106.861 118.437 108.815 120.15 C 110.768 121.857 113.511 122.71 117.045 122.71 Z M 188.601 130.81 C 179.781 130.81 172.914 128.103 168.001 122.69 C 163.094 117.277 160.641 109.507 160.641 99.38 C 160.641 89.113 163.124 81.2 168.091 75.64 C 173.057 70.073 180.134 67.29 189.321 67.29 C 192.301 67.29 195.251 67.597 198.171 68.21 C 201.091 68.83 203.501 69.623 205.401 70.59 L 202.331 78.96 C 197.157 77.027 192.747 76.06 189.101 76.06 C 182.927 76.06 178.371 78.003 175.431 81.89 C 172.491 85.777 171.021 91.57 171.021 99.27 C 171.021 106.677 172.491 112.343 175.431 116.27 C 178.371 120.197 182.724 122.16 188.491 122.16 C 193.884 122.16 199.184 120.967 204.391 118.58 L 204.391 127.51 C 200.151 129.71 194.887 130.81 188.601 130.81 Z M 228.392 98.16 L 228.842 98.16 L 232.242 93.8 L 236.152 89.12 L 255.742 68.41 L 267.462 68.41 L 242.682 94.59 L 269.192 129.69 L 257.082 129.69 L 235.812 101.12 L 228.842 107.2 L 228.842 129.69 L 218.902 129.69 L 218.902 42.85 L 228.842 42.85 L 228.842 88.22 L 228.392 98.16 Z M 319.869 112.78 C 319.869 118.507 317.729 122.943 313.449 126.09 C 309.169 129.237 303.159 130.81 295.419 130.81 C 287.346 130.81 280.929 129.527 276.169 126.96 L 276.169 117.8 C 282.902 121.073 289.392 122.71 295.639 122.71 C 300.699 122.71 304.382 121.893 306.689 120.26 C 308.996 118.62 310.149 116.423 310.149 113.67 C 310.149 111.25 309.042 109.203 306.829 107.53 C 304.616 105.857 300.682 103.94 295.029 101.78 C 289.262 99.553 285.206 97.647 282.859 96.06 C 280.519 94.48 278.799 92.703 277.699 90.73 C 276.599 88.763 276.049 86.363 276.049 83.53 C 276.049 78.51 278.096 74.55 282.189 71.65 C 286.282 68.743 291.902 67.29 299.049 67.29 C 306.002 67.29 312.512 68.667 318.579 71.42 L 315.179 79.4 C 308.966 76.8 303.366 75.5 298.379 75.5 C 294.212 75.5 291.049 76.16 288.889 77.48 C 286.729 78.8 285.649 80.613 285.649 82.92 C 285.649 85.153 286.579 87.003 288.439 88.47 C 290.299 89.943 294.636 91.983 301.449 94.59 C 306.542 96.483 310.309 98.25 312.749 99.89 C 315.189 101.523 316.986 103.363 318.139 105.41 C 319.292 107.457 319.869 109.913 319.869 112.78 Z M 363.729 130.81 C 355.509 130.81 349.186 127.85 344.759 121.93 L 344.089 121.93 L 344.309 124.22 C 344.609 127.12 344.759 129.707 344.759 131.98 L 344.759 157.15 L 334.709 157.15 L 334.709 68.41 L 342.969 68.41 L 344.309 76.78 L 344.759 76.78 C 347.139 73.433 349.892 71.017 353.019 69.53 C 356.139 68.037 359.746 67.29 363.839 67.29 C 371.806 67.29 377.992 70.053 382.399 75.58 C 386.806 81.107 389.009 88.893 389.009 98.94 C 389.009 108.947 386.796 116.76 382.369 122.38 C 377.942 128 371.729 130.81 363.729 130.81 Z M 362.059 75.72 C 355.992 75.72 351.609 77.433 348.909 80.86 C 346.216 84.28 344.832 89.657 344.759 96.99 L 344.759 98.94 C 344.759 107.233 346.136 113.233 348.889 116.94 C 351.642 120.64 356.106 122.49 362.279 122.49 C 367.412 122.49 371.422 120.407 374.309 116.24 C 377.189 112.073 378.629 106.27 378.629 98.83 C 378.629 91.35 377.189 85.63 374.309 81.67 C 371.422 77.703 367.339 75.72 362.059 75.72 Z M 450.18 129.69 L 442.87 129.69 L 440.92 120.98 L 440.47 120.98 C 437.417 124.813 434.377 127.41 431.35 128.77 C 428.317 130.13 424.493 130.81 419.88 130.81 C 413.853 130.81 409.127 129.227 405.7 126.06 C 402.28 122.9 400.57 118.437 400.57 112.67 C 400.57 100.243 410.373 93.73 429.98 93.13 L 440.36 92.74 L 440.36 89.12 C 440.36 84.467 439.357 81.033 437.35 78.82 C 435.337 76.607 432.117 75.5 427.69 75.5 C 424.45 75.5 421.39 75.983 418.51 76.95 C 415.623 77.917 412.917 78.997 410.39 80.19 L 407.32 72.65 C 410.407 71.017 413.773 69.733 417.42 68.8 C 421.067 67.873 424.677 67.41 428.25 67.41 C 435.65 67.41 441.157 69.047 444.77 72.32 C 448.377 75.593 450.18 80.8 450.18 87.94 L 450.18 129.69 Z M 422.16 122.71 C 427.78 122.71 432.2 121.197 435.42 118.17 C 438.64 115.137 440.25 110.827 440.25 105.24 L 440.25 99.72 L 431.21 100.11 C 424.177 100.37 419.05 101.487 415.83 103.46 C 412.61 105.433 411 108.54 411 112.78 C 411 115.98 411.977 118.437 413.93 120.15 C 415.883 121.857 418.627 122.71 422.16 122.71 Z M 493.716 130.81 C 484.896 130.81 478.03 128.103 473.116 122.69 C 468.21 117.277 465.756 109.507 465.756 99.38 C 465.756 89.113 468.24 81.2 473.206 75.64 C 478.173 70.073 485.25 67.29 494.436 67.29 C 497.416 67.29 500.366 67.597 503.286 68.21 C 506.206 68.83 508.616 69.623 510.516 70.59 L 507.446 78.96 C 502.273 77.027 497.863 76.06 494.216 76.06 C 488.043 76.06 483.486 78.003 480.546 81.89 C 477.606 85.777 476.136 91.57 476.136 99.27 C 476.136 106.677 477.606 112.343 480.546 116.27 C 483.486 120.197 487.84 122.16 493.606 122.16 C 499 122.16 504.3 120.967 509.506 118.58 L 509.506 127.51 C 505.266 129.71 500.003 130.81 493.716 130.81 Z M 550.078 130.81 C 540.891 130.81 533.685 128.027 528.458 122.46 C 523.231 116.9 520.618 109.247 520.618 99.5 C 520.618 89.673 523.055 81.85 527.928 76.03 C 532.801 70.203 539.385 67.29 547.678 67.29 C 555.385 67.29 561.525 69.773 566.098 74.74 C 570.678 79.713 572.968 86.44 572.968 94.92 L 572.968 101 L 530.998 101 C 531.185 107.96 532.951 113.243 536.298 116.85 C 539.645 120.463 544.388 122.27 550.528 122.27 C 553.801 122.27 556.908 121.98 559.848 121.4 C 562.788 120.827 566.231 119.703 570.178 118.03 L 570.178 126.84 C 566.791 128.293 563.608 129.317 560.628 129.91 C 557.655 130.51 554.138 130.81 550.078 130.81 Z M 547.568 75.5 C 542.768 75.5 538.975 77.043 536.188 80.13 C 533.395 83.217 531.738 87.513 531.218 93.02 L 562.418 93.02 C 562.345 87.293 561.025 82.94 558.458 79.96 C 555.891 76.987 552.261 75.5 547.568 75.5 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


numpadEqualKey : List (VectorImage.Element Msg)
numpadEqualKey =
    [ VectorImage.path "M 193.225 153.415 L 106.775 153.415 L 106.775 139.475 L 193.225 139.475 L 193.225 153.415 Z M 193.225 191.775 L 106.775 191.775 L 106.775 177.735 L 193.225 177.735 L 193.225 191.775 Z M 139.615 108.225 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


numpadDivideKey : List (VectorImage.Element Msg)
numpadDivideKey =
    slashKey


numpadMultiplyKey : List (VectorImage.Element Msg)
numpadMultiplyKey =
    [ VectorImage.path "M 140.27 121.28 L 159.45 121.28 L 155.43 158.05 L 192.57 147.66 L 195 165.72 L 159.64 168.34 L 182.56 198.84 L 165.91 207.82 L 149.44 174.32 L 134.66 207.82 L 117.45 198.84 L 140.09 168.34 L 105 165.72 L 107.72 147.66 L 144.3 158.05 L 140.27 121.28 Z M 133.35 144.76 Z M 132.88 92.18 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


numpadSubtractKey : List (VectorImage.Element Msg)
numpadSubtractKey =
    minusKey


numpad7Key : List (VectorImage.Element Msg)
numpad7Key =
    digit7Key


numpad8Key : List (VectorImage.Element Msg)
numpad8Key =
    digit8Key


numpad9Key : List (VectorImage.Element Msg)
numpad9Key =
    digit9Key


numpadAdd : List (VectorImage.Element Msg)
numpadAdd =
    [ VectorImage.path "M 142.985 350.285 L 142.985 314.175 L 106.775 314.175 L 106.775 300.145 L 142.985 300.145 L 142.985 263.845 L 157.015 263.845 L 157.015 300.145 L 193.225 300.145 L 193.225 314.175 L 157.015 314.175 L 157.015 350.285 L 142.985 350.285 Z M 139.615 249.715 Z" VectorImage.strokeNone (VectorImage.fillColor P.white) ]


numpad4Key : List (VectorImage.Element Msg)
numpad4Key =
    digit4Key


numpad5Key : List (VectorImage.Element Msg)
numpad5Key =
    digit5Key


numpad6Key : List (VectorImage.Element Msg)
numpad6Key =
    digit6Key


numpad1Key : List (VectorImage.Element Msg)
numpad1Key =
    digit1Key


numpad2Key : List (VectorImage.Element Msg)
numpad2Key =
    digit2Key


numpad3Key : List (VectorImage.Element Msg)
numpad3Key =
    digit3Key


numpadEnterKey : List (VectorImage.Element Msg)
numpadEnterKey =
    [ VectorImage.line ( 220, 100 ) ( 220, 500 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.line ( 220, 500 ) ( 80, 500 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.line ( 80, 500 ) ( 100, 480 ) (VectorImage.strokeColorWidth P.white 10)
    , VectorImage.line ( 80, 500 ) ( 100, 520 ) (VectorImage.strokeColorWidth P.white 10)
    ]


numpad0Key : List (VectorImage.Element Msg)
numpad0Key =
    digit0Key
        |> List.map (VectorImage.translate { x = 150, y = 0 })


numpadDecimal : List (VectorImage.Element Msg)
numpadDecimal =
    periodKey


messageCard : String -> Html.Styled.Html msg
messageCard text =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.width (Css.px 100)
            , Css.border3 (Css.px 1) Css.solid (Css.rgb 255 255 255)
            ]
        ]
        [ Html.Styled.text text ]
