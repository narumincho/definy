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
                ( newModel, Just newMsg, cmdMaybe ) ->
                    update newMsg newModel
                        |> (case cmdMaybe of
                                Just cmd ->
                                    Tuple.mapSecond
                                        (\next -> Cmd.batch [ cmd, next ])

                                Nothing ->
                                    identity
                           )

                ( newModel, Nothing, cmdMaybe ) ->
                    ( newModel
                    , cmdMaybe |> Maybe.withDefault Cmd.none
                    )

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
                ( newModel, Just newMsg, cmdMaybe ) ->
                    update newMsg newModel
                        |> (case cmdMaybe of
                                Just cmd ->
                                    Tuple.mapSecond
                                        (\next -> Cmd.batch [ cmd, next ])

                                Nothing ->
                                    identity
                           )

                ( newModel, Nothing, cmdMaybe ) ->
                    ( newModel
                    , cmdMaybe |> Maybe.withDefault Cmd.none
                    )

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

