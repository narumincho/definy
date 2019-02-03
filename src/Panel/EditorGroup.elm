module Panel.EditorGroup exposing
    ( EditorItemMsg(..)
    , Emit(..)
    , Gutter(..)
    , GutterHorizontal
    , GutterVertical
    , Model
    , Msg(..)
    , changeActiveEditorResource
    , getActiveEditor
    , initModel
    , isFocusDefaultUi
    , resizeFromHorizontalGutter
    , resizeFromVerticalGutter
    , update
    , view
    )

{-| 画面に主に表示されるパネルで、左のツリーパネルで設定した内容を表示編集できる
また、編集画面を分割することもできる
-}

import Html
import Html.Attributes
import Html.Events
import NSvg
import Palette.X11
import Panel.DefaultUi
import Panel.Editor.Config
import Panel.Editor.Document
import Panel.Editor.EditorKeyConfig
import Panel.Editor.Module
import Panel.Editor.Project
import Panel.Editor.Source
import Panel.EditorTypeRef
import Project
import Project.Label
import Project.Source
import Project.Source.Module.Def.Name
import Project.Source.Module.Def.Type
import Project.Source.ModuleWithCache
import Utility.ListExtra
import Utility.Map


{-| とりうる値を保持するModel
-}
type Model
    = Model
        { group : Group
        , activeEditorRef : EditorRef
        , mouseOverOpenEditorPosition : Maybe OpenEditorPosition
        }


{-| エディタを複数持つグループ
-}
type Group
    = RowOne
        { columnGroup : ColumnGroup
        }
    | RowTwo
        { columnGroupLeft : ColumnGroup
        , columnGroupRight : ColumnGroup
        , columnGroupLeftWidth : Int -- MAX 1000
        }
    | RowThree
        { columnGroupLeft : ColumnGroup
        , columnGroupCenter : ColumnGroup
        , columnGroupRight : ColumnGroup
        , columnGroupLeftWidth : Int
        , columnGroupCenterWidth : Int -- LeftとCenterを足してMAX 1000
        }


type ColumnGroup
    = ColumnOne
        { editor : EditorItem
        }
    | ColumnTwo
        { editorTop : EditorItem
        , editorBottom : EditorItem
        , editorTopHeight : Int -- Max 1000
        }


{-| 各エディタのModelを保持する
-}
type EditorItem
    = ProjectEditor Panel.Editor.Project.Model
    | DocumentEditor Panel.Editor.Document.Model
    | ConfigEditor Panel.Editor.Config.Model
    | SourceEditor Panel.Editor.Source.Model
    | ModuleEditor Panel.Editor.Module.Model
    | EditorKeyConfig Panel.Editor.EditorKeyConfig.Model


{-| 最大6個のエディタのどれを指しているのかを保持する
-}
type alias EditorRef =
    ( EditorRefRow, EditorRefColumn )


type EditorRefRow
    = EditorRefLeft
    | EditorRefCenter
    | EditorRefRight


type EditorRefColumn
    = EditorRefTop
    | EditorRefBottom


{-| リサイズのためにつかむガター
-}
type Gutter
    = GutterVertical GutterVertical
    | GutterHorizontal GutterHorizontal


type GutterVertical
    = GutterVerticalLeft
    | GutterVerticalRight


type GutterHorizontal
    = GutterHorizontalLeft
    | GutterHorizontalCenter
    | GutterHorizontalRight


{-| EditorGroupへのメッセージ
-}
type Msg
    = ChangeActiveEditor EditorRef -- 他のエディタへアクティブなエディタを変更する
    | OpenEditor OpenEditorPosition -- エディタを表示する
    | CloseEditor EditorRef -- エディタを削除する
    | MouseEnterOpenEditorGutter OpenEditorPosition -- マウスがGutterの上を通る
    | MouseLeaveOpenEditorGutter -- マウスがGutterの上から離れる
    | EditorItemMsg { msg : EditorItemMsg, ref : EditorRef } -- 内包しているエディタへのMsg
    | EditorItemMsgToActive EditorItemMsg -- アクティブなエディタへのMsg
    | GrabVerticalGutter GutterVertical -- |垂直Gutterをつかむ
    | GrabHorizontalGutter GutterHorizontal -- -水平Gutterをつかむ
    | Focus -- フォーカスが当たる


type EditorItemMsg
    = EditorKeyConfigMsg Panel.Editor.EditorKeyConfig.Msg
    | ModuleEditorMsg Panel.Editor.Module.Msg


type OpenEditorPosition
    = OpenEditorPositionRightRow
    | OpenEditorPositionLeftBottom
    | OpenEditorPositionCenterBottom
    | OpenEditorPositionRightBottom


{-| EditorGroupから発生する外へのエミット
-}
type Emit
    = EmitVerticalGutterModeOn GutterVertical
    | EmitHorizontalGutterModeOn GutterHorizontal
    | EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String
    | EmitChangeName { name : Project.Source.Module.Def.Name.Name, index : Int, ref : Project.Source.ModuleRef }
    | EmitAddPartDef { ref : Project.Source.ModuleRef }
    | EmitChangeType { type_ : Project.Source.Module.Def.Type.Type, index : Int, ref : Project.Source.ModuleRef }


{-| 初期Model
-}
initModel : Model
initModel =
    Model
        { group =
            RowOne
                { columnGroup =
                    ColumnOne
                        { editor = ModuleEditor (Panel.Editor.Module.initModel Project.Source.SampleModule) }
                }
        , activeEditorRef = ( EditorRefLeft, EditorRefTop )
        , mouseOverOpenEditorPosition = Nothing
        }


