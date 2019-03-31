port module Model exposing
    ( Focus(..)
    , GutterType(..)
    , Model
    , Msg(..)
    , addPartDef
    , changeExpr
    , changeName
    , changeReadMe
    , changeType
    , closeCommandPalette
    , editorPanelMsgToMsg
    , editorPanelUpdate
    , getActiveEditor
    , getCommandPaletteModel
    , getEditorGroupPanelGutter
    , getEditorGroupPanelModel
    , getEditorGroupPanelSize
    , getFocus
    , getGutterType
    , getProject
    , getTreePanelModel
    , getTreePanelWidth
    , getWindowSize
    , init
    , isCaptureMouseEvent
    , isFocusDefaultUi
    , isFocusEditorGroupPanel
    , isFocusTreePanel
    , isOpenCommandPalette
    , isTreePanelGutter
    , mouseMove
    , mouseUp
    , openCommandPalette
    , openEditor
    , receiveCompiledData
    , receiveResultValue
    , setFocus
    , setWindowSize
    , toGutterMode
    , toTreePanelGutterMode
    , treePanelMsgToMsg
    , treePanelUpdate
    , update
    )

{-| すべての状態を管理する
-}

import Compiler
import Key
import Panel.CommandPalette
import Panel.DefaultUi
import Panel.Editor.Module
import Panel.EditorGroup
import Panel.EditorTypeRef
import Panel.Tree
import Project
import Project.Source
import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Source.ModuleWithCache
import Task
import Utility.ListExtra
import Utility.Map


port setTextAreaValue : String -> Cmd msg


port setClickEventListenerInCapturePhase : String -> Cmd msg


port focusTextArea : () -> Cmd msg


port preventDefaultBeforeKeyEvent : () -> Cmd msg


port run : { ref : List Int, index : Int, wasm : List Int } -> Cmd msg



