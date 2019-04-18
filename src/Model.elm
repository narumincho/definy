port module Model exposing
    ( GutterType(..)
    , Model
    , Msg
    , editorPanelMsgToMsg
    , editorPanelUpdate
    , focusToEditorGroupPanel
    , focusToTreePanel
    , getActiveEditor
    , getCommandPaletteModel
    , getEditorGroupPanelGutter
    , getEditorGroupPanelModel
    , getEditorGroupPanelSize
    , getGutterType
    , getProject
    , getTreePanelModel
    , getTreePanelWidth
    , init
    , isFocusEditorGroupPanel
    , isFocusTreePanel
    , isTreePanelGutter
    , subscriptions
    , toTreePanelGutterMode
    , treePanelMsgToMsg
    , update
    )

{-| すべての状態を管理する
-}

import Browser.Events
import Compiler
import Json.Decode
import Key
import Panel.CommandPalette
import Panel.DefaultUi
import Panel.Editor.Module
import Panel.EditorGroup
import Panel.EditorTypeRef
import Panel.Tree
import Project
import Project.Source
import Project.Source.ModuleIndex
import Project.Source.ModuleWithCache
import Project.SourceIndex
import Task
import Utility.ListExtra
import Utility.Map


port setTextAreaValue : String -> Cmd msg


port setClickEventListenerInCapturePhase : String -> Cmd msg


port focusTextArea : () -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port run : { ref : List Int, index : Int, wasm : List Int } -> Cmd msg


port elementScrollIntoView : String -> Cmd msg


port input : ({ text : String, caretPos : Int } -> msg) -> Sub msg


port keyPressed : (Json.Decode.Value -> msg) -> Sub msg


port keyPrevented : (() -> msg) -> Sub msg


port windowResize : ({ width : Int, height : Int } -> msg) -> Sub msg


port runResult : ({ ref : List Int, index : Int, result : Int } -> msg) -> Sub msg


port fireClickEventInCapturePhase : (String -> msg) -> Sub msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | MouseMove { x : Int, y : Int } -- マウスの移動
    | MouseUp -- マウスのボタンを離した
    | FireClickEventInCapturePhase String -- 外側から発生するクリックイベントを受け取った
    | ReceiveRunResult
        { ref : List Int
        , index : Int
        , result : Int
        }
      -- 実行結果を受け取った
    | ToResizeGutterMode Gutter -- リサイズモードに移行
    | FocusTo Focus -- フォーカスを移動
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | TreePanelMsg Panel.Tree.Msg -- ツリーパネル独自のメッセージ
    | EditorPanelMsg Panel.EditorGroup.Msg -- エディタパネル独自のメッセージ
    | ChangeEditorResource Panel.EditorTypeRef.EditorTypeRef -- エディタの対象を変える
    | OpenCommandPalette -- コマンドパレットを開く
    | CloseCommandPalette -- コマンドパレッドを閉じる
    | ProjectMsg Project.Msg -- プロジェクトへのメッセージ


{-| 全体を表現する
-}
type Model
    = Model
        { project : Project.Project
        , focus : Focus
        , subMode : SubMode
        , treePanelModel : Panel.Tree.Model
        , editorGroupPanelModel : Panel.EditorGroup.Model
        , treePanelWidth : Int
        , windowSize : { width : Int, height : Int }
        , msgQueue : List Msg
        }


{-| フォーカスしているものとフォーカス時に持てる状態を表す
-}
type Focus
    = FocusTreePanel
    | FocusEditorGroupPanel


type SubMode
    = SubModeNone
    | SubModeCommandPalette Panel.CommandPalette.Model
    | SubModeGutter Gutter


{-| パネルのサイズを変えるときにつかむ、Gutterの種類を表す
-}
type Gutter
    = SideBarGutter
    | GutterEditorGroupPanelVertical Panel.EditorGroup.GutterVertical
    | GutterEditorGroupPanelHorizontal Panel.EditorGroup.GutterHorizontal



{- Gutterの種類 -}


type GutterType
    = GutterTypeVertical
    | GutterTypeHorizontal


