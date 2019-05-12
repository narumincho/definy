module View exposing (view)

import Html exposing (Html)
import Html.Attributes
import Html.Events
import Label
import Model exposing (Model, Msg)
import Panel.CommandPalette
import Panel.EditorGroup
import Panel.Side
import Panel.Tree
import Project
import Utility.ListExtra


{-| 見た目を定義する
-}
view : Model -> { title : String, body : List (Html Msg) }
view model =
    { title = "Definy 0 - " ++ Label.toCapitalString (Project.getName (Model.getProject model))
    , body =
        [ treePanel model
        , verticalGutter (Model.isTreePanelGutter model)
        , editorGroupPanel model
        ]
            ++ (case Model.getCommandPaletteModel model of
                    Just commandPaletteModel ->
                        [ Panel.CommandPalette.view commandPaletteModel ]

                    Nothing ->
                        []
               )
    }


{-| プロジェクトの構造を表示、操作する
-}
treePanel : Model -> Html Msg
treePanel model =
    Html.div
        ([ Html.Attributes.classList
            [ ( "treePanel", True )
            , ( "treePanel-focus", Model.isFocusTreePanel model )
            ]
         , Html.Attributes.style "width"
            (String.fromInt (Model.getTreePanelWidth model) ++ "px")
         ]
            ++ (if Model.isFocusTreePanel model then
                    []

                else
                    [ Html.Events.onClick Model.focusToTreePanel ]
               )
            ++ (Model.getGutterType model
                    |> Maybe.map gutterTypeToCursorStyle
                    |> Utility.ListExtra.fromMaybe
               )
        )
        (Panel.Side.view Panel.Side.initModel
            |> List.map (Html.map Model.sidePanelMsgToMsg)
        )


{-| エディタグループの表示、操作する
-}
editorGroupPanel : Model -> Html Msg
editorGroupPanel model =
    let
        { width, height } =
            Model.getEditorGroupPanelSize model
    in
    Html.div
        ([ Html.Attributes.class "editorGroupPanel"
         , Html.Attributes.style "width" (String.fromInt width ++ "px")
         , Html.Attributes.style "height" (String.fromInt height ++ "px")
         ]
            ++ (if Model.isFocusEditorGroupPanel model then
                    []

                else
                    [ Html.Events.onClick Model.focusToEditorGroupPanel ]
               )
            ++ (Model.getGutterType model
                    |> Maybe.map gutterTypeToCursorStyle
                    |> Utility.ListExtra.fromMaybe
               )
        )
        (Panel.EditorGroup.view
            (Model.getProject model)
            { width = width, height = height }
            (Model.isFocusEditorGroupPanel model)
            (Model.getEditorGroupPanelGutter model)
            (Model.getEditorGroupPanelModel model)
            |> List.map (Html.map Model.editorPanelMsgToMsg)
        )


{-| ツリーパネルの幅を変更するためにつかむところ | ガター
-}
verticalGutter : Bool -> Html.Html Msg
verticalGutter isGutterMode =
    Html.div
        [ Html.Attributes.class
            (if isGutterMode then
                "gutter-vertical-active"

             else
                "gutter-vertical"
            )
        , Html.Events.onMouseDown Model.toTreePanelGutterMode
        ]
        []


gutterTypeToCursorStyle : Model.GutterType -> Html.Attribute msg
gutterTypeToCursorStyle gutterType =
    case gutterType of
        Model.GutterTypeVertical ->
            cursorEWResize

        Model.GutterTypeHorizontal ->
            cursorNSResize


{-| VerticalGutterをつかんだときのマウスの形状 ↔
-}
cursorEWResize : Html.Attribute msg
cursorEWResize =
    Html.Attributes.style "cursor" "ew-resize"


{-| HorizontalGutterをつかんだときのマウスの形状 ↕
-}
cursorNSResize : Html.Attribute msg
cursorNSResize =
    Html.Attributes.style "cursor" "ns-resize"
