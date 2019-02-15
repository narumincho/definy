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
    , initCmd
    , initModel
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
    , pushMsgListToMsgQueue
    , receiveCompiledData
    , receiveResultValue
    , setFocus
    , setWindowSize
    , shiftMsgListFromMsgQueue
    , toGutterMode
    , toTreePanelGutterMode
    , treePanelMsgToMsg
    , treePanelUpdate
    )

{-| すべての状態を管理する
-}

import Compiler
import Key
import Panel.CommandPalette
import Panel.DefaultUi
import Panel.EditorGroup
import Panel.EditorTypeRef
import Panel.Tree
import Project
import Project.Document
import Project.Label as Label
import Project.Source
import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Source.ModuleWithCache
import Task
import Utility.ListExtra
import Utility.Map


port loaded : () -> Cmd msg


port setTextAreaValue : String -> Cmd msg


port focusTextArea : () -> Cmd msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | MouseMove { x : Int, y : Int } -- マウスの移動
    | MouseUp -- マウスのボタンを離した
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


{-| Modelの初期値
-}
initModel : Model
initModel =
    Model
        { project = Project.init
        , focus =
            FocusEditorGroupPanel
        , subMode =
            SubModeNone
        , treePanelModel =
            Panel.Tree.initModel
        , editorGroupPanelModel =
            Panel.EditorGroup.initModel
        , treePanelWidth =
            250
        , windowSize =
            { width = 0, height = 0 }
        , msgQueue = []
        }


{-| 初期コマンド
-}
initCmd : Model -> Cmd Msg
initCmd model =
    let
        source =
            model
                |> getProject
                |> Project.getSource
    in
    Cmd.batch
        ([ loaded () ]
            ++ (source
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