--port deleteClickEventListenerInCapturePhase : String -> Cmd msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | MouseMove { x : Int, y : Int } -- マウスの移動
    | MouseUp -- マウスのボタンを離した
    | FireClickEventInCapturePhase String -- 外側から発生するクリックイベントを受け取った
    | ReceiveCompiledData { ref : Project.Source.ModuleRef, index : Int, compileResult : Compiler.CompileResult } -- コンパイルの結果を受け取った
    | ReceiveResultValue { ref : List Int, index : Int, result : Int } -- 実行結果を受け取った
    | ToResizeGutterMode Gutter -- リサイズモードに移行
    | FocusTo Focus -- フォーカスを移動
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | TreePanelMsg Panel.Tree.Msg -- ツリーパネル独自のメッセージ
    | EditorPanelMsg Panel.EditorGroup.Msg -- エディタパネル独自のメッセージ
    | ChangeEditorResource Panel.EditorTypeRef.EditorTypeRef -- エディタの対象を変える
    | OpenCommandPalette -- コマンドパレットを開く
    | CloseCommandPalette -- コマンドパレッドを閉じる
    | ChangeReadMe { text : String, ref : Project.Source.ModuleRef } -- モジュールのReadMeを変更する
    | ChangeName { name : Name.Name, index : Int, ref : Project.Source.ModuleRef } -- 定義の名前を変更する
    | ChangeType { type_ : Type.Type, index : Int, ref : Project.Source.ModuleRef } -- 定義の型を変更する
    | ChangeExpr { expr : Expr.Expr, index : Int, ref : Project.Source.ModuleRef } -- 定義の式を変更する
    | AddPartDef { ref : Project.Source.ModuleRef } -- 定義を追加する


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
        ( editorPanelModel, emitListFromEditorPanel ) =
            Panel.EditorGroup.initModel

        model =
            Model
                { project = Project.init
                , focus = FocusEditorGroupPanel
                , subMode = SubModeNone
                , treePanelModel = Panel.Tree.initModel
                , editorGroupPanelModel = editorPanelModel
                , treePanelWidth = 250
                , windowSize = { width = 0, height = 0 }
                , msgQueue = []
                }

        source =
            model
                |> getProject
                |> Project.getSource
    in
    ( model
    , Cmd.batch
        (source
            |> Project.Source.allModuleRef
            |> List.concatMap
                (\moduleRef ->
                    let
                        defNum =
                            source
                                |> Project.Source.getModule moduleRef
                                |> Project.Source.ModuleWithCache.getDefNum
                    in
                    List.range 0 defNum
                        |> List.map (compileCmd source moduleRef)
                )
        )
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
                |> update
                    (EditorPanelMsg
                        (Panel.EditorGroup.FireClickEventInCapturePhase idString)
                    )

        KeyPrevented ->
            let
                ( listMsg, newModel ) =
                    model |> shiftMsgListFromMsgQueue
            in
            updateFromList listMsg newModel

        ReceiveCompiledData data ->
            let
                ( newModel, wasmAndRefMaybe ) =
                    receiveCompiledData data model
            in
            ( newModel
            , case wasmAndRefMaybe of
                Just wasmAndRef ->
                    run wasmAndRef

                Nothing ->
                    Cmd.none
            )

        ReceiveResultValue data ->
            ( receiveResultValue data model
            , Cmd.none
            )

        ToResizeGutterMode gutter ->
            ( toGutterMode gutter model
            , Cmd.none
            )

        FocusTo focus ->
            case setFocus focus model of
                ( newModel, newMsgList, newCmdList ) ->
                    updateFromList newMsgList newModel
                        |> Tuple.mapSecond (\next -> Cmd.batch (newCmdList ++ [ next ]))

        WindowResize { width, height } ->
            ( setWindowSize { width = width, height = height } model
            , Cmd.none
            )

        TreePanelMsg treePanelMsg ->
            case treePanelUpdate treePanelMsg model of
                ( newModel, Just newMsg ) ->
                    update newMsg newModel

                ( newModel, Nothing ) ->
                    ( newModel, Cmd.none )

        EditorPanelMsg editorPanelMsg ->
            case editorPanelUpdate editorPanelMsg model of
                ( newModel, newMsgList, newCmdList ) ->
                    updateFromList newMsgList newModel
                        |> Tuple.mapSecond (\next -> Cmd.batch (newCmdList ++ [ next ]))

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

        ChangeReadMe data ->
            ( changeReadMe data model
            , Cmd.none
            )

        ChangeName data ->
            ( changeName data model
            , Cmd.none
            )

        ChangeType data ->
            ( changeType data model
            , Cmd.none
            )

        ChangeExpr data ->
            changeExpr data model

        AddPartDef data ->
            ( addPartDef data model
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
setFocus : Focus -> Model -> ( Model, List Msg, List (Cmd Msg) )
setFocus focus (Model rec) =
    case focus of
        FocusTreePanel ->
            let
                focusMovedModel =
                    Model { rec | focus = FocusTreePanel }

                ( editorPanelModel, editorPanelEmit ) =
                    Panel.EditorGroup.update
                        Panel.EditorGroup.Blur
                        (getProject focusMovedModel)
                        (getEditorGroupPanelModel focusMovedModel)

                ( nextMsg, cmd ) =
                    editorPanelEmit
                        |> List.map editorPanelEmitToMsg
                        |> Utility.ListExtra.listTupleListToTupleList
            in
            ( focusMovedModel |> setEditorGroupPanelModel editorPanelModel
            , nextMsg
            , cmd
            )

        FocusEditorGroupPanel ->
            let
                focusMovedModel =
                    Model { rec | focus = FocusEditorGroupPanel }

                ( editorPanelModel, emitMsg ) =
                    Panel.EditorGroup.update
                        Panel.EditorGroup.Focus
                        (getProject focusMovedModel)
                        (getEditorGroupPanelModel focusMovedModel)

                ( nextMsg, cmd ) =
                    emitMsg
                        |> List.map editorPanelEmitToMsg
                        |> Utility.ListExtra.listTupleListToTupleList
            in
            ( focusMovedModel |> setEditorGroupPanelModel editorPanelModel
            , nextMsg
            , cmd
            )



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



-- ここを通ったら無駄なマウスイベントを排除できなかったことになる


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


{-| コンパイルの結果を受け取った
-}
receiveCompiledData :
    { ref : Project.Source.ModuleRef, index : Int, compileResult : Compiler.CompileResult }
    -> Model
    -> ( Model, Maybe { ref : List Int, index : Int, wasm : List Int } )
receiveCompiledData { ref, index, compileResult } model =
    ( model
        |> mapProject
            (Project.mapSource
                (Project.Source.mapModule ref
                    (Project.Source.ModuleWithCache.setCompileResult index compileResult)
                )
            )
    , case Compiler.getBinary compileResult of
        Just wasm ->
            Just
                { ref = Project.moduleRefToListInt ref
                , index = index
                , wasm = wasm
                }

        Nothing ->
            Nothing
    )


receiveResultValue :
    { ref : List Int, index : Int, result : Int }
    -> Model
    -> Model
receiveResultValue { ref, index, result } =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule
                (Project.listIntToModuleRef ref)
                (Project.Source.ModuleWithCache.setEvalResult index result)
            )
        )


