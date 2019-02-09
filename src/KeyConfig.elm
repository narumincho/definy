module KeyConfig exposing (keyDown)

{-|

    キー入力を管理する。今はまだ固定なのでただの関数で型はない

-}

import Key
import Model
import Panel.DefaultUi
import Panel.Editor.Module
import Panel.EditorGroup
import Panel.Tree


{-| キー入力をより具体的なMsgに変換する
-}
keyDown : Maybe Key.Key -> Model.Model -> List Model.Msg
keyDown keyMaybe model =
    case keyMaybe of
        Just key ->
            case editorReservedKey (Model.isOpenCommandPalette model) key of
                x :: xs ->
                    x :: xs

                [] ->
                    case Model.isFocusDefaultUi model of
                        Just Panel.DefaultUi.MultiLineTextField ->
                            if multiLineTextFieldReservedKey key then
                                []

                            else
                                keyDownEachPanel key model

                        Just Panel.DefaultUi.SingleLineTextField ->
                            if singleLineTextFieldReservedKey key then
                                []

                            else
                                keyDownEachPanel key model

                        Nothing ->
                            keyDownEachPanel key model

        Nothing ->
            []


keyDownEachPanel : Key.Key -> Model.Model -> List Model.Msg
keyDownEachPanel key model =
    case Model.getFocus model of
        Model.FocusTreePanel ->
            treePanelKeyDown key
                |> List.map Model.TreePanelMsg

        Model.FocusEditorGroupPanel ->
            editorGroupPanelKeyDown key
                |> List.map Model.EditorPanelMsg


{-| Definyによって予約されたキー。どのパネルにフォーカスが当たっていてもこれを優先する
-}
editorReservedKey : Bool -> Key.Key -> List Model.Msg
editorReservedKey isOpenPalette { key, ctrl, alt, shift } =
    if isOpenPalette then
        case ( ctrl, shift, alt ) of
            ( False, False, False ) ->
                case key of
                    Key.Escape ->
                        [ Model.CloseCommandPalette ]

                    Key.F1 ->
                        [ Model.OpenCommandPalette ]

                    _ ->
                        []

            _ ->
                []

    else
        case ( ctrl, shift, alt ) of
            -- 開いているけどキー入力を無視するために必要
            ( False, False, False ) ->
                case key of
                    Key.F1 ->
                        [ Model.OpenCommandPalette ]

                    _ ->
                        []

            ( False, False, True ) ->
                case key of
                    Key.Digit0 ->
                        [ Model.FocusTo Model.FocusTreePanel ]

                    Key.Digit1 ->
                        [ Model.FocusTo Model.FocusEditorGroupPanel ]

                    Key.Minus ->
                        [ Model.TreePanelMsg Panel.Tree.SelectAndOpenKeyConfig ]

                    _ ->
                        []

            _ ->
                []



{- ==============================================
       キー入力をDefinyで処理しない例外のような処理
   =================================================
-}


{-|

<textarea>で入力したときに予約されているであろうキーならTrue、そうでないならFalse。
複数行入力を想定している
予約さるであろう動作を邪魔させないためにある。
Model.isFocusTextAreaがTrueになったときにまずこれを優先する

-}
multiLineTextFieldReservedKey : Key.Key -> Bool
multiLineTextFieldReservedKey { key, ctrl, alt, shift } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    True

                Key.ArrowRight ->
                    True

                Key.ArrowUp ->
                    True

                Key.ArrowDown ->
                    True

                Key.Enter ->
                    True

                Key.Backspace ->
                    True

                _ ->
                    False

        _ ->
            False


{-| <input type="text">で入力したときに予約されているであろうキーならTrue。そうでないなたFalse。
1行の入力を想定している
予約さるであろう動作を邪魔させないためにある。
-}
singleLineTextFieldReservedKey : Key.Key -> Bool
singleLineTextFieldReservedKey { key, ctrl, alt, shift } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    True

                Key.ArrowRight ->
                    True

                Key.Backspace ->
                    True

                _ ->
                    False

        _ ->
            False



{- =================================================
             各パネルのキー入力。 キー -> メッセージ
   =================================================
-}


{-| ツリーパネルのキー入力
-}
treePanelKeyDown : Key.Key -> List Panel.Tree.Msg
treePanelKeyDown { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowUp ->
                    [ Panel.Tree.SelectUp ]

                Key.ArrowDown ->
                    [ Panel.Tree.SelectDown ]

                Key.ArrowLeft ->
                    [ Panel.Tree.SelectParentOrTreeClose ]

                Key.ArrowRight ->
                    [ Panel.Tree.SelectFirstChildOrTreeOpen ]

                Key.Enter ->
                    [ Panel.Tree.ToFocusEditorPanel ]

                _ ->
                    []

        _ ->
            []


{-| エディタグループパネルのキー入力
-}
editorGroupPanelKeyDown : Key.Key -> List Panel.EditorGroup.Msg
editorGroupPanelKeyDown { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectLeft
                        )
                    ]

                Key.ArrowRight ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectRight
                        )
                    ]

                Key.ArrowUp ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectUp
                        )
                    ]

                Key.ArrowDown ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectDown
                        )
                    ]

                Key.Space ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectFirstChild
                        )
                    ]

                Key.Enter ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectParent
                        )
                    ]

                _ ->
                    []

        ( True, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectLastChild
                        )
                    ]

                Key.ArrowRight ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.SelectFirstChild
                        )
                    ]

                Key.Enter ->
                    [ Panel.EditorGroup.EditorItemMsgToActive
                        (Panel.EditorGroup.ModuleEditorMsg
                            Panel.Editor.Module.ConfirmMultiLineTextField
                        )
                    ]

                _ ->
                    []

        _ ->
            []
