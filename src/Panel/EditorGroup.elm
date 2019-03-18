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
import Project.Source
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Utility.Map


{-| とりうる値を保持するModel
-}
type Model
    = Model
        { group : Group
        , activeEditorIndex : EditorIndex
        , mouseOverOpenEditorPosition : Maybe OpenEditorPosition
        }


{-| エディタを複数持つグループ
-}
type Group
    = RowOne
        { left : ColumnGroup
        }
    | RowTwo
        { left : ColumnGroup
        , center : ColumnGroup
        , leftWidth : Int -- MAX 1000
        }
    | RowThree
        { left : ColumnGroup
        , center : ColumnGroup
        , right : ColumnGroup
        , leftWidth : Int
        , centerWidth : Int -- LeftとCenterを足してMAX 1000
        }


{-| 1列には1つか2つのエディタを持つ
-}
type ColumnGroup
    = ColumnOne
        { top : EditorItem
        }
    | ColumnTwo
        { top : EditorItem
        , bottom : EditorItem
        , topHeight : Int -- Max 1000
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


{-| 最大6個のエディタのどれを指しているのかを示す
-}
type alias EditorIndex =
    ( EditorIndexRow, EditorIndexColumn )


{-| 横方向。左、真ん中、右
-}
type EditorIndexRow
    = EditorRefLeft
    | EditorRefCenter
    | EditorRefRight


{-| 縦方向。上、下
-}
type EditorIndexColumn
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
    = ChangeActiveEditor EditorIndex -- 他のエディタへアクティブなエディタを変更する
    | OpenEditor OpenEditorPosition -- エディタを表示する
    | CloseEditor EditorIndex -- エディタを削除する
    | MouseEnterOpenEditorGutter OpenEditorPosition -- マウスがGutterの上を通る
    | MouseLeaveOpenEditorGutter -- マウスがGutterの上から離れる
    | EditorItemMsg { msg : EditorItemMsg, ref : EditorIndex } -- 内包しているエディタへのMsg
    | EditorItemMsgToActive EditorItemMsg -- アクティブなエディタへのMsg
    | GrabVerticalGutter GutterVertical -- |垂直Gutterをつかむ
    | GrabHorizontalGutter GutterHorizontal -- -水平Gutterをつかむ
    | Focus -- フォーカスが当たる
    | Blur -- フォカスが外れる


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
    | EmitFocusEditTextAea
    | EmitChangeName { name : Name.Name, index : Int, ref : Project.Source.ModuleRef }
    | EmitAddPartDef { ref : Project.Source.ModuleRef }
    | EmitChangeType { type_ : Type.Type, index : Int, ref : Project.Source.ModuleRef }
    | EmitChangeExpr { expr : Expr.Expr, index : Int, ref : Project.Source.ModuleRef }


{-| 初期Model
-}
initModel : Model
initModel =
    Model
        { group =
            RowOne
                { left =
                    ColumnOne
                        { top = ModuleEditor (Panel.Editor.Module.initModel Project.Source.SampleModule) }
                }
        , activeEditorIndex = ( EditorRefLeft, EditorRefTop )
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
        ChangeActiveEditor activeEditorIndex ->
            updateChangeActiveEditor project activeEditorIndex model

        OpenEditor openEditorIndex ->
            ( case openEditor (getActiveEditorRef model) openEditorIndex (getGroup model) of
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

        EditorItemMsgToActive editorItemMsg ->
            let
                ( newEditorItem, emit ) =
                    model
                        |> getGroup
                        |> getEditorItem (getActiveEditorRef model)
                        |> updateEditor editorItemMsg project
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

        Blur ->
            let
                ( newEditorItem, emit ) =
                    model
                        |> getGroup
                        |> getEditorItem (getActiveEditorRef model)
                        |> blurEditor project
            in
            ( model
                |> mapGroup (setEditorItem (getActiveEditorRef model) newEditorItem)
            , emit
            )


updateChangeActiveEditor : Project.Project -> EditorIndex -> Model -> ( Model, List Emit )
updateChangeActiveEditor project index model =
    let
        ( beforeActiveEditorNewModel, beforeActiveEmit ) =
            model
                |> getGroup
                |> getEditorItem (getActiveEditorRef model)
                |> blurEditor project

        newModel =
            model
                |> mapGroup (setEditorItem (getActiveEditorRef model) beforeActiveEditorNewModel)
                |> setActiveEditorRef index
                |> mouseLeaveAddGutter

        ( newEditorItem, emit ) =
            newModel
                |> getGroup
                |> getEditorItem index
                |> focusEditor project
    in
    ( newModel
        |> mapGroup (setEditorItem index newEditorItem)
    , beforeActiveEmit ++ emit
    )


{-| エディタにフォーカスが当たったことを知らせて、新しいエディタとEmitを返す
-}
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


{-| エディタにフォーカスが外れたことを知らせて、新しいエディタとEmitを返す
-}
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


{-| モジュールエディタのEmitをEditorGroupのEmitに変換する
-}
moduleEditorEmitToEmit : Panel.Editor.Module.Emit -> Emit
moduleEditorEmitToEmit emit =
    case emit of
        Panel.Editor.Module.EmitChangeReadMe { text, ref } ->
            EmitChangeReadMe { text = text, ref = ref }

        Panel.Editor.Module.EmitSetTextAreaValue text ->
            EmitSetTextAreaValue text

        Panel.Editor.Module.EmitFocusEditTextAea ->
            EmitFocusEditTextAea

        Panel.Editor.Module.EmitChangeName { name, index, ref } ->
            EmitChangeName { name = name, index = index, ref = ref }

        Panel.Editor.Module.EmitAddPartDef { ref } ->
            EmitAddPartDef { ref = ref }

        Panel.Editor.Module.EmitChangeType { type_, index, ref } ->
            EmitChangeType { type_ = type_, index = index, ref = ref }

        Panel.Editor.Module.EmitChangeExpr { expr, index, ref } ->
            EmitChangeExpr { expr = expr, index = index, ref = ref }


{-| 右端と下の端にある表示するエディタを増やすのボタンをおしたら、エディタ全体がどう変わるかと新しくアクティブになるエディタを返す
-}
openEditor : EditorIndex -> OpenEditorPosition -> Group -> ( Group, EditorIndex )
openEditor activeEditorIndex showEditorPosition group =
    (case group of
        RowOne { left } ->
            openEditorRowOne
                left
                showEditorPosition
                (getEditorItem activeEditorIndex group)

        RowTwo rec ->
            openEditorRowTwo
                rec
                showEditorPosition
                (getEditorItem activeEditorIndex group)

        RowThree rec ->
            openEditorRowThree
                rec
                showEditorPosition
                (getEditorItem activeEditorIndex group)
    )
        |> Maybe.withDefault ( group, activeEditorIndex )


openEditorRowOne : ColumnGroup -> OpenEditorPosition -> EditorItem -> Maybe ( Group, EditorIndex )
openEditorRowOne column addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionRightRow ->
            Just
                ( RowTwo
                    { left = column
                    , center = ColumnOne { top = item }
                    , leftWidth = 500
                    }
                , ( EditorRefCenter, EditorRefTop )
                )

        OpenEditorPositionLeftBottom ->
            case column of
                ColumnOne { top } ->
                    Just
                        ( RowOne
                            { left =
                                ColumnTwo
                                    { top = top
                                    , bottom = item
                                    , topHeight = 500
                                    }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing


openEditorRowTwo :
    { left : ColumnGroup
    , center : ColumnGroup
    , leftWidth : Int
    }
    -> OpenEditorPosition
    -> EditorItem
    -> Maybe ( Group, EditorIndex )
openEditorRowTwo rec addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionRightRow ->
            Just
                ( RowThree
                    { left = rec.left
                    , center = rec.center
                    , right = ColumnOne { top = item }
                    , leftWidth = 333
                    , centerWidth = 333
                    }
                , ( EditorRefRight, EditorRefTop )
                )

        OpenEditorPositionLeftBottom ->
            case rec.left of
                ColumnOne { top } ->
                    Just
                        ( RowTwo
                            { rec
                                | left =
                                    ColumnTwo
                                        { top = top
                                        , bottom = item
                                        , topHeight = 500
                                        }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionCenterBottom ->
            case rec.center of
                ColumnOne { top } ->
                    Just
                        ( RowTwo
                            { rec
                                | center =
                                    ColumnTwo
                                        { top = top
                                        , bottom = item
                                        , topHeight = 500
                                        }
                            }
                        , ( EditorRefCenter, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing


openEditorRowThree :
    { left : ColumnGroup
    , center : ColumnGroup
    , right : ColumnGroup
    , leftWidth : Int
    , centerWidth : Int
    }
    -> OpenEditorPosition
    -> EditorItem
    -> Maybe ( Group, EditorIndex )
openEditorRowThree rec addEditorPosition item =
    case addEditorPosition of
        OpenEditorPositionLeftBottom ->
            case rec.left of
                ColumnOne { top } ->
                    Just
                        ( RowThree
                            { rec
                                | left =
                                    ColumnTwo
                                        { top = top
                                        , bottom = item
                                        , topHeight = 500
                                        }
                            }
                        , ( EditorRefLeft, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionCenterBottom ->
            case rec.center of
                ColumnOne { top } ->
                    Just
                        ( RowThree
                            { rec
                                | center =
                                    ColumnTwo
                                        { top = top
                                        , bottom = item
                                        , topHeight = 500
                                        }
                            }
                        , ( EditorRefCenter, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        OpenEditorPositionRightBottom ->
            case rec.right of
                ColumnOne { top } ->
                    Just
                        ( RowThree
                            { rec
                                | right =
                                    ColumnTwo
                                        { top = top
                                        , bottom = item
                                        , topHeight = 500
                                        }
                            }
                        , ( EditorRefRight, EditorRefBottom )
                        )

                ColumnTwo _ ->
                    Nothing

        _ ->
            Nothing


{-| エディタを閉じる
-}
closeEditor : EditorIndex -> Group -> Group
closeEditor index group =
    case group of
        RowOne rec ->
            case index of
                ( EditorRefLeft, editorRefColumn ) ->
                    closeEditorColumn editorRefColumn rec.left
                        |> Maybe.map (\col -> RowOne { rec | left = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowTwo rec ->
            case Tuple.first index of
                EditorRefLeft ->
                    closeEditorColumn (Tuple.second index) rec.left
                        |> Maybe.map (\col -> RowTwo { rec | left = col })
                        |> Maybe.withDefault
                            (RowOne { left = rec.center })

                EditorRefCenter ->
                    closeEditorColumn (Tuple.second index) rec.center
                        |> Maybe.map (\col -> RowTwo { rec | center = col })
                        |> Maybe.withDefault
                            (RowOne { left = rec.left })

                _ ->
                    group

        RowThree rec ->
            case Tuple.first index of
                EditorRefLeft ->
                    closeEditorColumn (Tuple.second index) rec.left
                        |> Maybe.map (\col -> RowThree { rec | left = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { left = rec.center
                                , center = rec.right
                                , leftWidth = rec.centerWidth
                                }
                            )

                EditorRefCenter ->
                    closeEditorColumn (Tuple.second index) rec.center
                        |> Maybe.map (\col -> RowThree { rec | center = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { left = rec.left
                                , center = rec.right
                                , leftWidth = rec.leftWidth
                                }
                            )

                EditorRefRight ->
                    closeEditorColumn (Tuple.second index) rec.right
                        |> Maybe.map (\col -> RowThree { rec | right = col })
                        |> Maybe.withDefault
                            (RowTwo
                                { left = rec.left
                                , center = rec.center
                                , leftWidth = rec.leftWidth
                                }
                            )


closeEditorColumn : EditorIndexColumn -> ColumnGroup -> Maybe ColumnGroup
closeEditorColumn editorRefColumn columnGroup =
    case ( editorRefColumn, columnGroup ) of
        ( _, ColumnOne _ ) ->
            Nothing

        ( EditorRefTop, ColumnTwo { bottom } ) ->
            Just (ColumnOne { top = bottom })

        ( EditorRefBottom, ColumnTwo { top } ) ->
            Just (ColumnOne { top = top })



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
                            | leftWidth =
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
                            | leftWidth =
                                leftWidth
                            , centerWidth =
                                max 100 (rec.leftWidth + rec.centerWidth - leftWidth)
                        }

                GutterVerticalRight ->
                    let
                        leftWidth =
                            clamp 200 900 (x * 1002 // width - 1)
                    in
                    RowThree
                        { rec
                            | leftWidth =
                                if leftWidth - rec.leftWidth < 100 then
                                    leftWidth - 100

                                else
                                    rec.leftWidth
                            , centerWidth =
                                max 100 (leftWidth - rec.leftWidth)
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
                    resizeInColumn rec.left y height
                        |> Maybe.map (\col -> RowOne { rec | left = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowTwo rec ->
            case gutter of
                GutterHorizontalLeft ->
                    resizeInColumn rec.left y height
                        |> Maybe.map (\col -> RowTwo { rec | left = col })
                        |> Maybe.withDefault group

                GutterHorizontalCenter ->
                    resizeInColumn rec.center y height
                        |> Maybe.map (\col -> RowTwo { rec | center = col })
                        |> Maybe.withDefault group

                _ ->
                    group

        RowThree rec ->
            case gutter of
                GutterHorizontalLeft ->
                    resizeInColumn rec.left y height
                        |> Maybe.map (\col -> RowThree { rec | left = col })
                        |> Maybe.withDefault group

                GutterHorizontalCenter ->
                    resizeInColumn rec.center y height
                        |> Maybe.map (\col -> RowThree { rec | center = col })
                        |> Maybe.withDefault group

                GutterHorizontalRight ->
                    resizeInColumn rec.right y height
                        |> Maybe.map (\col -> RowThree { rec | right = col })
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
                        | topHeight = clamp 100 900 (mouseRelY * 1002 // editorHeight - 1)
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


getActiveEditorRef : Model -> EditorIndex
getActiveEditorRef (Model { activeEditorIndex }) =
    activeEditorIndex


setActiveEditorRefUnsafe : EditorIndex -> Model -> Model
setActiveEditorRefUnsafe activeEditorIndex (Model rec) =
    Model { rec | activeEditorIndex = activeEditorIndex }


{-| Activeなエディタを設定する。そのEditorRefが開かれていなければ、近くのものをActiveにする
-}
setActiveEditorRef : EditorIndex -> Model -> Model
setActiveEditorRef ( rowRef, colRef ) model =
    model
        |> setActiveEditorRefUnsafe
            (case getGroup model of
                RowOne { left } ->
                    ( EditorRefLeft, adjustColumnRef left colRef )

                RowTwo { left, center } ->
                    case rowRef of
                        EditorRefLeft ->
                            ( EditorRefLeft, adjustColumnRef left colRef )

                        _ ->
                            ( EditorRefCenter, adjustColumnRef center colRef )

                RowThree { left, center, right } ->
                    case rowRef of
                        EditorRefLeft ->
                            ( EditorRefLeft, adjustColumnRef left colRef )

                        EditorRefCenter ->
                            ( EditorRefCenter, adjustColumnRef center colRef )

                        EditorRefRight ->
                            ( EditorRefRight, adjustColumnRef right colRef )
            )


{-| editorColumnRefが存在するエディタを参照できるようにする
-}
adjustColumnRef : ColumnGroup -> EditorIndexColumn -> EditorIndexColumn
adjustColumnRef columnGroup editorRefColumn =
    case columnGroup of
        ColumnOne _ ->
            EditorRefTop

        ColumnTwo _ ->
            editorRefColumn


mapActiveEditorRef : (EditorIndex -> EditorIndex) -> Model -> Model
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


{-| エディタの位置を受け取って、エディタの中身(Modelとか)を返す
-}
getEditorItem : EditorIndex -> Group -> EditorItem
getEditorItem editorRef rowGroup =
    getEditorItemColumn (Tuple.second editorRef)
        (case rowGroup of
            RowOne { left } ->
                left

            RowTwo { left, center } ->
                case Tuple.first editorRef of
                    EditorRefLeft ->
                        left

                    _ ->
                        center

            RowThree { left, center, right } ->
                case Tuple.first editorRef of
                    EditorRefLeft ->
                        left

                    EditorRefCenter ->
                        center

                    EditorRefRight ->
                        right
        )


getEditorItemColumn : EditorIndexColumn -> ColumnGroup -> EditorItem
getEditorItemColumn editorRefCol colGroup =
    case colGroup of
        ColumnOne { top } ->
            top

        ColumnTwo { top, bottom } ->
            case editorRefCol of
                EditorRefTop ->
                    top

                EditorRefBottom ->
                    bottom


{-| エディタの中身を上書きする。指定するエディタの位置がないものだったらその左や上を上書きする
-}
setEditorItem : EditorIndex -> EditorItem -> Group -> Group
setEditorItem editorRef item group =
    case group of
        RowOne recRow ->
            RowOne
                { recRow
                    | left =
                        setEditorItemColumn (Tuple.second editorRef) item recRow.left
                }

        RowTwo recRow ->
            RowTwo
                (case Tuple.first editorRef of
                    EditorRefLeft ->
                        { recRow
                            | left =
                                setEditorItemColumn (Tuple.second editorRef) item recRow.left
                        }

                    _ ->
                        { recRow
                            | center =
                                setEditorItemColumn (Tuple.second editorRef) item recRow.center
                        }
                )

        RowThree recRow ->
            RowThree
                (case Tuple.first editorRef of
                    EditorRefLeft ->
                        { recRow
                            | left =
                                setEditorItemColumn (Tuple.second editorRef) item recRow.left
                        }

                    EditorRefCenter ->
                        { recRow
                            | center =
                                setEditorItemColumn (Tuple.second editorRef) item recRow.center
                        }

                    EditorRefRight ->
                        { recRow
                            | right =
                                setEditorItemColumn (Tuple.second editorRef) item recRow.right
                        }
                )


setEditorItemColumn : EditorIndexColumn -> EditorItem -> ColumnGroup -> ColumnGroup
setEditorItemColumn editorRefCol item columnGroup =
    case columnGroup of
        ColumnOne recCol ->
            ColumnOne { recCol | top = item }

        ColumnTwo recCol ->
            ColumnTwo
                (case editorRefCol of
                    EditorRefTop ->
                        { recCol | top = item }

                    EditorRefBottom ->
                        { recCol | bottom = item }
                )


{-| エディタの位置とエディタを加工する関数でGroupを更新する
-}
mapAtEditorItem : EditorIndex -> (EditorItem -> EditorItem) -> Group -> Group
mapAtEditorItem ref =
    Utility.Map.toMapper
        (getEditorItem ref)
        (setEditorItem ref)


{-| 編集対象からエディタの初期値を返す
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
view project { width, height } isFocus gutter (Model { group, activeEditorIndex, mouseOverOpenEditorPosition }) =
    let
        ( activeEditorRow, activeEditorColumn ) =
            activeEditorIndex
    in
    (case group of
        RowOne { left } ->
            [ editorColumn
                project
                left
                { width = width - 2, height = height }
                OpenEditorPositionLeftBottom
                (Just activeEditorColumn)
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                True
            , editorRowAddGutter
            ]

        RowTwo { left, center, leftWidth } ->
            [ editorColumn
                project
                left
                { width = (width - 4) * leftWidth // 1000, height = height }
                OpenEditorPositionLeftBottom
                (case activeEditorRow of
                    EditorRefLeft ->
                        Just activeEditorColumn

                    _ ->
                        Nothing
                )
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                False
            , verticalGutter
                GutterVerticalLeft
                (gutter == Just (GutterVertical GutterVerticalLeft))
            , editorColumn
                project
                center
                { width = (width - 4) * (1000 - leftWidth) // 1000, height = height }
                OpenEditorPositionCenterBottom
                (case activeEditorRow of
                    EditorRefLeft ->
                        Nothing

                    _ ->
                        Just activeEditorColumn
                )
                EditorRefCenter
                (gutter == Just (GutterHorizontal GutterHorizontalCenter))
                False
            , editorRowAddGutter
            ]

        RowThree { left, center, right, leftWidth, centerWidth } ->
            [ editorColumn
                project
                left
                { width = (width - 4) * leftWidth // 1000, height = height }
                OpenEditorPositionLeftBottom
                (case activeEditorRow of
                    EditorRefLeft ->
                        Just activeEditorColumn

                    EditorRefCenter ->
                        Nothing

                    EditorRefRight ->
                        Nothing
                )
                EditorRefLeft
                (gutter == Just (GutterHorizontal GutterHorizontalLeft))
                False
            , verticalGutter
                GutterVerticalLeft
                (gutter == Just (GutterVertical GutterVerticalLeft))
            , editorColumn
                project
                center
                { width = (width - 4) * centerWidth // 1000, height = height }
                OpenEditorPositionCenterBottom
                (case activeEditorRow of
                    EditorRefLeft ->
                        Nothing

                    EditorRefCenter ->
                        Just activeEditorColumn

                    EditorRefRight ->
                        Nothing
                )
                EditorRefCenter
                (gutter == Just (GutterHorizontal GutterHorizontalCenter))
                False
            , verticalGutter
                GutterVerticalRight
                (gutter == Just (GutterVertical GutterVerticalRight))
            , editorColumn
                project
                right
                { width = (width - 4) * (1000 - leftWidth - centerWidth) // 1000, height = height }
                OpenEditorPositionRightBottom
                (case activeEditorRow of
                    EditorRefLeft ->
                        Nothing

                    EditorRefCenter ->
                        Nothing

                    EditorRefRight ->
                        Just activeEditorColumn
                )
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

                        RowTwo { leftWidth } ->
                            floor (toFloat width * toFloat leftWidth / 1000 / 2)

                        RowThree { leftWidth } ->
                            floor (toFloat width * toFloat leftWidth / 1000 / 2)
                    , 10
                    )

                OpenEditorPositionCenterBottom ->
                    ( case group of
                        RowOne _ ->
                            width // 2

                        RowTwo { leftWidth } ->
                            floor (toFloat width * toFloat ((1000 + leftWidth) // 2) / 1000)

                        RowThree { leftWidth, centerWidth } ->
                            floor (toFloat width * toFloat (leftWidth + centerWidth // 2) / 1000)
                    , 10
                    )

                OpenEditorPositionRightBottom ->
                    ( case group of
                        RowOne _ ->
                            width // 2

                        RowTwo { leftWidth } ->
                            floor (toFloat width * (toFloat (1000 - leftWidth) / 1000) / 2)

                        RowThree { leftWidth, centerWidth } ->
                            floor (toFloat width * (toFloat (1000 + leftWidth + centerWidth) / 1000 / 2))
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


{-| エディタの縦に2つ並んでいるか1つの表示
-}
editorColumn : Project.Project -> ColumnGroup -> { width : Int, height : Int } -> OpenEditorPosition -> Maybe EditorIndexColumn -> EditorIndexRow -> Bool -> Bool -> Html.Html Msg
editorColumn project columnGroup { width, height } openEditorPosition activeEditorIndexColumnMaybe editorRefRow isGutterActive isOne =
    Html.div
        [ subClass "column"
        , Html.Attributes.style "width" (String.fromInt width ++ "px")
        ]
        (case columnGroup of
            ColumnOne { top } ->
                [ editorItemView
                    { project = project
                    , editorItem = top
                    , editorIndex = ( editorRefRow, EditorRefTop )
                    , width = width
                    , height = height - 2
                    , isActive = Just EditorRefTop == activeEditorIndexColumnMaybe
                    , isOne = isOne
                    }
                , editorColumnAddGutter openEditorPosition
                ]

            ColumnTwo { top, bottom, topHeight } ->
                [ editorItemView
                    { project = project
                    , editorItem = top
                    , editorIndex = ( editorRefRow, EditorRefTop )
                    , width = width
                    , height = (height - 2) * topHeight // 1000
                    , isActive = Just EditorRefTop == activeEditorIndexColumnMaybe
                    , isOne = False
                    }
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
                    { project = project
                    , editorItem = bottom
                    , editorIndex = ( editorRefRow, EditorRefBottom )
                    , width = width
                    , height = (height - 2) * (1000 - topHeight) // 1000
                    , isActive = Just EditorRefBottom == activeEditorIndexColumnMaybe
                    , isOne = False
                    }
                ]
        )


{-| エディタの高さを変更するガター
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
editorItemView : { project : Project.Project, editorItem : EditorItem, editorIndex : EditorIndex, width : Int, height : Int, isActive : Bool, isOne : Bool } -> Html.Html Msg
editorItemView { project, editorItem, editorIndex, width, height, isActive, isOne } =
    let
        childItem : { title : String, body : List (Html.Html Msg) }
        childItem =
            case editorItem of
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
                            |> List.map (Html.map (\m -> EditorItemMsg { msg = ModuleEditorMsg m, ref = editorIndex }))
                    }

                EditorKeyConfig model ->
                    let
                        viewItem =
                            Panel.Editor.EditorKeyConfig.view model
                    in
                    { title = viewItem.title
                    , body =
                        viewItem.body
                            |> List.map (Html.map (\m -> EditorItemMsg { msg = EditorKeyConfigMsg m, ref = editorIndex }))
                    }
    in
    Html.div
        ([ subClassList [ ( "editor", True ), ( "editor--active", isActive ) ]
         , Html.Attributes.style "width" (String.fromInt width ++ "px")
         , Html.Attributes.style "height" (String.fromInt height ++ "px")
         ]
            ++ (if isActive then
                    []

                else
                    [ Html.Events.onClick (ChangeActiveEditor editorIndex) ]
               )
        )
        [ editorTitle
            childItem.title
            editorIndex
            isOne
        , Html.div
            [ subClass "editorBody" ]
            childItem.body
        ]


{-| エディタのタイトル。closeableはパネルが1つのときにとじるボタンをなくすためにある
-}
editorTitle : String -> EditorIndex -> Bool -> Html.Html Msg
editorTitle title editorRef closeable =
    Html.div
        [ subClass "editorTitle" ]
        ([ Html.div [ subClass "editorTitle-text" ] [ Html.text title ]
         ]
            ++ (if closeable then
                    []

                else
                    [ editorTitleCloseIcon editorRef ]
               )
        )


{-| エディタを閉じるときに押すボタン
-}
editorTitleCloseIcon : EditorIndex -> Html.Html Msg
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


subClassList : List ( String, Bool ) -> Html.Attribute msg
subClassList list =
    list
        |> List.map (Tuple.mapFirst (\sub -> "editorGroupPanel-" ++ sub))
        |> Html.Attributes.classList