init : ( Model, Cmd Msg )
init =
    let
        ( editorPanelModel, emitListFromEditorGroupPanel ) =
            Panel.EditorGroup.initModel

        ( project, ( msgListFromProject, cmdFromProject ) ) =
            Project.init
                |> projectUpdateReturnToProjectAndMsgListAndCmd

        ( msgFromEditorGroupPanel, cmdFromEditorGroupPanel ) =
            emitListFromEditorGroupPanel
                |> List.map editorPanelEmitToMsg
                |> Utility.ListExtra.listTupleListToTupleList

        model =
            Model
                { project = project
                , focus = FocusEditorGroupPanel
                , subMode = SubModeNone
                , treePanelModel = Panel.Tree.initModel
                , editorGroupPanelModel = editorPanelModel
                , treePanelWidth = 250
                , windowSize = { width = 0, height = 0 }
                , msgQueue = []
                }
    in
    updateFromList
        (msgListFromProject ++ msgFromEditorGroupPanel)
        model
        |> Tuple.mapSecond
            (\c ->
                Cmd.batch
                    ([ cmdFromProject ] ++ cmdFromEditorGroupPanel ++ [ c ])
            )



{- =============== Msg ================ -}


toTreePanelGutterMode : Msg
toTreePanelGutterMode =
    ToResizeGutterMode SideBarGutter


{-| ツリーパネルのMsgを全体のMsgに変換する
-}
treePanelMsgToMsg : Panel.Tree.Msg -> Msg
treePanelMsgToMsg =
    TreePanelMsg


{-| エディタパネルのMsgを全体のMsgに変換する
-}
editorPanelMsgToMsg : Panel.EditorGroup.Msg -> Msg
editorPanelMsgToMsg =
    EditorPanelMsg


{-| ツリーパネルにフォーカスをあわせる
-}
focusToTreePanel : Msg
focusToTreePanel =
    FocusTo FocusTreePanel


{-| エディタグループパネルにフォーカスをあわせる
-}
focusToEditorGroupPanel : Msg
focusToEditorGroupPanel =
    FocusTo FocusEditorGroupPanel



{- ============================================
                   Update
   ============================================
-}


{-| Definy全体のUpdate
-}
update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        KeyPressed key ->
            case keyDown key model of
                [] ->
                    ( model, Cmd.none )

                concreteMsgList ->
                    ( model |> pushMsgListToMsgQueue concreteMsgList
                    , preventDefaultBeforeKeyEvent ()
                    )

        KeyPrevented ->
            let
                ( listMsg, newModel ) =
                    model |> shiftMsgListFromMsgQueue
            in
            newModel |> updateFromList listMsg

        MouseMove position ->
            ( mouseMove position model
            , Cmd.none
            )

        MouseUp ->
            ( mouseUp model
            , Cmd.none
            )

        FireClickEventInCapturePhase idString ->
            model
                |> editorPanelUpdate
                    (Panel.EditorGroup.FireClickEventInCapturePhase idString)

        ReceiveRunResult data ->
            receiveResultValue data model

        ToResizeGutterMode gutter ->
            ( toGutterMode gutter model
            , Cmd.none
            )

        FocusTo focus ->
            setFocus focus model

        WindowResize { width, height } ->
            ( model |> setWindowSize { width = width, height = height }
            , Cmd.none
            )

        TreePanelMsg treePanelMsg ->
            model |> treePanelUpdate treePanelMsg

        EditorPanelMsg editorPanelMsg ->
            model |> editorPanelUpdate editorPanelMsg

        ChangeEditorResource editorRef ->
            ( openEditor editorRef model
            , Cmd.none
            )

        OpenCommandPalette ->
            ( openCommandPalette model
            , Cmd.none
            )

        CloseCommandPalette ->
            ( closeCommandPalette model
            , Cmd.none
            )

        ProjectMsg sMsg ->
            model |> projectUpdate sMsg


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



{- =================================================
                       キー入力
   =================================================
-}


{-| キー入力をより具体的なMsgに変換する
-}
keyDown : Maybe Key.Key -> Model -> List Msg
keyDown keyMaybe model =
    case keyMaybe of
        Just key ->
            case editorReservedKey (isOpenCommandPalette model) key of
                x :: xs ->
                    x :: xs

                [] ->
                    case isFocusDefaultUi model of
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


keyDownEachPanel : Key.Key -> Model -> List Msg
keyDownEachPanel key model =
    case getFocus model of
        FocusTreePanel ->
            treePanelKeyDown key
                |> List.map TreePanelMsg

        FocusEditorGroupPanel ->
            editorGroupPanelKeyDown key
                |> List.map EditorPanelMsg


