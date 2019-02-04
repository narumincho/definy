port module Update exposing (update)

import Compiler
import Key
import KeyConfig
import Model exposing (Model, Msg)
import Suggestion
import Task



-- TextAreaにフォーカスする


port focusTextArea : () -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port run : List Int -> Cmd msg


{-| Definyエディタの全体のUpdate
-}
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Model.KeyPressed key ->
            case KeyConfig.keyDown key model of
                Just ( concreteMsg, isPreventDefault ) ->
                    update concreteMsg model
                        |> (if isPreventDefault then
                                Tuple.mapSecond
                                    (\cmd -> Cmd.batch [ preventDefaultBeforeKeyEvent (), cmd ])

                            else
                                identity
                           )

                Nothing ->
                    ( model, Cmd.none )

        Model.MouseMove position ->
            ( Model.mouseMove position model
            , Cmd.none
            )

        Model.MouseUp ->
            ( Model.mouseUp model
            , Cmd.none
            )

        Model.KeyPrevented ->
            ( model
            , Cmd.none
            )

        Model.ReceiveCompiledData ( index, compileResult ) ->
            ( model
            , case Model.getWasmBinary model of
                Just list ->
                    run list

                Nothing ->
                    Cmd.none
            )

        Model.ToResizeGutterMode gutter ->
            ( Model.toGutterMode gutter model
            , Cmd.none
            )

        Model.FocusTo focus ->
            case Model.setFocus focus model of
                ( newModel, newMsgList, newCmdList ) ->
                    updateFromList newMsgList newModel
                        |> Tuple.mapSecond (\next -> Cmd.batch (newCmdList ++ [ next ]))

        Model.WindowResize { width, height } ->
            ( Model.setWindowSize { width = width, height = height } model
            , Cmd.none
            )

        Model.TreePanelMsg treePanelMsg ->
            case Model.treePanelUpdate treePanelMsg model of
                ( newModel, Just newMsg ) ->
                    update newMsg newModel

                ( newModel, Nothing ) ->
                    ( newModel, Cmd.none )

        Model.EditorPanelMsg editorPanelMsg ->
            case Model.editorPanelUpdate editorPanelMsg model of
                ( newModel, newMsgList, newCmdList ) ->
                    updateFromList newMsgList newModel
                        |> Tuple.mapSecond (\next -> Cmd.batch (newCmdList ++ [ next ]))

        Model.ChangeEditorResource editorRef ->
            ( Model.openEditor editorRef model
            , Cmd.none
            )

        Model.OpenCommandPalette ->
            ( Model.openCommandPalette model
            , Cmd.none
            )

        Model.CloseCommandPalette ->
            ( Model.closeCommandPalette model
            , Cmd.none
            )

        Model.ChangeReadMe data ->
            ( Model.changeReadMe data model
            , Cmd.none
            )

        Model.ChangeName data ->
            ( Model.changeName data model
            , Cmd.none
            )

        Model.ChangeType data ->
            ( Model.changeType data model
            , Cmd.none
            )

        Model.ChangeExpr data ->
            ( Model.changeExpr data model
            , Cmd.none
            )

        Model.AddPartDef data ->
            ( Model.addPartDef data model
            , Cmd.none
            )


updateFromList : List Msg -> Model -> ( Model, Cmd Msg )
updateFromList msgList model =
    case msgList of
        msg :: tailMsg ->
            let
                ( newModel, cmd ) =
                    update msg model
            in
            updateFromList tailMsg newModel
                |> Tuple.mapSecond (\next -> Cmd.batch [ cmd, next ])

        [] ->
            ( model, Cmd.none )
