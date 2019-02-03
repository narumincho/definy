port module Model exposing
    ( Focus(..)
    , GutterType(..)
    , Model
    , Msg(..)
    , changeReadMe
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
    , getWasmBinary
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
    , setFocus
    , setWindowSize
    , toGutterMode
    , toTreePanelGutterMode
    , treePanelMsgToMsg
    , treePanelUpdate
    , changeName, addPartDef)

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
import Project.Source.Module.Def.Expr.Operator as Operator
import Project.Source.Module.Def.Expr.Term as Term
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Source.ModuleWithCache
import Utility.Map


port loaded : () -> Cmd msg


port setTextAreaValue : String -> Cmd msg


{-| 全体の入力を表すメッセージ
-}
type Msg
    = KeyPressed (Maybe Key.Key) -- キーボードから入力
    | KeyPrevented -- キーボードの入力のデフォルト動作を取り消した後
    | MouseMove { x : Int, y : Int } -- マウスの移動
    | MouseUp -- マウスのボタンを離した
    | ReceiveCompiledData ( Int, Compiler.CompileResult ) -- コンパイルの結果を受け取った
    | ToResizeGutterMode Gutter -- リサイズモードに移行
    | FocusTo Focus -- フォーカスを移動
    | WindowResize { width : Int, height : Int } -- ウィンドウサイズを変更
    | TreePanelMsg Panel.Tree.Msg -- ツリーパネル独自のメッセージ
    | EditorPanelMsg Panel.EditorGroup.Msg -- エディタパネル独自のメッセージ
    | ChangeEditorResource Panel.EditorTypeRef.EditorTypeRef -- エディタの対象を変える
    | OpenCommandPalette -- コマンドパレットを開く
    | CloseCommandPalette -- コマンドパレッドを閉じる
    | ChangeReadMe { text : String, ref : Project.Source.ModuleRef } -- モジュールのReadMeを変更する
    | ChangeName { name : Name.Name, ref : Project.Source.ModuleRef } -- 最初の名前を変更する
    | AddPartDef { ref : Project.Source.ModuleRef }  -- 定義を追加する


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
            FocusTreePanel
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
        }


initDefList : List ( Def.Def, Maybe Compiler.CompileResult )
initDefList =
    let
        labelList =
            [ Label.make Label.ha []
            , Label.make Label.hb []

            --            , Label.make Label.hc []
            --            , Label.make Label.hd []
            --            , Label.make Label.he []
            --            , Label.make Label.hf []
            --            , Label.make Label.hg []
            --            , Label.make Label.hh []
            --            , Label.make Label.hi []
            --            , Label.make Label.hj []
            --            , Label.make Label.hk []
            --            , Label.make Label.hl []
            --            , Label.make Label.hm []
            --            , Label.make Label.hn []
            --            , Label.make Label.ho []
            --            , Label.make Label.hp []
            --            , Label.make Label.hq []
            --            , Label.make Label.hr []
            --            , Label.make Label.hs []
            --            , Label.make Label.ht []
            --            , Label.make Label.hu []
            --            , Label.make Label.hv []
            --            , Label.make Label.hw []
            --            , Label.make Label.hx []
            --            , Label.make Label.hy []
            --            , Label.make Label.hz []
            ]
    in
    labelList
        |> List.indexedMap
            (\index label ->
                ( Def.make
                    { name = Name.fromLabel label
                    , type_ = Type.empty
                    , expr =
                        Expr.make
                            (Term.fromInt index)
                            (List.repeat index ( Operator.add, Term.fromInt 12345678 ))
                    }
                , Nothing
                )
            )


{-| 初期コマンド
-}
initCmd : Model -> Cmd Msg
initCmd model =
    loaded ()



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
setFocus : Focus -> Model -> ( Model, Maybe Msg, Maybe (Cmd Msg) )
setFocus focus (Model rec) =
    case focus of
        FocusTreePanel ->
            ( Model
                { rec | focus = FocusTreePanel }
            , Nothing
            , Nothing
            )

        FocusEditorGroupPanel ->
            let
                newModel =
                    Model { rec | focus = FocusEditorGroupPanel }

                ( editorPanelModel, emitMsg ) =
                    Panel.EditorGroup.update
                        Panel.EditorGroup.Focus
                        (getProject newModel)
                        (getEditorGroupPanelModel newModel)

                ( nextMsg, cmd ) =
                    case emitMsg of
                        Just e ->
                            editorPanelEmitToMsg e

                        Nothing ->
                            ( Nothing, Nothing )
            in
            ( newModel |> setEditorGroupPanelModel editorPanelModel
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


{-| WASM
-}
getWasmBinary : Model -> Maybe (List Int)
getWasmBinary _ =
    Nothing


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
editorPanelUpdate : Panel.EditorGroup.Msg -> Model -> ( Model, Maybe Msg, Maybe (Cmd Msg) )
editorPanelUpdate msg model =
    let
        ( editorPanelModel, emitMsg ) =
            Panel.EditorGroup.update
                msg
                (getProject model)
                (getEditorGroupPanelModel model)

        ( nextMsg, cmd ) =
            case emitMsg of
                Just e ->
                    editorPanelEmitToMsg e

                Nothing ->
                    ( Nothing, Nothing )
    in
    ( model |> setEditorGroupPanelModel editorPanelModel
    , nextMsg
    , cmd
    )


{-| エディタグループパネルの更新
-}
editorPanelEmitToMsg : Panel.EditorGroup.Emit -> ( Maybe Msg, Maybe (Cmd Msg) )
editorPanelEmitToMsg emit =
    case emit of
        Panel.EditorGroup.EmitVerticalGutterModeOn gutterVertical ->
            ( Just
                (ToResizeGutterMode (GutterEditorGroupPanelVertical gutterVertical))
            , Nothing
            )

        Panel.EditorGroup.EmitHorizontalGutterModeOn gutterHorizontal ->
            ( Just
                (ToResizeGutterMode (GutterEditorGroupPanelHorizontal gutterHorizontal))
            , Nothing
            )

        Panel.EditorGroup.EmitChangeReadMe { text, ref } ->
            ( Just (ChangeReadMe { text = text, ref = ref })
            , Nothing
            )

        Panel.EditorGroup.EmitSetTextAreaValue string ->
            ( Nothing
            , Just (setTextAreaValue string)
            )

        Panel.EditorGroup.EmitChangeName { name, ref } ->
            ( Just (ChangeName { name = name, ref = ref })
            , Nothing
            )

        Panel.EditorGroup.EmitAddPartDef {ref} ->
            ( Just (AddPartDef {ref=ref})
            , Nothing
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


changeName : { name : Name.Name, ref : Project.Source.ModuleRef } -> Model -> Model
changeName { name, ref } =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule ref (Project.Source.ModuleWithCache.setFirstDefName name))
        )

addPartDef : {ref:Project.Source.ModuleRef} -> Model -> Model
addPartDef {ref} =
    mapProject
        (Project.mapSource
            (Project.Source.mapModule ref (Project.Source.ModuleWithCache.addDef Def.empty))
        )
