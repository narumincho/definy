module Data.Key exposing
    ( Key
    , OneKey(..)
    , fromKeyEventObject
    )

{-| キー入力は思ったより複雑。
OSかブラウザによって使用され使えない組み合わせのショートカットキーや
マイナーなキーのショートカットキー。
できれば、全体的に普及したキーだけで済ましたい。
JavaScriptのKeyEventBoardEvent.keyとKeyEventBoardEvent.codeがあるけど、
キーに印字されているほうのKeyEventBoardEvent.keyを使ったほうがわかりやすそう?
いやショートカットキーが)というよりもShift+9のほうがわかりやすいからcodeのほうかな?
もし)が一発で入力できるキーボードがあったらどうなる/どうする?

<https://www.w3.org/TR/uievents-code/#code-value-tables>

MacOSによって予約
Ctrl+Space Spotlight検索を表示する/前の入力ソースを選択する

Ubuntuによって予約
Ctrl+Alt+S シェードウィンドウ
Ctrl+Alt+L ロック画面
Ctrl+Alt+T ターミナルの起動
Ctrl+Alt+Left/Ctrl+Alt+Right ワークスペース間の切り替え
Alt+F7 ウィンドウを移動する
Alt+F8 サイズ変更ウィンドウ

Windowsによって予約
Ctrl+Esc スタートメニューを開く
Ctrl+Shift+Esc タスクマネージャーを開く
Ctrl+Alt+Tab 方向キーを使って、開いているすべてのアプリ間で切り替える
Alt+Space 作業中のウィンドウのショートカットメニューを開く
Alt+Esc 項目を開かれた順序で順番に切り替える
Alt+F4 ウィンドウを閉じる
Alt+Tab 開いているアプリ間で切り替える

Chromeによって予約
Ctrl+N 新しいウィンドウを開く
Ctrl+T 新しいタブを開いてそのタブに移動する
Ctrl+W 現在のタブを閉じる
Ctrl+F4 現在のタブを閉じる
Ctrl+Tab 開いている次のタブに移動する
Ctrl+PgDn 開いている次のタブに移動する
Ctrl+PgUp 開いている前のタブに移動する
Ctrl+Shift+N 新しいウィンドウをシークレット モードで開く
Ctrl+Shift+T 最後に閉じたタブを開いてそのタブに移動する
Ctrl+Shift+W 現在のウィンドウを閉じる
Ctrl+Shift+Q Google Chrome を終了する(互換性のためか他のショートカットキーの入力を促すダイアログが表示される)
Ctrl+Shift+Tab 開いている前のタブに移動する

Firefoxで予約(Chromeで予約されなかった部分)
Ctrl+Shift+P 新しいプライベートウィンドウ
Ctrl+Shift+PgUp タブを左へ移動
Ctrl+Shift+PgDn タブを右へ移動
Ctrl+Shift+Home タブを先頭へ移動
Ctrl+Shift+End タブを末尾へ移動

ブラウザによって予約はされていないが避けたほうがいいもの
F12 デベロッパー ツールを開く
F11 全画面表示
Ctrl+NumpadAdd 拡大
Ctrl+NumpadSubtract 縮小

iPadの入力はうまくいかないので対処しよう
codeはUnidentifiedになるけど、keyで取得できる
key = UIKeyInputDownArrow
key = UIKeyInputUpArrow
key = UIKeyInputLeftArrow
key = UIKeyInputRightArrow

optionはaltに
shiftはShiftに
controlはctrlに対応している

windowsのchromeとfirefoxのaltとtabは単体で上のメニューへのフォーカスの機能があるので必ずpreventDefaultで防ぐ
firefoxはbackspaceで履歴を戻るのでそれを防ぐ

-}

import Json.Decode


{-| QWERTY配列やDVORAK配列などの影響を受けない
Definyで扱うことのできる物理的位置に基づいたキー
-}
type alias Key =
    { key : OneKey
    , ctrl : Bool
    , shift : Bool
    , alt : Bool
    }