{-| ツリーパネルの更新
-}
treePanelUpdate : Panel.Tree.Msg -> Model -> ( Model, Maybe Msg )
treePanelUpdate msg model =
    case Panel.Tree.update msg (getActiveEditor model) (getProject model) (getTreePanelModel model) of
        ( treeModel, emitMsg ) ->
            ( model |> setTreePanelModel treeModel
            , emitMsg |> Maybe.map treePanelEmitToMsg
            )


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
editorPanelUpdate : Panel.EditorGroup.Msg -> Model -> ( Model, List Msg, List (Cmd Msg) )
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
    ( model |> setEditorGroupPanelModel editorPanelModel
    , nextMsg
    , cmd
    )


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

        Panel.EditorGroup.EmitChangeReadMe { text, ref } ->
            ( [ ChangeReadMe { text = text, ref = ref } ]
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

        Panel.EditorGroup.EmitChangeName { name, index, ref } ->
            ( [ ChangeName { name = name, index = index, ref = ref } ]
            , []
            )

        Panel.EditorGroup.EmitAddPartDef { ref } ->
            ( [ AddPartDef { ref = ref } ]
            , []
            )

        Panel.EditorGroup.EmitChangeType { type_, index, ref } ->
            ( [ ChangeType { type_ = type_, index = index, ref = ref } ]
            , []
            )

        Panel.EditorGroup.EmitChangeExpr { expr, index, ref } ->
            ( [ ChangeExpr { expr = expr, index = index, ref = ref } ]
            , []
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
    Utility.Map.toMapper
        getProject
        setProject


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
    getEditorGroupPanelModel model
        |> Panel.EditorGroup.isFocusDefaultUi


changeReadMe : { text : String, ref : Project.Source.ModuleRef } -> Model -> Model
changeReadMe { text, ref } model =
    model
        |> mapProject
            (Project.mapSource
                (Project.Source.mapModule ref (Project.Source.ModuleWithCache.setReadMe text))
            )


changeName : { name : Name.Name, index : Int, ref : Project.Source.ModuleRef } -> Model -> Model
changeName { name, index, ref } =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule
                ref
                (Project.Source.ModuleWithCache.setDefName index name)
            )
        )


changeType : { type_ : Type.Type, index : Int, ref : Project.Source.ModuleRef } -> Model -> Model
changeType { type_, index, ref } =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule
                ref
                (Project.Source.ModuleWithCache.setDefType index type_)
            )
        )


changeExpr : { expr : Expr.Expr, index : Int, ref : Project.Source.ModuleRef } -> Model -> ( Model, Cmd Msg )
changeExpr { expr, index, ref } model =
    let
        newModel =
            model
                |> mapProject
                    (Project.mapSource
                        (Project.Source.mapModule
                            ref
                            (Project.Source.ModuleWithCache.setDefExpr index expr)
                        )
                    )
    in
    ( newModel
    , compileCmd (newModel |> getProject |> Project.getSource) ref index
    )


compileCmd : Project.Source.Source -> Project.Source.ModuleRef -> Int -> Cmd Msg
compileCmd source moduleRef index =
    let
        targetDefMaybe =
            source
                |> Project.Source.getModule moduleRef
                |> Project.Source.ModuleWithCache.getDef index
    in
    case targetDefMaybe of
        Just targetDef ->
            Task.succeed targetDef
                |> Task.andThen
                    (\def ->
                        Task.succeed (Compiler.compile def)
                    )
                |> Task.perform
                    (\compileResult ->
                        ReceiveCompiledData
                            { ref = moduleRef
                            , index = index
                            , compileResult = compileResult
                            }
                    )

        Nothing ->
            Cmd.none


addPartDef : { ref : Project.Source.ModuleRef } -> Model -> Model
addPartDef { ref } =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule ref (Project.Source.ModuleWithCache.addDef Def.empty))
        )



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



{-

   キー入力を管理する。今はまだ固定なので、キーコンフィグの設定を表す型はない

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
editorGroupPanelKeyDown key =
    moduleEditorKeyMsg key
        |> List.map
            (Panel.EditorGroup.ModuleEditorMsg
                >> Panel.EditorGroup.EditorItemMsgToActive
            )


moduleEditorKeyMsg : Key.Key -> List Panel.Editor.Module.Msg
moduleEditorKeyMsg { key, ctrl, shift, alt } =
    case ( ctrl, shift, alt ) of
        ( False, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.Editor.Module.SelectLeft ]

                Key.ArrowRight ->
                    [ Panel.Editor.Module.SelectRight ]

                Key.ArrowUp ->
                    [ Panel.Editor.Module.SuggestionPrevOrSelectUp ]

                Key.ArrowDown ->
                    [ Panel.Editor.Module.SuggestionNextOrSelectDown
                    ]

                Key.Space ->
                    [ Panel.Editor.Module.SelectFirstChild ]

                Key.Enter ->
                    [ Panel.Editor.Module.ConfirmSingleLineTextFieldOrSelectParent
                    ]

                _ ->
                    []

        ( True, False, False ) ->
            case key of
                Key.ArrowLeft ->
                    [ Panel.Editor.Module.SelectLastChild ]

                Key.ArrowRight ->
                    [ Panel.Editor.Module.SelectFirstChild ]

                Key.Enter ->
                    [ Panel.Editor.Module.ConfirmMultiLineTextField ]

                _ ->
                    []

        _ ->
            []
