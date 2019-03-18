port module Update exposing (update)

import KeyConfig
import Model exposing (Model, Msg)



-- TextAreaにフォーカスする


port focusTextArea : () -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port run : { ref : List Int, index : Int, wasm : List Int } -> Cmd msg


{-| Definyエディタの全体のUpdate
-}
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Model.KeyPressed key ->
            case KeyConfig.keyDown key model of
                [] ->
                    ( model, Cmd.none )

                concreteMsgList ->
                    ( model |> Model.pushMsgListToMsgQueue concreteMsgList
                    , preventDefaultBeforeKeyEvent ()
                    )

        Model.MouseMove position ->
            ( Model.mouseMove position model
            , Cmd.none
            )

        Model.MouseUp ->
            ( Model.mouseUp model
            , Cmd.none
            )

        Model.KeyPrevented ->
            let
                ( listMsg, newModel ) =
                    model |> Model.shiftMsgListFromMsgQueue
            in
            updateFromList listMsg newModel

        Model.ReceiveCompiledData data ->
            let
                ( newModel, wasmAndRefMaybe ) =
                    Model.receiveCompiledData data model
            in
            ( newModel
            , case wasmAndRefMaybe of
                Just wasmAndRef ->
                    run wasmAndRef

                Nothing ->
                    Cmd.none
            )

        Model.ReceiveResultValue data ->
            ( Model.receiveResultValue data model
            , Cmd.none
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
            Model.changeExpr data model

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
