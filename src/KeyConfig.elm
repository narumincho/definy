module KeyConfig exposing (keyDown)

{-|

    キー入力を管理する。今はまだ固定なのでただの関数で型はない

-}

import Key
import Model
import Panel.Editor.Module
import Panel.EditorGroup
import Panel.Tree


{-| キー入力。出力は更新したModelとキーのデフォルト動作を取り消すかどうか
-}
keyDown : Maybe Key.Key -> Model.Model -> Maybe (Model.Msg, Bool)
keyDown keyMaybe model =
    case keyMaybe of
        Just key ->
            case editorReservedKey (Model.isOpenCommandPalette model) key of
                Just msg ->
                    Just (msg, True)

                Nothing ->
                    case Model.getFocus model of
                        Model.FocusTreePanel ->
                            treePanelKeyDown key
                                |> Maybe.map (Tuple.mapFirst Model.TreePanelMsg)

                        Model.FocusEditorGroupPanel ->
                            editorGroupPanelKeyDown key (Model.isFocusTextArea model)
                                |> Maybe.map (Tuple.mapFirst Model.EditorPanelMsg)

        Nothing ->
            Nothing


{-| Definyによって予約されたキー。どのパネルにフォーカスが当たっていてもこれを優先する
-}
editorReservedKey : Bool -> Key.Key -> Maybe Model.Msg
editorReservedKey isOpenPalette { key, ctrl, alt, shift } =
    if isOpenPalette then
        case ( ctrl, shift, alt ) of
            ( False, False, False ) ->
                case key of
                    Key.Escape ->
                        Just Model.CloseCommandPalette

                    Key.F1 ->
                        Just Model.OpenCommandPalette

                    _ ->
                        Nothing

            _ ->
                Nothing

    else
        case ( ctrl, shift, alt ) of
            -- 開いているけどキー入力を無視するために必要
            ( False, False, False ) ->
                case key of
                    Key.F1 ->
                        Just Model.OpenCommandPalette

                    _ ->
                        Nothing

            ( False, False, True ) ->
                case key of
                    Key.Digit0 ->
                        Just (Model.FocusTo Model.FocusTreePanel)

                    Key.Digit1 ->
                        Just (Model.FocusTo Model.FocusEditorGroupPanel)

                    Key.Minus ->
                        Just (Model.TreePanelMsg Panel.Tree.SelectAndOpenKeyConfig)

                    _ ->
                        Nothing

            _ ->
                Nothing


{-| ツリーパネルのキー入力
-}
treePanelKeyDown : Key.Key -> Maybe (Panel.Tree.Msg, Bool)
treePanelKeyDown { key, ctrl, shift, alt } =
    case ( shift, ctrl, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowUp ->
                    Just (Panel.Tree.SelectUp, True)

                Key.ArrowDown ->
                    Just (Panel.Tree.SelectDown, True)

                Key.ArrowLeft ->
                    Just (Panel.Tree.SelectParentOrTreeClose, True)

                Key.ArrowRight ->
                    Just (Panel.Tree.SelectFirstChildOrTreeOpen, True)

                Key.Enter ->
                    Just (Panel.Tree.ToFocusEditorPanel, True)

                _ ->
                    Nothing

        _ ->
            Nothing


{-| エディタグループパネルのキー入力
-}
editorGroupPanelKeyDown : Key.Key -> Bool -> Maybe (Panel.EditorGroup.Msg, Bool)
editorGroupPanelKeyDown { key, ctrl, shift, alt } isFocusTextArea =
    case ( shift, ctrl, alt ) of
        ( False, False, False ) ->
            case key of
                Key.Numpad0 ->
                    Just
                        (Panel.EditorGroup.EditorItemMsgToActive
                            (Panel.EditorGroup.ModuleEditorMsg
                                (Panel.Editor.Module.InputReadMe "Numpad0をおしたな!?")
                            )
                        , True
                        )
                _ ->
                    Nothing

        _ ->
            Nothing