type OneKey
    = Backquote -- ` ~ JISだと半角/全角
    | Backslash -- JISでは}]む USではEnterの上にある\|
    | Backspace -- Backspace macのキーボードだとdeleteと書かれている ⌫
    | BracketLeft -- [ { JISだと @ `
    | BracketRight -- ] } JISだと [ {「
    | Comma -- , <
    | Digit0 -- 0 ) JISだと 0
    | Digit1 -- 1 !
    | Digit2 -- 2 @ JISだと 2 "
    | Digit3 -- 3 #
    | Digit4 -- 4 $
    | Digit5 -- 5 %
    | Digit6 -- 6 ^ JISだと 6 &
    | Digit7 -- 7 & JISだと 7 '
    | Digit8 -- 8 * JISだと 8 (
    | Digit9 -- 9 ( JISだと 9 )
    | Equal -- = + JISだと ^ ~
    | IntlRo -- JISだけある \ _ ろ
    | IntlYen -- JISだけある \|
    | KeyA
    | KeyB
    | KeyC
    | KeyD
    | KeyE
    | KeyF
    | KeyG
    | KeyH
    | KeyI
    | KeyJ
    | KeyK
    | KeyL
    | KeyM
    | KeyN
    | KeyO
    | KeyP
    | KeyQ
    | KeyR
    | KeyS
    | KeyT
    | KeyU
    | KeyV
    | KeyW
    | KeyX
    | KeyY
    | KeyZ
    | Minus -- - _ JISだと - =
    | Period -- . >
    | Quote -- ' " JISだと : *
    | Semicolon -- ; : JISだと ; +
    | Slash -- / ?
    | Alt
    | ContextMenu
    | Control
    | Enter
    | Shift
    | Space
    | Tab
    | Convert -- 変換
    | KanaMode -- カタカナひらがな|ローマ字
    | NonConvert -- 無変換
    | Escape
    | F1
    | F2
    | F3
    | F4
    | F5
    | F6
    | F7
    | F8
    | F9
    | F10
    | F11
    | F12
    | Delete
    | End
    | Home
    | PageDown
    | PageUp
    | ArrowDown -- ↓
    | ArrowLeft -- ←
    | ArrowRight -- →
    | ArrowUp -- ↑
    | Numpad0
    | Numpad1
    | Numpad2
    | Numpad3
    | Numpad4
    | Numpad5
    | Numpad6
    | Numpad7
    | Numpad8
    | Numpad9
    | NumpadAdd -- +
    | NumpadBackspace
    | NumpadClear -- macのキーボードについている
    | NumpadDecimal -- .
    | NumpadDivide -- /
    | NumpadEnter
    | NumpadEqual -- =
    | NumpadMultiply -- *
    | NumpadSubtract -- -


fromKeyEventObject : Json.Decode.Value -> Maybe Key
fromKeyEventObject =
    Json.Decode.decodeValue decoder
        >> (\x ->
                case x of
                    Ok (Just v) ->
                        Just v

                    _ ->
                        Nothing
           )


decoder : Json.Decode.Decoder (Maybe Key)
decoder =
    Json.Decode.map5 fromKeyAndCodeAndModifierKeys
        (Json.Decode.field "key" Json.Decode.string)
        (Json.Decode.field "code" Json.Decode.string)
        (Json.Decode.field "ctrlKey" Json.Decode.bool)
        (Json.Decode.field "shiftKey" Json.Decode.bool)
        (Json.Decode.field "altKey" Json.Decode.bool)


fromKeyAndCodeAndModifierKeys : String -> String -> Bool -> Bool -> Bool -> Maybe Key
fromKeyAndCodeAndModifierKeys keyString codeString ctrl shift alt =
    case keyStringToKey keyString codeString of
        Just key ->
            Just
                { key = key
                , ctrl = ctrl
                , shift = shift
                , alt = alt
                }

        Nothing ->
            Nothing


keyStringToKey : String -> String -> Maybe OneKey
keyStringToKey keyString codeString =
    case ( keyString, codeString ) of
        ( "UIKeyInputUpArrow", _ ) ->
            Just ArrowUp

        ( "UIKeyInputDownArrow", _ ) ->
            Just ArrowDown

        ( "UIKeyInputLeftArrow", _ ) ->
            Just ArrowLeft

        ( "UIKeyInputRightArrow", _ ) ->
            Just ArrowRight

        ( _, "Backquote" ) ->
            Just Backquote

        ( _, "Backslash" ) ->
            Just Backslash

        ( _, "Backspace" ) ->
            Just Backspace

        ( _, "BracketLeft" ) ->
            Just BracketLeft

        ( _, "BracketRight" ) ->
            Just BracketRight

        ( _, "Comma" ) ->
            Just Comma

        ( _, "Digit0" ) ->
            Just Digit0

        ( _, "Digit1" ) ->
            Just Digit1

        ( _, "Digit2" ) ->
            Just Digit2

        ( _, "Digit3" ) ->
            Just Digit3

        ( _, "Digit4" ) ->
            Just Digit4

        ( _, "Digit5" ) ->
            Just Digit5

        ( _, "Digit6" ) ->
            Just Digit6

        ( _, "Digit7" ) ->
            Just Digit7

        ( _, "Digit8" ) ->
            Just Digit8

        ( _, "Digit9" ) ->
            Just Digit9

        ( _, "Equal" ) ->
            Just Equal

        ( _, "IntlRo" ) ->
            Just IntlRo

        ( _, "IntlYen" ) ->
            Just IntlYen

        ( _, "KeyA" ) ->
            Just KeyA

        ( _, "KeyB" ) ->
            Just KeyB

        ( _, "KeyC" ) ->
            Just KeyC

        ( _, "KeyD" ) ->
            Just KeyD

        ( _, "KeyE" ) ->
            Just KeyE

        ( _, "KeyF" ) ->
            Just KeyF

        ( _, "KeyG" ) ->
            Just KeyG

        ( _, "KeyH" ) ->
            Just KeyH

        ( _, "KeyI" ) ->
            Just KeyI

        ( _, "KeyJ" ) ->
            Just KeyJ

        ( _, "KeyK" ) ->
            Just KeyK

        ( _, "KeyL" ) ->
            Just KeyL

        ( _, "KeyM" ) ->
            Just KeyM

        ( _, "KeyN" ) ->
            Just KeyN

        ( _, "KeyO" ) ->
            Just KeyO

        ( _, "KeyP" ) ->
            Just KeyP

        ( _, "KeyQ" ) ->
            Just KeyQ

        ( _, "KeyR" ) ->
            Just KeyR

        ( _, "KeyS" ) ->
            Just KeyS

        ( _, "KeyT" ) ->
            Just KeyT

        ( _, "KeyU" ) ->
            Just KeyU

        ( _, "KeyV" ) ->
            Just KeyV

        ( _, "KeyW" ) ->
            Just KeyW

        ( _, "KeyX" ) ->
            Just KeyX

        ( _, "KeyY" ) ->
            Just KeyY

        ( _, "KeyZ" ) ->
            Just KeyZ

        ( _, "Minus" ) ->
            Just Minus

        ( _, "Period" ) ->
            Just Period

        ( _, "Quote" ) ->
            Just Quote

        ( _, "Semicolon" ) ->
            Just Semicolon

        ( _, "Slash" ) ->
            Just Slash

        ( _, "Alt" ) ->
            Just Alt

        ( _, "AltLeft" ) ->
            Just Alt

        ( _, "AltRight" ) ->
            Just Alt

        ( _, "ContextMenu" ) ->
            Just ContextMenu

        ( _, "ControlLeft" ) ->
            Just Control

        ( _, "ControlRight" ) ->
            Just Control

        ( _, "Enter" ) ->
            Just Enter

        ( _, "ShiftLeft" ) ->
            Just Shift

        ( _, "ShiftRight" ) ->
            Just Shift

        ( _, "Space" ) ->
            Just Space

        ( _, "Tab" ) ->
            Just Tab

        ( _, "Convert" ) ->
            Just Convert

        ( _, "KanaMode" ) ->
            Just KanaMode

        ( _, "NonConvert" ) ->
            Just NonConvert

        ( _, "Escape" ) ->
            Just Escape

        ( _, "F1" ) ->
            Just F1

        ( _, "F2" ) ->
            Just F2

        ( _, "F3" ) ->
            Just F3

        ( _, "F4" ) ->
            Just F4

        ( _, "F5" ) ->
            Just F5

        ( _, "F6" ) ->
            Just F6

        ( _, "F7" ) ->
            Just F7

        ( _, "F8" ) ->
            Just F8

        ( _, "F9" ) ->
            Just F9

        ( _, "F10" ) ->
            Just F10

        ( _, "F11" ) ->
            Just F11

        ( _, "F12" ) ->
            Just F12

        ( _, "Delete" ) ->
            Just Delete

        ( _, "End" ) ->
            Just End

        ( _, "Home" ) ->
            Just Home

        ( _, "PageDown" ) ->
            Just PageDown

        ( _, "PageUp" ) ->
            Just PageUp

        ( _, "ArrowUp" ) ->
            Just ArrowUp

        ( _, "ArrowDown" ) ->
            Just ArrowDown

        ( _, "ArrowLeft" ) ->
            Just ArrowLeft

        ( _, "ArrowRight" ) ->
            Just ArrowRight

        ( _, "Numpad0" ) ->
            Just Numpad0

        ( _, "Numpad1" ) ->
            Just Numpad1

        ( _, "Numpad2" ) ->
            Just Numpad2

        ( _, "Numpad3" ) ->
            Just Numpad3

        ( _, "Numpad4" ) ->
            Just Numpad4

        ( _, "Numpad5" ) ->
            Just Numpad5

        ( _, "Numpad6" ) ->
            Just Numpad6

        ( _, "Numpad7" ) ->
            Just Numpad7

        ( _, "Numpad8" ) ->
            Just Numpad8

        ( _, "Numpad9" ) ->
            Just Numpad9

        ( _, "NumpadAdd" ) ->
            Just NumpadAdd

        ( _, "NumpadBackspace" ) ->
            Just NumpadBackspace

        ( _, "NumpadClear" ) ->
            Just NumpadClear

        ( _, "NumpadDecimal" ) ->
            Just NumpadDecimal

        ( _, "NumpadDivide" ) ->
            Just NumpadDivide

        ( _, "NumpadEnter" ) ->
            Just NumpadEnter

        ( _, "NumpadEqual" ) ->
            Just NumpadEqual

        ( _, "NumpadMultiply" ) ->
            Just NumpadMultiply

        ( _, "NumpadSubtract" ) ->
            Just NumpadSubtract

        _ ->
            Nothing