{-| 開いていてかつ選択していてアクティブなエディタ(参照,種類)を取得する
-}
getActiveEditor : Model -> Panel.EditorTypeRef.EditorTypeRef
getActiveEditor model =
    case getEditorItem (getActiveEditorRef model) (getGroup model) of
        ProjectEditor _ ->
            Panel.EditorTypeRef.EditorProject Project.ProjectRoot

        DocumentEditor _ ->
            Panel.EditorTypeRef.EditorProject Project.Document

        ConfigEditor _ ->
            Panel.EditorTypeRef.EditorProject Project.Config

        SourceEditor _ ->
            Panel.EditorTypeRef.EditorProject Project.Source

        ModuleEditor editorModel ->
            Panel.EditorTypeRef.EditorProject (Project.Module (Panel.Editor.Module.getModuleRef editorModel))

        EditorKeyConfig _ ->
            Panel.EditorTypeRef.EditorKeyConfig


{-| テキストエリアにフォーカスが当たっているか。
当たっていたらKey.ArrowLeftなどのキー入力をpreventDefaultしない。ブラウザの基本機能(訂正など)を阻止しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi model =
    case getEditorItem (getActiveEditorRef model) (getGroup model) of
        ModuleEditor moduleEditorModel ->
            Panel.Editor.Module.isFocusDefaultUi moduleEditorModel

        _ ->
            Nothing



{- ====================== Update ====================== -}


update : Msg -> Project.Project -> Model -> ( Model, List Emit )
update msg project model =
    case msg of
        ChangeActiveEditor activeEditorRef ->
            let
                ( activedEiditorNewModel, activedEmit ) =
                    model
                        |> getGroup
                        |> getEditorItem (getActiveEditorRef model)
                        |> blurEditor project

                newModel =
                    model
                        |> mapGroup (setEditorItem (getActiveEditorRef model) activedEiditorNewModel)
                        |> setActiveEditorRef activeEditorRef
                        |> mouseLeaveAddGutter

                ( newEditorItem, emit ) =
                    newModel
                        |> getGroup
                        |> getEditorItem activeEditorRef
                        |> focusEditor project
            in
            ( newModel
                |> mapGroup (setEditorItem activeEditorRef newEditorItem)
            , [ activedEmit, emit ] |> List.concat
            )

        OpenEditor showEditorPosition ->
            ( case openEditor (getActiveEditorRef model) showEditorPosition (getGroup model) of
                ( newGroup, newActiveEditorRef ) ->
                    model
                        |> setGroup newGroup
                        |> setActiveEditorRef newActiveEditorRef
                        |> mouseLeaveAddGutter
            , []
            )

        CloseEditor hideEditorRef ->
            ( model
                |> mapGroup (closeEditor hideEditorRef)
                |> normalizeActiveEditorRef
                |> mouseLeaveAddGutter
            , []
            )

        MouseEnterOpenEditorGutter openEditorPosition ->
            ( mouseOverAddGutter openEditorPosition model
            , []
            )

        MouseLeaveOpenEditorGutter ->
            ( mouseLeaveAddGutter model
            , []
            )

        GrabHorizontalGutter gutter ->
            ( model
            , [ EmitHorizontalGutterModeOn gutter ]
            )

        GrabVerticalGutter gutter ->
            ( model
            , [ EmitVerticalGutterModeOn gutter ]
            )

        EditorItemMsg rec ->
            let
                ( newEditorItem, emit ) =
                    model
                        |> getGroup
                        |> getEditorItem rec.ref
                        |> updateEditor rec.msg project
            in
            ( model
                |> mapGroup (setEditorItem rec.ref newEditorItem)
            , emit
            )

        EditorItemMsgToActive editorItemmsg ->
            let
                ( newEditorItem, emit ) =
                    model
                        |> getGroup
                        |> getEditorItem (getActiveEditorRef model)
                        |> updateEditor editorItemmsg project
            in
            ( model
                |> mapGroup (setEditorItem (getActiveEditorRef model) newEditorItem)
            , emit
            )

        Focus ->
            let
                ( newEditorItem, emit ) =
                    model
                        |> getGroup
                        |> getEditorItem (getActiveEditorRef model)
                        |> focusEditor project
            in
            ( model
                |> mapGroup (setEditorItem (getActiveEditorRef model) newEditorItem)
            , emit
            )


focusEditor : Project.Project -> EditorItem -> ( EditorItem, List Emit )
focusEditor project editorItem =
    case editorItem of
        ModuleEditor model ->
            let
                ( newModel, emitMaybe ) =
                    Panel.Editor.Module.update Panel.Editor.Module.FocusThisEditor project model
            in
            ( ModuleEditor newModel
            , emitMaybe |> List.map moduleEditorEmitToEmit
            )

        _ ->
            ( editorItem, [] )


blurEditor : Project.Project -> EditorItem -> ( EditorItem, List Emit )
blurEditor project editorItem =
    case editorItem of
        ModuleEditor model ->
            let
                ( newModel, emitMaybe ) =
                    Panel.Editor.Module.update Panel.Editor.Module.BlurThisEditor project model
            in
            ( ModuleEditor newModel
            , emitMaybe |> List.map moduleEditorEmitToEmit
            )

        _ ->
            ( editorItem, [] )


updateEditor : EditorItemMsg -> Project.Project -> EditorItem -> ( EditorItem, List Emit )
updateEditor editorItemMsg project editorItem =
    case ( editorItemMsg, editorItem ) of
        ( ModuleEditorMsg msg, ModuleEditor model ) ->
            let
                ( newModel, emitList ) =
                    Panel.Editor.Module.update msg project model
            in
            ( ModuleEditor newModel
            , emitList |> List.map moduleEditorEmitToEmit
            )

        ( EditorKeyConfigMsg msg, EditorKeyConfig model ) ->
            let
                ( newModel, _ ) =
                    Panel.Editor.EditorKeyConfig.update msg model
            in
            ( EditorKeyConfig newModel
            , []
            )

        _ ->
            ( editorItem
            , []
            )


moduleEditorEmitToEmit : Panel.Editor.Module.Emit -> Emit
moduleEditorEmitToEmit emit =
    case emit of
        Panel.Editor.Module.EmitChangeReadMe { text, ref } ->
            EmitChangeReadMe { text = text, ref = ref }

        Panel.Editor.Module.EmitSetTextAreaValue text ->
            EmitSetTextAreaValue text

        Panel.Editor.Module.EmitChangeName { name, index, ref } ->
            EmitChangeName { name = name, index = index, ref = ref }

        Panel.Editor.Module.EmitAddPartDef { ref } ->
            EmitAddPartDef { ref = ref }

        Panel.Editor.Module.EmitChangeType { type_, index, ref } ->
            EmitChangeType { type_ = type_, index = index, ref = ref }


{-| 右端と下の端にある表示するエディタを増やすのボタンをおしたら、エディタ全体がどう変わるかと新しくアクティブになるエディタを返す
-}
openEditor : EditorRef -> OpenEditorPosition -> Group -> ( Group, EditorRef )
openEditor activeEditorRef showEditorPosition group =
    (case group of
        RowOne { columnGroup } ->
            openEditorRowOne
                columnGroup
                showEditorPosition
                (getEditorItem activeEditorRef group)

        RowTwo rec ->
            openEditorRowTwo
                rec
                showEditorPosition
                (getEditorItem activeEditorRef group)

        RowThree rec ->
            openEditorRowThree
                rec
                showEditorPosition
                (getEditorItem activeEditorRef group)
    )
        |> Maybe.withDefault ( group, activeEditorRef )


openEditorRowOne : ColumnGroup -> OpenEditorPosition -> EditorItem -> Maybe ( Group, EditorRef )
openEditorRowOne colGroup addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionRightRow ->
            Just
                ( RowTwo
                    { columnGroupLeft = colGroup
                    , columnGroupRight = ColumnOne { editor = item }
                    , columnGroupLeftWidth = 500
                    }
                , ( EditorRefCenter, EditorRefTop )
                )

        OpenEditorPositionLeftBottom ->
            case colGroup of
                ColumnOne { editor } ->
                    Just
                        ( RowOne
                            { columnGroup =
                                ColumnTwo
                                    { editorTop = editor
                                    , editorBottom = item
                                    , editorTopHeight = 500
                                    }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing


openEditorRowTwo :
    { columnGroupLeft : ColumnGroup
    , columnGroupRight : ColumnGroup
    , columnGroupLeftWidth : Int
    }
    -> OpenEditorPosition
    -> EditorItem
    -> Maybe ( Group, EditorRef )
openEditorRowTwo rec addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionRightRow ->
            Just
                ( RowThree
                    { columnGroupLeft = rec.columnGroupLeft
                    , columnGroupCenter = rec.columnGroupRight
                    , columnGroupRight = ColumnOne { editor = item }
                    , columnGroupLeftWidth = 333
                    , columnGroupCenterWidth = 333
                    }
                , ( EditorRefRight, EditorRefTop )
                )

        OpenEditorPositionLeftBottom ->
            case rec.columnGroupLeft of
                ColumnOne { editor } ->
                    Just
                        ( RowTwo
                            { rec
                                | columnGroupLeft =
                                    ColumnTwo
                                        { editorTop = editor
                                        , editorBottom = item
                                        , editorTopHeight = 500
                                        }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionCenterBottom ->
            case rec.columnGroupRight of
                ColumnOne { editor } ->
                    Just
                        ( RowTwo
                            { rec
                                | columnGroupRight =
                                    ColumnTwo
                                        { editorTop = editor
                                        , editorBottom = item
                                        , editorTopHeight = 500
                                        }
                            }
                        , ( EditorRefCenter, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing


openEditorRowThree :
    { columnGroupLeft : ColumnGroup
    , columnGroupCenter : ColumnGroup
    , columnGroupRight : ColumnGroup
    , columnGroupLeftWidth : Int
    , columnGroupCenterWidth : Int
    }
    -> OpenEditorPosition
    -> EditorItem
    -> Maybe ( Group, EditorRef )
openEditorRowThree rec addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionLeftBottom ->
            case rec.columnGroupLeft of
                ColumnOne { editor } ->
                    Just
                        ( RowThree
                            { rec
                                | columnGroupLeft =
                                    ColumnTwo
                                        { editorTop = editor
                                        , editorBottom = item
                                        , editorTopHeight = 500
                                        }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionCenterBottom ->
            case rec.columnGroupCenter of
                ColumnOne { editor } ->
                    Just
                        ( RowThree
                            { rec
                                | columnGroupCenter =
                                    ColumnTwo
                                        { editorTop = editor
                                        , editorBottom = item
                                        , editorTopHeight = 500
                                        }
                            }
                        , ( EditorRefCenter, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionRightBottom ->
            case rec.columnGroupRight of
                ColumnOne { editor } ->
                    Just
                        ( RowThree
                            { rec
                                | columnGroupRight =
                                    ColumnTwo
                                        { editorTop = editor
                                        , editorBottom = item
                                        , editorTopHeight = 500
                                        }
                            }
                        , ( EditorRefRight, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing



{- ==== Close Editor ==== -}


closeEditor : EditorRef -> Group -> Group
closeEditor editorRef group =
    case group of
        RowOne { columnGroup } ->
            case editorRef of
                ( EditorRefLeft, editorRefColumn ) ->
                    closeEditorColumn editorRefColumn columnGroup
                        |> Maybe.map (\col -> RowOne { columnGroup = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowTwo rec ->
            case Tuple.first editorRef of
                EditorRefLeft ->
                    closeEditorColumn (Tuple.second editorRef) rec.columnGroupLeft
                        |> Maybe.map (\col -> RowTwo { rec | columnGroupLeft = col })
                        |> Maybe.withDefault
                            (RowOne { columnGroup = rec.columnGroupRight })

                EditorRefCenter ->
                    closeEditorColumn (Tuple.second editorRef) rec.columnGroupRight
                        |> Maybe.map (\col -> RowTwo { rec | columnGroupRight = col })
                        |> Maybe.withDefault
                            (RowOne { columnGroup = rec.columnGroupLeft })

                _ ->
                    group

        RowThree rec ->
            case Tuple.first editorRef of
                EditorRefLeft ->
                    closeEditorColumn (Tuple.second editorRef) rec.columnGroupLeft
                        |> Maybe.map (\col -> RowThree { rec | columnGroupLeft = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { columnGroupLeft = rec.columnGroupCenter
                                , columnGroupRight = rec.columnGroupRight
                                , columnGroupLeftWidth = rec.columnGroupCenterWidth
                                }
                            )

                EditorRefCenter ->
                    closeEditorColumn (Tuple.second editorRef) rec.columnGroupCenter
                        |> Maybe.map (\col -> RowThree { rec | columnGroupCenter = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { columnGroupLeft = rec.columnGroupLeft
                                , columnGroupRight = rec.columnGroupRight
                                , columnGroupLeftWidth = rec.columnGroupLeftWidth
                                }
                            )

                EditorRefRight ->
                    closeEditorColumn (Tuple.second editorRef) rec.columnGroupRight
                        |> Maybe.map (\col -> RowThree { rec | columnGroupRight = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { columnGroupLeft = rec.columnGroupLeft
                                , columnGroupRight = rec.columnGroupCenter
                                , columnGroupLeftWidth = rec.columnGroupLeftWidth
                                }
                            )


closeEditorColumn : EditorRefColumn -> ColumnGroup -> Maybe ColumnGroup
closeEditorColumn editorRefColumn columnGroup =
    case ( editorRefColumn, columnGroup ) of
        ( _, ColumnOne _ ) ->
            Nothing

        ( EditorRefTop, ColumnTwo { editorBottom } ) ->
            Just (ColumnOne { editor = editorBottom })

        ( EditorRefBottom, ColumnTwo { editorTop } ) ->
            Just (ColumnOne { editor = editorTop })



{- ====================== マウスとGutter ====================== -}


{-| エディタ追加ガターの上にマウスがきた
-}
mouseOverAddGutter : OpenEditorPosition -> Model -> Model
mouseOverAddGutter openEditorPosition (Model rec) =
    Model
        { rec
            | mouseOverOpenEditorPosition = Just openEditorPosition
        }


{-| エディタ追加ガターからマウスが離れた
-}
mouseLeaveAddGutter : Model -> Model
mouseLeaveAddGutter (Model rec) =
    Model
        { rec
            | mouseOverOpenEditorPosition = Nothing
        }



{- ====================== Gutterでのリサイズ ====================== -}


{-| エディタで編集表示するものを変える
-}
changeActiveEditorResource : Panel.EditorTypeRef.EditorTypeRef -> Model -> Model
changeActiveEditorResource projectRef model =
    changeEditorItem (projectRefToEditorItem projectRef) model


{-| ←|→ VerticalGutterでリサイズをする
-}
resizeFromVerticalGutter : { mouseRelX : Int, editorWidth : Int } -> GutterVertical -> Model -> Model
resizeFromVerticalGutter { mouseRelX, editorWidth } gutter model =
    model
        |> mapGroup
            (resizeVertical
                { x = mouseRelX
                , width = editorWidth
                }
                gutter
            )


{-| ↔ 左右方向のリサイズ
-}
resizeVertical : { x : Int, width : Int } -> GutterVertical -> Group -> Group
resizeVertical { x, width } gutter group =
    case group of
        RowOne _ ->
            group

        -- 横に分割していないのにリサイズしようとしている
        RowTwo rec ->
            case gutter of
                GutterVerticalLeft ->
                    RowTwo
                        { rec
                            | columnGroupLeftWidth =
                                clamp 100 900 (x * 1002 // width - 1)
                        }

                GutterVerticalRight ->
                    group

        -- 横に2しか分割していないのに右側のガターでリサイズしようとしている
        RowThree rec ->
            case gutter of
                GutterVerticalLeft ->
                    let
                        leftWidth =
                            clamp 100 800 (x * 1002 // width - 1)
                    in
                    RowThree
                        { rec
                            | columnGroupLeftWidth =
                                leftWidth
                            , columnGroupCenterWidth =
                                max 100 (rec.columnGroupLeftWidth + rec.columnGroupCenterWidth - leftWidth)
                        }

                GutterVerticalRight ->
                    let
                        leftWidth =
                            clamp 200 900 (x * 1002 // width - 1)
                    in
                    RowThree
                        { rec
                            | columnGroupLeftWidth =
                                if leftWidth - rec.columnGroupLeftWidth < 100 then
                                    leftWidth - 100

                                else
                                    rec.columnGroupLeftWidth
                            , columnGroupCenterWidth =
                                max 100 (leftWidth - rec.columnGroupLeftWidth)
                        }


{-| ↑/↓ HorizontalGutterでリサイズする
-}
resizeFromHorizontalGutter : { mouseRelY : Int, editorHeight : Int } -> GutterHorizontal -> Model -> Model
resizeFromHorizontalGutter { mouseRelY, editorHeight } gutter model =
    model
        |> mapGroup
            (resizeHorizontal
                { y = mouseRelY
                , height = editorHeight
                }
                gutter
            )


{-| ↕ 縦方向のリサイズ
-}
resizeHorizontal : { y : Int, height : Int } -> GutterHorizontal -> Group -> Group
resizeHorizontal { y, height } gutter group =
    case group of
        RowOne rec ->
            case gutter of
                GutterHorizontalLeft ->
                    resizeInColumn rec.columnGroup y height
                        |> Maybe.map (\col -> RowOne { rec | columnGroup = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowTwo rec ->
            case gutter of
                GutterHorizontalLeft ->
                    resizeInColumn rec.columnGroupLeft y height
                        |> Maybe.map (\col -> RowTwo { rec | columnGroupLeft = col })
                        |> Maybe.withDefault group

                GutterHorizontalCenter ->
                    resizeInColumn rec.columnGroupRight y height
                        |> Maybe.map (\col -> RowTwo { rec | columnGroupRight = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowThree rec ->
            case gutter of
                GutterHorizontalLeft ->
                    resizeInColumn rec.columnGroupLeft y height
                        |> Maybe.map (\col -> RowThree { rec | columnGroupLeft = col })
                        |> Maybe.withDefault group

                GutterHorizontalCenter ->
                    resizeInColumn rec.columnGroupCenter y height
                        |> Maybe.map (\col -> RowThree { rec | columnGroupCenter = col })
                        |> Maybe.withDefault group

                GutterHorizontalRight ->
                    resizeInColumn rec.columnGroupRight y height
                        |> Maybe.map (\col -> RowThree { rec | columnGroupRight = col })
                        |> Maybe.withDefault group


resizeInColumn : ColumnGroup -> Int -> Int -> Maybe ColumnGroup
resizeInColumn columnGroup mouseRelY editorHeight =
    case columnGroup of
        ColumnOne _ ->
            Nothing

        ColumnTwo rec ->
            Just
                (ColumnTwo
                    { rec
                        | editorTopHeight = clamp 100 900 (mouseRelY * 1002 // editorHeight - 1)
                    }
                )



{- ======= グループ(エディタの集まり) ======== -}


getGroup : Model -> Group
getGroup (Model { group }) =
    group


setGroup : Group -> Model -> Model
setGroup rowGroup (Model rec) =
    Model
        { rec
            | group = rowGroup
        }


mapGroup : (Group -> Group) -> Model -> Model
mapGroup =
    Utility.Map.toMapper getGroup setGroup



{- =========  アクティブなエディタ位置 ========== -}


getActiveEditorRef : Model -> EditorRef
getActiveEditorRef (Model { activeEditorRef }) =
    activeEditorRef


setActiveEditorRefUnsafe : EditorRef -> Model -> Model
setActiveEditorRefUnsafe activeEditorRef (Model rec) =
    Model { rec | activeEditorRef = activeEditorRef }


{-| Activeなエディタを設定する。そのEditorRefが開かれていなければ、近くのものをActiveにする
-}
setActiveEditorRef : EditorRef -> Model -> Model
setActiveEditorRef ( rowRef, colRef ) model =
    model
        |> setActiveEditorRefUnsafe
            (case getGroup model of
                RowOne { columnGroup } ->
                    ( EditorRefLeft, adjustColumnRef columnGroup colRef )

                RowTwo { columnGroupLeft, columnGroupRight } ->
                    case rowRef of
                        EditorRefLeft ->
                            ( EditorRefLeft, adjustColumnRef columnGroupLeft colRef )

                        _ ->
                            ( EditorRefCenter, adjustColumnRef columnGroupRight colRef )

                RowThree { columnGroupLeft, columnGroupCenter, columnGroupRight } ->
                    case rowRef of
                        EditorRefLeft ->
                            ( EditorRefLeft, adjustColumnRef columnGroupLeft colRef )

                        EditorRefCenter ->
                            ( EditorRefCenter, adjustColumnRef columnGroupCenter colRef )

                        EditorRefRight ->
                            ( EditorRefRight, adjustColumnRef columnGroupRight colRef )
            )


{-| editorColumnRefが存在するエディタを参照できるようにする
-}
adjustColumnRef : ColumnGroup -> EditorRefColumn -> EditorRefColumn
adjustColumnRef columnGroup editorRefColumn =
    case columnGroup of
        ColumnOne _ ->
            EditorRefTop

        ColumnTwo _ ->
            editorRefColumn


mapActiveEditorRef : (EditorRef -> EditorRef) -> Model -> Model
mapActiveEditorRef =
    Utility.Map.toMapper getActiveEditorRef setActiveEditorRef


{-| アクティブなエディタが開かれていなければ、近くのものをActiveにする
-}
normalizeActiveEditorRef : Model -> Model
normalizeActiveEditorRef =
    mapActiveEditorRef identity


changeEditorItem : EditorItem -> Model -> Model
changeEditorItem item model =
    model
        |> mapGroup (setEditorItem (getActiveEditorRef model) item)


{-| [O][_][_]
エディタの位置を受け取って、エディタの中身(Modelとか)を返す
List.getAt: index -> list -> item 的な
-}
getEditorItem : EditorRef -> Group -> EditorItem
getEditorItem editorRef rowGroup =
    getEditorItemColumn (Tuple.second editorRef)
        (case rowGroup of
            RowOne { columnGroup } ->
                columnGroup

            RowTwo { columnGroupLeft, columnGroupRight } ->
                case Tuple.first editorRef of
                    EditorRefLeft ->
                        columnGroupLeft

                    _ ->
                        columnGroupRight

            RowThree { columnGroupLeft, columnGroupCenter, columnGroupRight } ->
                case Tuple.first editorRef of
                    EditorRefLeft ->
                        columnGroupLeft

                    EditorRefCenter ->
                        columnGroupCenter

                    EditorRefRight ->
                        columnGroupRight
        )


getEditorItemColumn : EditorRefColumn -> ColumnGroup -> EditorItem
getEditorItemColumn editorRefCol colGroup =
    case colGroup of
        ColumnOne { editor } ->
            editor

        ColumnTwo { editorTop, editorBottom } ->
            case editorRefCol of
                EditorRefTop ->
                    editorTop

                EditorRefBottom ->
                    editorBottom


{-| [O][_][_]
アクティブなエディタの位置とエディタの種類と列を受け取って新しい列を返す
-}
setEditorItem : EditorRef -> EditorItem -> Group -> Group
setEditorItem editorRef item group =
    case group of
        RowOne recRow ->
            RowOne
                (case editorRef of
                    ( EditorRefLeft, activeColumn ) ->
                        { recRow
                            | columnGroup =
                                setEditorItemColumn activeColumn item recRow.columnGroup
                        }

                    ( EditorRefCenter, activeColumn ) ->
                        { recRow
                            | columnGroup =
                                setEditorItemColumn activeColumn item recRow.columnGroup
                        }

                    ( EditorRefRight, activeColumn ) ->
                        { recRow
                            | columnGroup =
                                setEditorItemColumn activeColumn item recRow.columnGroup
                        }
                )

        RowTwo recRow ->
            RowTwo
                (case editorRef of
                    ( EditorRefLeft, activeColumn ) ->
                        { recRow
                            | columnGroupLeft =
                                setEditorItemColumn activeColumn item recRow.columnGroupLeft
                        }

                    ( EditorRefCenter, activeColumn ) ->
                        { recRow
                            | columnGroupRight =
                                setEditorItemColumn activeColumn item recRow.columnGroupRight
                        }

                    ( EditorRefRight, activeColumn ) ->
                        { recRow
                            | columnGroupRight =
                                setEditorItemColumn activeColumn item recRow.columnGroupRight
                        }
                )

        RowThree recRow ->
            RowThree
                (case editorRef of
                    ( EditorRefLeft, activeColumn ) ->
                        { recRow
                            | columnGroupLeft =
                                setEditorItemColumn activeColumn item recRow.columnGroupLeft
                        }

                    ( EditorRefCenter, activeColumn ) ->
                        { recRow
                            | columnGroupCenter =
                                setEditorItemColumn activeColumn item recRow.columnGroupCenter
                        }

                    ( EditorRefRight, activeColumn ) ->
                        { recRow
                            | columnGroupRight =
                                setEditorItemColumn activeColumn item recRow.columnGroupRight
                        }
                )


{-| 列グループとエディタの種類を受け取って新しい行を返す
-}
setEditorItemColumn : EditorRefColumn -> EditorItem -> ColumnGroup -> ColumnGroup
setEditorItemColumn editorRefCol item columnGroup =
    case columnGroup of
        ColumnOne recCol ->
            ColumnOne
                { recCol
                    | editor = item
                }

        ColumnTwo recCol ->
            ColumnTwo
                (case editorRefCol of
                    EditorRefTop ->
                        { recCol
                            | editorTop = item
                        }

                    EditorRefBottom ->
                        { recCol
                            | editorBottom = item
                        }
                )


{-| エディタの位置とエディタを加工する関数でGroupを更新する
-}
mapAtEditorItem : EditorRef -> (EditorItem -> EditorItem) -> Group -> Group
mapAtEditorItem ref =
    Utility.Map.toMapper
        (getEditorItem ref)
        (setEditorItem ref)


{-| データからエディタの初期値を返す
-}
projectRefToEditorItem : Panel.EditorTypeRef.EditorTypeRef -> EditorItem
projectRefToEditorItem projectRef =
    case projectRef of
        Panel.EditorTypeRef.EditorProject Project.ProjectRoot ->
            ProjectEditor Panel.Editor.Project.initModel

        Panel.EditorTypeRef.EditorProject Project.Document ->
            DocumentEditor Panel.Editor.Document.initModel

        Panel.EditorTypeRef.EditorProject Project.Config ->
            ConfigEditor Panel.Editor.Config.initModel

        Panel.EditorTypeRef.EditorProject Project.Source ->
            SourceEditor Panel.Editor.Source.initModel

        Panel.EditorTypeRef.EditorProject (Project.Module moduleRef) ->
            ModuleEditor (Panel.Editor.Module.initModel moduleRef)

        Panel.EditorTypeRef.EditorKeyConfig ->
            EditorKeyConfig Panel.Editor.EditorKeyConfig.initModel



{- ====================== View ====================== -}


view : Project.Project -> { width : Int, height : Int } -> Bool -> Maybe Gutter -> Model -> List (Html.Html Msg)
view project { width, height } isFocus gutter (Model { group, activeEditorRef, mouseOverOpenEditorPosition }) =
    (case group of
        RowOne { columnGroup } ->
            [ editorColumn
                project
                columnGroup
                { width = width - 2, height = height }
                OpenEditorPositionLeftBottom
                activeEditorRef
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                True
            , editorRowAddGutter
            ]

        RowTwo { columnGroupLeft, columnGroupRight, columnGroupLeftWidth } ->
            [ editorColumn
                project
                columnGroupLeft
                { width = (width - 4) * columnGroupLeftWidth // 1000, height = height }
                OpenEditorPositionLeftBottom
                activeEditorRef
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                False
            , verticalGutter
                GutterVerticalLeft
                (gutter == Just (GutterVertical GutterVerticalLeft))
            , editorColumn
                project
                columnGroupRight
                { width = (width - 4) * (1000 - columnGroupLeftWidth) // 1000, height = height }
                OpenEditorPositionCenterBottom
                activeEditorRef
                EditorRefCenter
                (gutter == Just (GutterHorizontal GutterHorizontalCenter))
                False
            , editorRowAddGutter
            ]

        RowThree { columnGroupLeft, columnGroupCenter, columnGroupRight, columnGroupLeftWidth, columnGroupCenterWidth } ->
            [ editorColumn
                project
                columnGroupLeft
                { width = (width - 4) * columnGroupLeftWidth // 1000, height = height }
                OpenEditorPositionLeftBottom
                activeEditorRef
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                False
            , verticalGutter
                GutterVerticalLeft
                (gutter == Just (GutterVertical GutterVerticalLeft))
            , editorColumn
                project
                columnGroupCenter
                { width = (width - 4) * columnGroupCenterWidth // 1000, height = height }
                OpenEditorPositionCenterBottom
                activeEditorRef
                EditorRefCenter
                (gutter == Just (GutterHorizontal GutterHorizontalCenter))
                False
            , verticalGutter
                GutterVerticalRight
                (gutter == Just (GutterVertical GutterVerticalRight))
            , editorColumn
                project
                columnGroupRight
                { width = (width - 4) * (1000 - columnGroupLeftWidth - columnGroupCenterWidth) // 1000, height = height }
                OpenEditorPositionRightBottom
                activeEditorRef
                EditorRefRight
                (gutter == Just (GutterHorizontal GutterHorizontalRight))
                False
            ]
    )
        ++ List.map (Html.map never)
            (case mouseOverOpenEditorPosition of
                Just openEditorPosition ->
                    [ openEditorButton { width = width, height = height } group openEditorPosition ]

                Nothing ->
                    []
            )


{-| | エディタの幅を変更するときにつかむガター
-}
verticalGutter : GutterVertical -> Bool -> Html.Html Msg
verticalGutter gutter isActive =
    Html.div
        [ Html.Attributes.class
            (if isActive then
                "gutter-vertical-active"

             else
                "gutter-vertical"
            )
        , Html.Events.onMouseDown (GrabVerticalGutter gutter)
        ]
        []


{-| 右端にある、エディタを横に追加するガター
-}
editorRowAddGutter : Html.Html Msg
editorRowAddGutter =
    Html.div
        [ Html.Attributes.class "gutter-vertical"
        , Html.Events.onClick (OpenEditor OpenEditorPositionRightRow)
        , Html.Events.onMouseEnter (MouseEnterOpenEditorGutter OpenEditorPositionRightRow)
        , Html.Events.onMouseLeave MouseLeaveOpenEditorGutter
        ]
        []


{-| エディタを追加する。ということが分かるようにするアイコン
-}
openEditorButton : { width : Int, height : Int } -> Group -> OpenEditorPosition -> Html.Html Never
openEditorButton { width, height } group openEditorPosition =
    let
        ( x, bottom ) =
            case openEditorPosition of
                OpenEditorPositionRightRow ->
                    ( width - 30
                    , height // 2 - 30
                    )

                OpenEditorPositionLeftBottom ->
                    ( case group of
                        RowOne _ ->
                            width // 2

                        RowTwo { columnGroupLeftWidth } ->
                            floor (toFloat width * toFloat columnGroupLeftWidth / 1000 / 2)

                        RowThree { columnGroupLeftWidth } ->
                            floor (toFloat width * toFloat columnGroupLeftWidth / 1000 / 2)
                    , 10
                    )

                OpenEditorPositionCenterBottom ->
                    ( case group of
                        RowOne _ ->
                            width // 2

                        RowTwo { columnGroupLeftWidth } ->
                            floor (toFloat width * toFloat ((1000 + columnGroupLeftWidth) // 2) / 1000)

                        RowThree { columnGroupLeftWidth, columnGroupCenterWidth } ->
                            floor (toFloat width * toFloat (columnGroupLeftWidth + columnGroupCenterWidth // 2) / 1000)
                    , 10
                    )

                OpenEditorPositionRightBottom ->
                    ( case group of
                        RowOne _ ->
                            width // 2

                        RowTwo { columnGroupLeftWidth } ->
                            floor (toFloat width * (toFloat (1000 - columnGroupLeftWidth) / 1000) / 2)

                        RowThree { columnGroupLeftWidth, columnGroupCenterWidth } ->
                            floor (toFloat width * (toFloat (1000 + columnGroupLeftWidth + columnGroupCenterWidth) / 1000 / 2))
                    , 10
                    )
    in
    Html.div
        [ Html.Attributes.class "editorGroupPanel-openEditorIcon"
        , Html.Attributes.style "left" (String.fromInt (x - 30) ++ "px")
        , Html.Attributes.style "bottom" (String.fromInt bottom ++ "px")
        ]
        [ NSvg.toHtml
            { x = 0, y = 0, width = 26, height = 26 }
            (([ NSvg.rect
                    { width = 24, height = 24 }
                    (NSvg.strokeColor Palette.X11.white)
                    NSvg.fillNone
              ]
                ++ (case openEditorPosition of
                        OpenEditorPositionRightRow ->
                            case group of
                                RowOne _ ->
                                    twoRowAddRight

                                RowTwo _ ->
                                    threeRowAddRight

                                RowThree _ ->
                                    []

                        _ ->
                            addBottom
                   )
             )
                |> List.map (NSvg.translate { x = 1, y = 1 })
            )
        ]


twoRowAddRight : List (NSvg.NSvg Never)
twoRowAddRight =
    [ NSvg.line ( 9, 0 ) ( 9, 24 ) (NSvg.strokeColor Palette.X11.white)
    , NSvg.line ( 7, 8 ) ( 7, 16 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 9, y = 0 }
    , NSvg.line ( 3, 12 ) ( 11, 12 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 9, y = 0 }
    ]


threeRowAddRight : List (NSvg.NSvg Never)
threeRowAddRight =
    [ NSvg.line ( 5, 0 ) ( 5, 24 ) (NSvg.strokeColor Palette.X11.white)
    , NSvg.line ( 11, 0 ) ( 11, 24 ) (NSvg.strokeColor Palette.X11.white)
    , NSvg.line ( 7, 8 ) ( 7, 16 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 11, y = 0 }
    , NSvg.line ( 3, 12 ) ( 11, 12 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 11, y = 0 }
    ]


addBottom : List (NSvg.NSvg Never)
addBottom =
    [ NSvg.line ( 0, 9 ) ( 24, 9 ) (NSvg.strokeColor Palette.X11.white)
    , NSvg.line ( 8, 7 ) ( 16, 7 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 0, y = 9 }
    , NSvg.line ( 12, 3 ) ( 12, 11 ) (NSvg.strokeColor Palette.X11.white)
        |> NSvg.translate { x = 0, y = 9 }
    ]


editorColumn : Project.Project -> ColumnGroup -> { width : Int, height : Int } -> OpenEditorPosition -> EditorRef -> EditorRefRow -> Bool -> Bool -> Html.Html Msg
editorColumn project columnGroup { width, height } showEditorPosition activeEditorRef editorRefRow isGutterActive isOne =
    Html.div
        [ subClass "column"
        , Html.Attributes.style "width" (String.fromInt width ++ "px")
        ]
        (case columnGroup of
            ColumnOne { editor } ->
                [ editorItemView
                    project
                    editor
                    { width = width, height = height - 2 }
                    ( editorRefRow, EditorRefTop )
                    (( editorRefRow, EditorRefTop ) == activeEditorRef)
                    isOne
                , editorColumnAddGutter showEditorPosition
                ]

            ColumnTwo { editorTop, editorBottom, editorTopHeight } ->
                [ editorItemView
                    project
                    editorTop
                    { width = width
                    , height = (height - 2) * editorTopHeight // 1000
                    }
                    ( editorRefRow, EditorRefTop )
                    (( editorRefRow, EditorRefTop ) == activeEditorRef)
                    False
                , horizontalGutter
                    (case editorRefRow of
                        EditorRefLeft ->
                            GutterHorizontalLeft

                        EditorRefCenter ->
                            GutterHorizontalCenter

                        EditorRefRight ->
                            GutterHorizontalRight
                    )
                    isGutterActive
                , editorItemView
                    project
                    editorBottom
                    { width = width
                    , height = (height - 2) * (1000 - editorTopHeight) // 1000
                    }
                    ( editorRefRow, EditorRefBottom )
                    (( editorRefRow, EditorRefBottom ) == activeEditorRef)
                    False
                ]
        )


{-|

  - エディタの高さを変更するガター

-}
horizontalGutter : GutterHorizontal -> Bool -> Html.Html Msg
horizontalGutter gutter isActive =
    Html.div
        [ Html.Attributes.class
            (if isActive then
                "gutter-horizontal-active"

             else
                "gutter-horizontal"
            )
        , Html.Events.onMouseDown (GrabHorizontalGutter gutter)
        ]
        []


{-| 下にある、エディタを下に追加するガター
-}
editorColumnAddGutter : OpenEditorPosition -> Html.Html Msg
editorColumnAddGutter showEditorPosition =
    Html.div
        [ Html.Attributes.class "gutter-horizontal"
        , Html.Events.onClick (OpenEditor showEditorPosition)
        , Html.Events.onMouseEnter (MouseEnterOpenEditorGutter showEditorPosition)
        , Html.Events.onMouseLeave MouseLeaveOpenEditorGutter
        ]
        []


{-| それぞれのエディタの表示
-}
editorItemView : Project.Project -> EditorItem -> { width : Int, height : Int } -> EditorRef -> Bool -> Bool -> Html.Html Msg
editorItemView project item { width, height } editorRef isActive isOne =
    let
        childItem : { title : String, body : List (Html.Html Msg) }
        childItem =
            case item of
                ProjectEditor _ ->
                    Panel.Editor.Project.view

                DocumentEditor _ ->
                    Panel.Editor.Document.view

                ConfigEditor _ ->
                    Panel.Editor.Config.view

                SourceEditor _ ->
                    Panel.Editor.Source.view

                ModuleEditor moduleEditorModel ->
                    let
                        viewItem =
                            Panel.Editor.Module.view project isActive moduleEditorModel
                    in
                    { title = viewItem.title
                    , body =
                        viewItem.body
                            |> List.map (Html.map (\m -> EditorItemMsg { msg = ModuleEditorMsg m, ref = editorRef }))
                    }

                EditorKeyConfig model ->
                    let
                        viewItem =
                            Panel.Editor.EditorKeyConfig.view model
                    in
                    { title = viewItem.title
                    , body =
                        viewItem.body
                            |> List.map (Html.map (\m -> EditorItemMsg { msg = EditorKeyConfigMsg m, ref = editorRef }))
                    }
    in
    Html.div
        ([ subClass
            (if isActive then
                "editor-active"

             else
                "editor"
            )
         , Html.Attributes.style "width" (String.fromInt width ++ "px")
         , Html.Attributes.style "height" (String.fromInt height ++ "px")
         ]
            ++ (if isActive then
                    []

                else
                    [ Html.Events.onClick (ChangeActiveEditor editorRef) ]
               )
        )
        ([ editorTitle
            childItem.title
            editorRef
            isOne
         ]
            ++ childItem.body
        )


{-| エディタのタイトル。closeableはパネルが1つのときにとじるボタンをなくすためにある
-}
editorTitle : String -> EditorRef -> Bool -> Html.Html Msg
editorTitle title editorRef closeable =
    Html.div
        [ subClass "editorTitle" ]
        ([ editorTitleText title
         ]
            ++ (if closeable then
                    []

                else
                    [ editorTitleCloseIcon editorRef ]
               )
        )


editorTitleText : String -> Html.Html Msg
editorTitleText title =
    Html.div [ subClass "editorTitle-text" ] [ Html.text title ]


editorTitleCloseIcon : EditorRef -> Html.Html Msg
editorTitleCloseIcon editorRef =
    Html.div
        [ Html.Events.onClick (CloseEditor editorRef)
        , subClass "editorTitle-closeIcon"
        ]
        [ NSvg.toHtml
            { x = 0, y = 0, width = 12, height = 12 }
            [ NSvg.line
                ( 1, 1 )
                ( 11, 11 )
                (NSvg.strokeColor Palette.X11.white)
            , NSvg.line
                ( 11, 1 )
                ( 1, 11 )
                (NSvg.strokeColor Palette.X11.white)
            ]
        ]


subClass : String -> Html.Attribute msg
subClass sub =
    Html.Attributes.class ("editorGroupPanel-" ++ sub)