{-| Definyによって予約されたキー。どのパネルにフォーカスが当たっていてもこれを優先する
-}
editorReservedKey : Bool -> Key.Key -> List Msg
editorReservedKey isOpenPalette { key, ctrl, alt, shift } =
    if isOpenPalette then
        case ( ctrl, shift, alt ) of
            ( False, False, False ) ->
                case key of
                    Key.Escape ->
                        [ CloseCommandPalette ]

                    Key.F1 ->
                        [ OpenCommandPalette ]

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
                        [ OpenCommandPalette ]

                    _ ->
                        []

            ( False, False, True ) ->
                case key of
                    Key.Digit0 ->
                        [ FocusTo FocusTreePanel ]

                    Key.Digit1 ->
                        [ FocusTo FocusEditorGroupPanel ]

                    Key.Minus ->
                        [ TreePanelMsg Panel.Tree.SelectAndOpenKeyConfig ]

                    _ ->
                        []

            _ ->
                []


{-|

<textarea>で入力したときに予約されているであろうキーならTrue、そうでないならFalse。
複数行入力を想定している
ブラウザやOSで予約されているであろう動作を邪魔させないためにある。
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

        ( True, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    True

                Key.ArrowRight ->
                    True

                Key.ArrowUp ->
                    True

                Key.ArrowDown ->
                    True

                Key.Backspace ->
                    True

                _ ->
                    False

        ( False, True, False ) ->
            case key of
                Key.ArrowLeft ->
                    True

                Key.ArrowRight ->
                    True

                Key.ArrowUp ->
                    True

                Key.ArrowDown ->
                    True

                _ ->
                    False

        ( True, True, False ) ->
            case key of
                Key.ArrowLeft ->
                    True

                Key.ArrowRight ->
                    True

                Key.ArrowUp ->
                    True

                Key.ArrowDown ->
                    True

                _ ->
                    False

        _ ->
            False


{-| <input type="text">で入力したときに予約されているであろうキーならTrue。そうでないなたFalse。
1行の入力を想定している
ブラウザやOSで予約されているであろう動作を邪魔させないためにある。
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



{- -------------------------------------------------
                 各パネルのキー入力
   -------------------------------------------------
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
editorGroupPanelKeyDown key =
    moduleEditorKeyMsg key
        |> List.map
            (Panel.EditorGroup.ModuleEditorMsg
                >> Panel.EditorGroup.EditorItemMsgToActive
            )


{-| モジュールエディタのキー入力
-}
moduleEditorKeyMsg : Key.Key -> List Panel.Editor.Module.Msg
moduleEditorKeyMsg { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.Editor.Module.MsgActiveLeft ]

                Key.ArrowRight ->
                    [ Panel.Editor.Module.MsgActiveRight ]

                Key.ArrowUp ->
                    [ Panel.Editor.Module.MsgSuggestionPrevOrSelectUp ]

                Key.ArrowDown ->
                    [ Panel.Editor.Module.MsgSuggestionNextOrSelectDown
                    ]

                Key.Space ->
                    [ Panel.Editor.Module.MsgActiveToFirstChild ]

                Key.Enter ->
                    [ Panel.Editor.Module.MsgConfirmSingleLineTextFieldOrSelectParent
                    ]

                _ ->
                    []

        ( True, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.Editor.Module.MsgActiveToLastChild ]

                Key.ArrowRight ->
                    [ Panel.Editor.Module.MsgActiveToFirstChild ]

                Key.Enter ->
                    [ Panel.Editor.Module.MsgConfirmMultiLineTextField ]

                _ ->
                    []

        _ ->
            []



{- =================================================
                       マウス入力
   =================================================
-}


{-| マウスを動かした
-}
mouseMove : { x : Int, y : Int } -> Model -> Model
mouseMove { x, y } model =
    case getGutterMode model of
        Just SideBarGutter ->
            model
                |> setTreePanelWidth
                    (treePanelResizeFromGutter (getWindowSize model).width x)

        Just (GutterEditorGroupPanelVertical gutter) ->
            model
                |> mapEditorGroupPanelModel
                    (Panel.EditorGroup.resizeFromVerticalGutter
                        { mouseRelX = max 0 (x - getTreePanelWidth model)
                        , editorWidth = (getWindowSize model).width - getTreePanelWidth model
                        }
                        gutter
                    )

        Just (GutterEditorGroupPanelHorizontal gutter) ->
            model
                |> mapEditorGroupPanelModel
                    (Panel.EditorGroup.resizeFromHorizontalGutter
                        { mouseRelY = max 0 y
                        , editorHeight = (getWindowSize model).height
                        }
                        gutter
                    )

        Nothing ->
            model


treePanelResizeFromGutter : Int -> Int -> Int
treePanelResizeFromGutter maxLimit x =
    if x < 80 then
        0

    else if x < 120 then
        120

    else
        min maxLimit x


{-| マウスのボタンを離した
-}
mouseUp : Model -> Model
mouseUp (Model rec) =
    Model
        { rec
            | subMode = SubModeNone
        }


receiveResultValue : { ref : List Int, index : Int, result : Int } -> Model -> ( Model, Cmd Msg )
receiveResultValue { ref, index, result } model =
    case ref |> Project.SourceIndex.moduleIndexFromListInt of
        Just moduleIndex ->
            model
                |> projectUpdate
                    (Project.SourceMsg
                        (Project.Source.MsgModule
                            { moduleIndex = moduleIndex
                            , moduleMsg =
                                Project.Source.ModuleWithCache.MsgReceiveRunResult
                                    (index |> Project.Source.ModuleIndex.PartDefIndex)
                                    result
                            }
                        )
                    )

        Nothing ->
            ( model
            , Cmd.none
            )



{- ============ フォーカス 編集している要素について ============= -}


{-| フォーカスしている要素を取得する
-}
getFocus : Model -> Focus
getFocus (Model { focus }) =
    focus


{-| ツリーパネルにフォーカスが当たっているかどうか
-}
isFocusTreePanel : Model -> Bool
isFocusTreePanel model =
    case getFocus model of
        FocusTreePanel ->
            True

        FocusEditorGroupPanel ->
            False


{-| エディタグループパネルにフォーカスが当たっているかどうか
-}
isFocusEditorGroupPanel : Model -> Bool
isFocusEditorGroupPanel model =
    case getFocus model of
        FocusTreePanel ->
            False

        FocusEditorGroupPanel ->
            True


{-| フォーカスする要素を変更する。それによって発生するCmdもある
-}
setFocus : Focus -> Model -> ( Model, Cmd Msg )
setFocus focus (Model rec) =
    case focus of
        FocusTreePanel ->
            Model { rec | focus = FocusTreePanel }
                |> editorPanelUpdate Panel.EditorGroup.Blur

        FocusEditorGroupPanel ->
            Model { rec | focus = FocusEditorGroupPanel }
                |> editorPanelUpdate Panel.EditorGroup.Focus



{- ============ Tree Panel ============= -}


{-| ツリーパネルの幅を変更するモードかどうか
-}
isTreePanelGutter : Model -> Bool
isTreePanelGutter model =
    case getGutterMode model of
        Just SideBarGutter ->
            True

        _ ->
            False


getTreePanelModel : Model -> Panel.Tree.Model
getTreePanelModel (Model { treePanelModel }) =
    treePanelModel


setTreePanelModel : Panel.Tree.Model -> Model -> Model
setTreePanelModel moduleTreePanelModel (Model rec) =
    Model
        { rec
            | treePanelModel = moduleTreePanelModel
        }


mapTreePanelModel : (Panel.Tree.Model -> Panel.Tree.Model) -> Model -> Model
mapTreePanelModel =
    Utility.Map.toMapper getTreePanelModel setTreePanelModel



{- ============ Editor Group Panel ============= -}


getEditorGroupPanelModel : Model -> Panel.EditorGroup.Model
getEditorGroupPanelModel (Model { editorGroupPanelModel }) =
    editorGroupPanelModel


setEditorGroupPanelModel : Panel.EditorGroup.Model -> Model -> Model
setEditorGroupPanelModel editorPanelModel (Model rec) =
    Model
        { rec
            | editorGroupPanelModel = editorPanelModel
        }


mapEditorGroupPanelModel : (Panel.EditorGroup.Model -> Panel.EditorGroup.Model) -> Model -> Model
mapEditorGroupPanelModel =
    Utility.Map.toMapper getEditorGroupPanelModel setEditorGroupPanelModel


{-| エディタグループパネルのGutterの状態を取得する
-}
getEditorGroupPanelGutter : Model -> Maybe Panel.EditorGroup.Gutter
getEditorGroupPanelGutter model =
    case getGutterMode model of
        Just (GutterEditorGroupPanelHorizontal gutter) ->
            Just (Panel.EditorGroup.GutterHorizontal gutter)

        Just (GutterEditorGroupPanelVertical gutter) ->
            Just (Panel.EditorGroup.GutterVertical gutter)

        _ ->
            Nothing



{- ============ パネルやウィンドウの幅高さ ============= -}


{-| ツリーパネルとエディタパネルの間にあるリサイズバーのX座標
-}
getVerticalGutterX : Model -> Int
getVerticalGutterX (Model { treePanelWidth }) =
    treePanelWidth


setTreePanelWidth : Int -> Model -> Model
setTreePanelWidth width (Model rec) =
    Model
        { rec
            | treePanelWidth = width
        }


getTreePanelWidth : Model -> Int
getTreePanelWidth model =
    let
        width =
            getVerticalGutterX model - verticalGutterWidth // 2
    in
    if width < 120 then
        0

    else
        width


getEditorGroupPanelSize : Model -> { width : Int, height : Int }
getEditorGroupPanelSize model =
    { width = (getWindowSize model).width - (getTreePanelWidth model + verticalGutterWidth)
    , height = (getWindowSize model).height
    }


verticalGutterWidth : Int
verticalGutterWidth =
    2


getGutterType : Model -> Maybe GutterType
getGutterType model =
    getGutterMode model
        |> Maybe.map
            (\gutter ->
                case gutter of
                    SideBarGutter ->
                        GutterTypeVertical

                    GutterEditorGroupPanelVertical _ ->
                        GutterTypeVertical

                    GutterEditorGroupPanelHorizontal _ ->
                        GutterTypeHorizontal
            )


getWindowSize : Model -> { width : Int, height : Int }
getWindowSize (Model { windowSize }) =
    windowSize


setWindowSize : { width : Int, height : Int } -> Model -> Model
setWindowSize { width, height } (Model rec) =
    Model
        { rec
            | windowSize = { width = width, height = height }
        }


isCaptureMouseEvent : Model -> Bool
isCaptureMouseEvent model =
    getGutterMode model /= Nothing


getGutterMode : Model -> Maybe Gutter
getGutterMode (Model { subMode }) =
    case subMode of
        SubModeNone ->
            Nothing

        SubModeCommandPalette _ ->
            Nothing

        SubModeGutter gutter ->
            Just gutter


toGutterMode : Gutter -> Model -> Model
toGutterMode gutter (Model rec) =
    Model
        { rec
            | subMode = SubModeGutter gutter
        }


{-| ツリーパネルの更新
-}
treePanelUpdate : Panel.Tree.Msg -> Model -> ( Model, Cmd Msg )
treePanelUpdate msg model =
    let
        ( treeModel, emitMsg ) =
            getTreePanelModel model
                |> Panel.Tree.update
                    msg
                    (getActiveEditor model)
                    (getProject model)
    in
    model
        |> setTreePanelModel treeModel
        |> updateFromList (emitMsg |> List.map treePanelEmitToMsg)


{-| ツリーパネルで発生したEmitを全体のMsgに変換する
-}
treePanelEmitToMsg : Panel.Tree.Emit -> Msg
treePanelEmitToMsg emit =
    case emit of
        Panel.Tree.EmitFocusToEditorGroup ->
            FocusTo FocusEditorGroupPanel

        Panel.Tree.EmitOpenEditor editorRef ->
            ChangeEditorResource editorRef


{-| エディタグループパネルの更新
-}
editorPanelUpdate : Panel.EditorGroup.Msg -> Model -> ( Model, Cmd Msg )
editorPanelUpdate msg model =
    let
        ( editorPanelModel, emitMsg ) =
            Panel.EditorGroup.update
                msg
                (getProject model)
                (getEditorGroupPanelModel model)

        ( nextMsg, cmd ) =
            emitMsg
                |> List.map editorPanelEmitToMsg
                |> Utility.ListExtra.listTupleListToTupleList
    in
    model
        |> setEditorGroupPanelModel editorPanelModel
        |> updateFromList nextMsg
        |> Tuple.mapSecond (\next -> Cmd.batch (cmd ++ [ next ]))


{-| エディタグループパネルの更新
-}
editorPanelEmitToMsg : Panel.EditorGroup.Emit -> ( List Msg, List (Cmd Msg) )
editorPanelEmitToMsg emit =
    case emit of
        Panel.EditorGroup.EmitVerticalGutterModeOn gutterVertical ->
            ( [ ToResizeGutterMode (GutterEditorGroupPanelVertical gutterVertical) ]
            , []
            )

        Panel.EditorGroup.EmitHorizontalGutterModeOn gutterHorizontal ->
            ( [ ToResizeGutterMode (GutterEditorGroupPanelHorizontal gutterHorizontal) ]
            , []
            )

        Panel.EditorGroup.EmitSetTextAreaValue string ->
            ( []
            , [ setTextAreaValue string ]
            )

        Panel.EditorGroup.EmitFocusEditTextAea ->
            ( []
            , [ focusTextArea () ]
            )

        Panel.EditorGroup.EmitSetClickEventListenerInCapturePhase idString ->
            ( []
            , [ setClickEventListenerInCapturePhase idString ]
            )

        Panel.EditorGroup.EmitToSourceMsg msg ->
            ( [ ProjectMsg (Project.SourceMsg msg) ]
            , []
            )

        Panel.EditorGroup.EmitElementScrollIntoView id ->
            ( []
            , [ elementScrollIntoView id ]
            )


{-| プロジェクトを取得する
-}
getProject : Model -> Project.Project
getProject (Model { project }) =
    project


setProject : Project.Project -> Model -> Model
setProject project (Model rec) =
    Model
        { rec | project = project }


mapProject : (Project.Project -> Project.Project) -> Model -> Model
mapProject =
    Utility.Map.toMapper getProject setProject


{-| 開いているエディタを取得する
-}
getActiveEditor : Model -> Panel.EditorTypeRef.EditorTypeRef
getActiveEditor model =
    getEditorGroupPanelModel model
        |> Panel.EditorGroup.getActiveEditor


{-| エディタを開く
-}
openEditor : Panel.EditorTypeRef.EditorTypeRef -> Model -> Model
openEditor editorRef =
    mapEditorGroupPanelModel (Panel.EditorGroup.changeActiveEditorResource editorRef)



{- ====== コマンドパレット ====== -}


{-| コマンドパレットを開く
-}
openCommandPalette : Model -> Model
openCommandPalette (Model rec) =
    Model
        { rec
            | subMode = SubModeCommandPalette Panel.CommandPalette.initModel
        }


closeCommandPalette : Model -> Model
closeCommandPalette (Model rec) =
    Model
        { rec
            | subMode = SubModeNone
        }


{-| コマンドパレッドの状態を取得する
-}
getCommandPaletteModel : Model -> Maybe Panel.CommandPalette.Model
getCommandPaletteModel (Model { subMode }) =
    case subMode of
        SubModeNone ->
            Nothing

        SubModeGutter _ ->
            Nothing

        SubModeCommandPalette model ->
            Just model


isOpenCommandPalette : Model -> Bool
isOpenCommandPalette (Model { subMode }) =
    case subMode of
        SubModeNone ->
            False

        SubModeGutter _ ->
            False

        SubModeCommandPalette _ ->
            True


{-| いまブラウザが入力を受け取る要素にフォーカスが当たっているかどうか。当たっていたらブラウザのデフォルト動作を邪魔しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi model =
    case getFocus model of
        FocusTreePanel ->
            Nothing

        FocusEditorGroupPanel ->
            model
                |> getEditorGroupPanelModel
                |> Panel.EditorGroup.isFocusDefaultUi



{- ============ キー入力されたら、すぐpreventDefaultしないとだめなため、後で処理するmsgを入れとく =============== -}


pushMsgListToMsgQueue : List Msg -> Model -> Model
pushMsgListToMsgQueue msgList (Model rec) =
    Model
        { rec
            | msgQueue = rec.msgQueue ++ msgList
        }


shiftMsgListFromMsgQueue : Model -> ( List Msg, Model )
shiftMsgListFromMsgQueue (Model rec) =
    ( rec.msgQueue
    , Model
        { rec | msgQueue = [] }
    )



{- =====================================
        プロジェクトの情報を変更する
   =====================================
-}


{-| プロジェクトの更新
-}
projectUpdate : Project.Msg -> Model -> ( Model, Cmd Msg )
projectUpdate msg model =
    let
        ( newProject, ( msgList, cmd ) ) =
            model
                |> getProject
                |> Project.update msg
                |> projectUpdateReturnToProjectAndMsgListAndCmd

        newModel =
            model
                |> setProject newProject
    in
    updateFromList
        msgList
        newModel
        |> Tuple.mapSecond (\c -> Cmd.batch [ cmd, c ])


projectUpdateReturnToProjectAndMsgListAndCmd : ( Project.Project, List Project.Emit ) -> ( Project.Project, ( List Msg, Cmd Msg ) )
projectUpdateReturnToProjectAndMsgListAndCmd ( project, emitList ) =
    ( project
    , emitList
        |> List.map (projectEmitToMsgAndCmd project >> Tuple.mapSecond List.singleton)
        |> Utility.ListExtra.listTupleListToTupleList
        |> Tuple.mapSecond Cmd.batch
    )


projectEmitToMsgAndCmd : Project.Project -> Project.Emit -> ( List Msg, Cmd Msg )
projectEmitToMsgAndCmd project emit =
    case emit of
        Project.EmitSource sourceEmit ->
            sourceEmitToMsgAndCmd (Project.getSource project) sourceEmit


sourceEmitToMsgAndCmd : Project.Source.Source -> Project.Source.Emit -> ( List Msg, Cmd Msg )
sourceEmitToMsgAndCmd source emit =
    case emit of
        Project.Source.EmitModule { moduleIndex, moduleEmit } ->
            case moduleEmit of
                Project.Source.ModuleWithCache.EmitCompile partDefIndex ->
                    ( []
                    , compileCmd source moduleIndex partDefIndex
                    )

                Project.Source.ModuleWithCache.EmitRun partDefIndex binary ->
                    ( []
                    , runCmd moduleIndex partDefIndex binary
                    )

                Project.Source.ModuleWithCache.ErrorOverPartCountLimit ->
                    ( []
                      --TODO エラーの握りしめ
                    , Cmd.none
                    )

                Project.Source.ModuleWithCache.ErrorDuplicatePartDefName partDefIndex ->
                    ( []
                      --TODO エラーの握りしめ
                    , Cmd.none
                    )


compileCmd : Project.Source.Source -> Project.SourceIndex.ModuleIndex -> Project.Source.ModuleIndex.PartDefIndex -> Cmd Msg
compileCmd source moduleRef partDefIndex =
    let
        targetPartDefMaybe =
            source
                |> Project.Source.getModule moduleRef
                |> Project.Source.ModuleWithCache.getPartDef partDefIndex
    in
    case targetPartDefMaybe of
        Just targetDef ->
            Task.succeed targetDef
                |> Task.andThen
                    (\def ->
                        Task.succeed (Compiler.compile def)
                    )
                |> Task.perform
                    (\compileResult ->
                        ProjectMsg
                            (Project.SourceMsg
                                (Project.Source.MsgModule
                                    { moduleIndex = moduleRef
                                    , moduleMsg =
                                        Project.Source.ModuleWithCache.MsgReceiveCompileResult
                                            partDefIndex
                                            compileResult
                                    }
                                )
                            )
                    )

        Nothing ->
            Cmd.none


runCmd : Project.SourceIndex.ModuleIndex -> Project.Source.ModuleIndex.PartDefIndex -> List Int -> Cmd Msg
runCmd moduleRef partDefIndex wasm =
    run
        { ref = moduleRef |> Project.SourceIndex.moduleIndexToListInt
        , index = partDefIndex |> Project.Source.ModuleIndex.partDefIndexToInt
        , wasm = wasm
        }



{- ================================================================
                           Subscription
   ================================================================
-}


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        ([ keyPressed (Key.fromKeyEventObject >> KeyPressed)
         , keyPrevented (always KeyPrevented)
         , windowResize WindowResize
         , runResult ReceiveRunResult
         , fireClickEventInCapturePhase FireClickEventInCapturePhase
         ]
            ++ (if isCaptureMouseEvent model then
                    [ Browser.Events.onMouseMove
                        (Json.Decode.map2 (\x y -> MouseMove { x = x, y = y })
                            (Json.Decode.field "clientX" Json.Decode.int)
                            (Json.Decode.field "clientY" Json.Decode.int)
                        )
                    , Browser.Events.onMouseUp
                        (Json.Decode.succeed MouseUp)
                    , Browser.Events.onVisibilityChange
                        (always MouseUp)
                    ]

                else
                    []
               )
        )
