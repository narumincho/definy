module Panel.Tree exposing
    ( Emit(..)
    , Model
    , Msg(..)
    , initModel
    , update
    , view
    )

{-| 画面左側に表示されるパネルで、モジュールのツリーを表示する。プロジェクトのモジュールの階層構造を変えるとこができる
-}

import Color
import Html
import Html.Attributes
import Html.Events
import Label
import Palette.X11
import Panel.EditorItemSource
import Project
import Project.ModuleDefinitionIndex
import Utility.ListExtra
import Utility.Map
import Utility.NSvg as NSvg


{-| とりうる状態を保持するModel
ツリーの開閉状態を保持する
-}
type Model
    = Model
        { openCloseData : OpenCloseData
        }


{-| ツリーが開いているか閉じているを保持するデータ
-}
type OpenCloseData
    = OpenCloseData
        { isProjectRootOpen : Bool
        , isModuleDefinitionOpen : Bool
        }


{-| Panel作成時の初期Model
-}
initModel : Model
initModel =
    Model
        { openCloseData =
            OpenCloseData
                { isProjectRootOpen = True
                , isModuleDefinitionOpen = True
                }
        }


getOpenCloseData : Model -> OpenCloseData
getOpenCloseData (Model { openCloseData }) =
    openCloseData


setOpenCloseData : OpenCloseData -> Model -> Model
setOpenCloseData openCloseData (Model rec) =
    Model
        { rec
            | openCloseData = openCloseData
        }


mapOpenCloseData : (OpenCloseData -> OpenCloseData) -> Model -> Model
mapOpenCloseData =
    Utility.Map.toMapper
        getOpenCloseData
        setOpenCloseData


{-| 指定したエディタRefの表示が開いているか
-}
isTreeOpen : Panel.EditorItemSource.EditorItemSource -> OpenCloseData -> Bool
isTreeOpen projectRef (OpenCloseData { isProjectRootOpen, isModuleDefinitionOpen }) =
    case projectRef of
        Panel.EditorItemSource.ProjectRoot ->
            isProjectRootOpen

        Panel.EditorItemSource.ModuleDefinition ->
            isModuleDefinitionOpen

        _ ->
            False


{-| 指定したエディタRefの表示を開く
-}
openTree : Panel.EditorItemSource.EditorItemSource -> OpenCloseData -> OpenCloseData
openTree editorRef (OpenCloseData rec) =
    case editorRef of
        Panel.EditorItemSource.ProjectRoot ->
            OpenCloseData
                { rec
                    | isProjectRootOpen = True
                }

        Panel.EditorItemSource.ModuleDefinition ->
            OpenCloseData
                { rec
                    | isModuleDefinitionOpen = True
                }

        _ ->
            OpenCloseData rec


{-| 指定したエディタRefの表示を閉じる
-}
closeTree : Panel.EditorItemSource.EditorItemSource -> OpenCloseData -> OpenCloseData
closeTree editorRef (OpenCloseData rec) =
    case editorRef of
        Panel.EditorItemSource.ProjectRoot ->
            OpenCloseData
                { rec
                    | isProjectRootOpen = False
                }

        Panel.EditorItemSource.ModuleDefinition ->
            OpenCloseData
                { rec
                    | isModuleDefinitionOpen = False
                }

        _ ->
            OpenCloseData rec


{-| フォーカスがあたっているときに持てる状態
-}
type FocusModel
    = FocusModel { isNewModuleNameInputMode : Bool }


{-| TreePanelが受け取るMsg
-}
type Msg
    = TreeOpen Panel.EditorItemSource.EditorItemSource
    | TreeClose Panel.EditorItemSource.EditorItemSource
    | SelectUp -- デフォルトで↑キーの操作
    | SelectDown -- デフォルトで↓キーの操作
    | SelectParentOrTreeClose -- デフォルトで←キーの操作
    | SelectFirstChildOrTreeOpen -- デフォルトで→キーの操作
    | ToFocusEditorPanel -- デフォルトでEnterの動作
    | OpenEditor Panel.EditorItemSource.EditorItemSource -- エディタを開く
    | SelectAndOpenKeyConfig -- キーコンフィッグを選択して開く
    | CloseSidePanel -- サイドパネルを閉じる


{-| 全体に送るメッセージ
-}
type Emit
    = EmitFocusToEditorGroup -- エディタグループにフォーカスを移動
    | EmitOpenEditor Panel.EditorItemSource.EditorItemSource -- エディタを開く
    | EmitCloseSidePanel



{- ====================== Update ====================== -}


{-| ツリーパネルを更新する
メッセージとモデルと親から情報を受け取り、新しいモデルと親へのエミット
-}
update : Msg -> Panel.EditorItemSource.EditorItemSource -> Project.Project -> Model -> ( Model, List Emit )
update msg editorRef project model =
    case msg of
        TreeOpen ref ->
            ( model |> mapOpenCloseData (openTree ref)
            , []
            )

        TreeClose ref ->
            ( model |> mapOpenCloseData (closeTree ref)
            , []
            )

        SelectUp ->
            ( model
            , [ EmitOpenEditor (selectUp project (getOpenCloseData model) editorRef) ]
            )

        SelectDown ->
            ( model
            , [ EmitOpenEditor (selectDown project (getOpenCloseData model) editorRef) ]
            )

        SelectParentOrTreeClose ->
            if isTreeOpen editorRef (getOpenCloseData model) then
                ( model |> mapOpenCloseData (closeTree editorRef)
                , []
                )

            else
                ( model
                , [ EmitOpenEditor (selectToParent project (getOpenCloseData model) editorRef) ]
                )

        SelectFirstChildOrTreeOpen ->
            if isTreeOpen editorRef (getOpenCloseData model) then
                ( model
                , [ EmitOpenEditor (selectDown project (getOpenCloseData model) editorRef) ]
                )

            else
                ( model |> mapOpenCloseData (openTree editorRef)
                , []
                )

        ToFocusEditorPanel ->
            ( model
            , [ EmitFocusToEditorGroup ]
            )

        OpenEditor projectRef ->
            ( model
            , [ EmitOpenEditor projectRef ]
            )

        SelectAndOpenKeyConfig ->
            ( model
            , [ EmitOpenEditor Panel.EditorItemSource.EditorKeyConfig ]
            )

        CloseSidePanel ->
            ( model
            , [ EmitCloseSidePanel ]
            )


type SelectUpResult
    = UpNoExistThisTree
    | UpPrevious Panel.EditorItemSource.EditorItemSource
    | UpExist Panel.EditorItemSource.EditorItemSource


{-| 上を選択する
-}
selectUp : Project.Project -> OpenCloseData -> Panel.EditorItemSource.EditorItemSource -> Panel.EditorItemSource.EditorItemSource
selectUp project openCloseData selectedRef =
    case selectUpListLoop ( Nothing, simpleProjectTree project openCloseData ) selectedRef of
        UpNoExistThisTree ->
            Panel.EditorItemSource.ProjectRoot

        UpPrevious ref ->
            ref

        UpExist ref ->
            ref


selectUpLoop : SimpleTree -> Panel.EditorItemSource.EditorItemSource -> SelectUpResult
selectUpLoop (SimpleTree { editorRef, children }) target =
    if editorRef == target then
        UpPrevious editorRef

    else
        case selectUpListLoop ( Nothing, childrenToList children ) target of
            UpNoExistThisTree ->
                UpNoExistThisTree

            UpPrevious _ ->
                UpExist editorRef

            UpExist ref ->
                UpExist ref


selectUpListLoop : ( Maybe SimpleTree, List SimpleTree ) -> Panel.EditorItemSource.EditorItemSource -> SelectUpResult
selectUpListLoop ( prev, list ) target =
    case list of
        [] ->
            UpNoExistThisTree

        x :: xs ->
            case selectUpLoop x target of
                UpNoExistThisTree ->
                    selectUpListLoop ( Just x, xs ) target

                UpPrevious pe ->
                    case prev of
                        Just p ->
                            UpExist (getTailRef p)

                        Nothing ->
                            UpPrevious pe

                UpExist ref ->
                    UpExist ref


getTailRef : SimpleTree -> Panel.EditorItemSource.EditorItemSource
getTailRef (SimpleTree { editorRef, children }) =
    case children of
        ChildrenNone ->
            editorRef

        ChildrenClose ->
            editorRef

        ChildrenOpen ( x, xs ) ->
            Utility.ListExtra.last xs
                |> Maybe.withDefault x
                |> getTailRef


type SelectDownResult
    = DownExist Panel.EditorItemSource.EditorItemSource
    | DownNext Panel.EditorItemSource.EditorItemSource
    | DownNoExistThisTree


{-| 下を選択する
-}
selectDown : Project.Project -> OpenCloseData -> Panel.EditorItemSource.EditorItemSource -> Panel.EditorItemSource.EditorItemSource
selectDown project openCloseData selectedRef =
    case selectDownListLoop (simpleProjectTree project openCloseData) selectedRef of
        DownExist ref ->
            ref

        DownNext ref ->
            ref

        DownNoExistThisTree ->
            Panel.EditorItemSource.ProjectRoot


selectDownLoop : SimpleTree -> Panel.EditorItemSource.EditorItemSource -> SelectDownResult
selectDownLoop (SimpleTree { editorRef, children }) target =
    if target == editorRef then
        case children of
            ChildrenNone ->
                DownNext editorRef

            ChildrenClose ->
                DownNext editorRef

            ChildrenOpen ( x, xs ) ->
                DownExist (simpleTreeGetEditorRef x)

    else
        case children of
            ChildrenNone ->
                DownNoExistThisTree

            ChildrenClose ->
                DownNoExistThisTree

            ChildrenOpen ( x, xs ) ->
                selectDownListLoop (x :: xs) target


selectDownListLoop : List SimpleTree -> Panel.EditorItemSource.EditorItemSource -> SelectDownResult
selectDownListLoop list target =
    case list of
        [] ->
            DownNoExistThisTree

        x :: xs ->
            case selectDownLoop x target of
                DownExist t ->
                    DownExist t

                DownNext t ->
                    case xs of
                        y :: _ ->
                            DownExist (simpleTreeGetEditorRef y)

                        [] ->
                            DownNext t

                DownNoExistThisTree ->
                    selectDownListLoop xs target


{-| 親を選択する
-}
selectToParent : Project.Project -> OpenCloseData -> Panel.EditorItemSource.EditorItemSource -> Panel.EditorItemSource.EditorItemSource
selectToParent project openCloseData selectedRef =
    case selectToParentLoop (simpleProjectTree project openCloseData) selectedRef of
        Just ref ->
            ref

        Nothing ->
            Panel.EditorItemSource.ProjectRoot


selectToParentLoop : List SimpleTree -> Panel.EditorItemSource.EditorItemSource -> Maybe Panel.EditorItemSource.EditorItemSource
selectToParentLoop list target =
    case list of
        [] ->
            Nothing

        x :: xs ->
            if isExistInChildren x target then
                Just (simpleTreeGetEditorRef x)

            else
                let
                    (SimpleTree { children }) =
                        x
                in
                case selectToParentLoop (childrenToList children) target of
                    Just ref ->
                        Just ref

                    Nothing ->
                        selectToParentLoop xs target


isExistInChildren : SimpleTree -> Panel.EditorItemSource.EditorItemSource -> Bool
isExistInChildren (SimpleTree { children }) target =
    case children of
        ChildrenNone ->
            False

        ChildrenClose ->
            False

        ChildrenOpen ( x, xs ) ->
            List.any (simpleTreeGetEditorRef >> (==) target) (x :: xs)



{- ==================================================
                       View
   ====================================================
-}


{-| ModuleTreePanelの表示
-}
view :
    { project : Project.Project
    , editorRef : Panel.EditorItemSource.EditorItemSource
    , width : Int
    , model : Model
    , focus : Bool
    }
    -> List (Html.Html Msg)
view { project, editorRef, model, focus, width } =
    if 100 < width then
        [ viewTitle ]
            ++ viewTree
                { project = project
                , editorRef = editorRef
                , focus = focus
                , width = width
                }
                model

    else
        []


{-| ツリービューのタイトル
-}
viewTitle : Html.Html Msg
viewTitle =
    Html.div
        [ treePanelClass "title-area" ]
        [ Html.div
            [ treePanelClass "title" ]
            [ Html.text "Definy" ]
        , Html.button
            [ Html.Events.onClick CloseSidePanel
            , treePanelClass "closeButton"
            ]
            [ Html.text "◀" ]
        ]


{-| ツリービュー本体
-}
viewTree : { project : Project.Project, editorRef : Panel.EditorItemSource.EditorItemSource, focus : Bool, width : Int } -> Model -> List (Html.Html Msg)
viewTree { project, editorRef, focus, width } model =
    projectToProjectTree project editorRef focus (getOpenCloseData model)
        |> List.map (viewTreeItem focus)


projectToProjectTree : Project.Project -> Panel.EditorItemSource.EditorItemSource -> Bool -> OpenCloseData -> List EditorTree
projectToProjectTree project editorRef isFocus openCloseData =
    simpleProjectTree project openCloseData
        |> List.map (makeEditorTree isFocus editorRef)


{-| プロジェクトを木構造にする
-}
simpleProjectTree : Project.Project -> OpenCloseData -> List SimpleTree
simpleProjectTree project openCloseData =
    baseTree project
        |> List.map (baseTreeToSimpleProjectTree openCloseData)


makeEditorTree : Bool -> Panel.EditorItemSource.EditorItemSource -> SimpleTree -> EditorTree
makeEditorTree isFocus selectRef (SimpleTree { editorRef, children, icon, label }) =
    EditorTree
        { icon = icon
        , label = label
        , editorRef = editorRef
        , option = []
        , viewType = makeViewType (editorRef == selectRef) isFocus
        , children =
            case children of
                ChildrenOpen ( x, xs ) ->
                    ChildrenOpen
                        ( makeEditorTree isFocus selectRef x
                        , xs |> List.map (makeEditorTree isFocus selectRef)
                        )

                ChildrenClose ->
                    ChildrenClose

                ChildrenNone ->
                    ChildrenNone
        }


baseTreeToSimpleProjectTree : OpenCloseData -> BaseTree -> SimpleTree
baseTreeToSimpleProjectTree openCloseData (BaseTree { editorRef, label, icon, children }) =
    SimpleTree
        { editorRef = editorRef
        , label = label
        , icon = icon
        , children =
            case children of
                [] ->
                    ChildrenNone

                x :: xs ->
                    if isTreeOpen editorRef openCloseData then
                        ChildrenOpen
                            ( baseTreeToSimpleProjectTree openCloseData x
                            , xs |> List.map (baseTreeToSimpleProjectTree openCloseData)
                            )

                    else
                        ChildrenClose
        }


baseTree : Project.Project -> List BaseTree
baseTree project =
    [ BaseTree
        { editorRef = Panel.EditorItemSource.ProjectRoot
        , label = Label.toCapitalString (Project.getName project)
        , icon = defaultProjectIcon
        , children =
            [ BaseTree
                { editorRef = Panel.EditorItemSource.Document
                , label = "Document"
                , icon = documentIcon
                , children = []
                }
            , BaseTree
                { editorRef = Panel.EditorItemSource.ProjectImport
                , label = "Project Import"
                , icon = configIcon
                , children =
                    [ BaseTree
                        { editorRef = Panel.EditorItemSource.ProjectRoot
                        , label = "Core Project"
                        , icon = defaultProjectIcon
                        , children = []
                        }
                    ]
                }
            , BaseTree
                { editorRef = Panel.EditorItemSource.ModuleDefinition
                , label = "Module Definition"
                , icon = sourceIcon
                , children =
                    [ BaseTree
                        { editorRef = Panel.EditorItemSource.Module Project.ModuleDefinitionIndex.SampleModule
                        , label = "SampleModule"
                        , icon = moduleIcon
                        , children = []
                        }
                    ]
                }
            ]
        }
    , BaseTree
        { editorRef = Panel.EditorItemSource.EditorKeyConfig
        , label = "Editor Key Config"
        , icon = moduleIcon
        , children = []
        }
    ]


{-| 基本構造
-}
type BaseTree
    = BaseTree
        { editorRef : Panel.EditorItemSource.EditorItemSource
        , label : String
        , icon : Icon
        , children : List BaseTree
        }


{-| 開いているか閉じているかの情報も含んだ木構造
-}
type SimpleTree
    = SimpleTree
        { editorRef : Panel.EditorItemSource.EditorItemSource
        , label : String
        , icon : Icon
        , children : Children SimpleTree
        }



{- プロジェクトの木構造を表示するための中間表現。フォーカスが当たっているときの表現も持つ -}


type EditorTree
    = EditorTree
        { icon : Icon
        , label : String
        , editorRef : Panel.EditorItemSource.EditorItemSource
        , viewType : ViewType
        , option : List Option
        , children : Children EditorTree
        }


type Children a
    = ChildrenOpen ( a, List a )
    | ChildrenClose
    | ChildrenNone


childrenToList : Children a -> List a
childrenToList children =
    case children of
        ChildrenOpen ( x, xs ) ->
            x :: xs

        ChildrenClose ->
            []

        ChildrenNone ->
            []


simpleTreeGetEditorRef : SimpleTree -> Panel.EditorItemSource.EditorItemSource
simpleTreeGetEditorRef (SimpleTree { editorRef }) =
    editorRef


{-| アイコンの形式。クラスをつけられるようにSvgではなくList Svgにしてサイズは縦横同じ大きさにしている
-}
type Icon
    = Icon
        { size : Int
        , body : ViewType -> List (NSvg.NSvg Never)
        }


type ViewType
    = ViewTypeNone
    | ViewTypeActive
    | ViewTypeSelect


type Option
    = Option
        { icon : Icon
        , label : String
        , clickMsg : Msg
        }


{-| アイテムを普通に表示、アクティブなエディタであることの表示、ツリーパネルで選択されていることの表示
-}
makeViewType : Bool -> Bool -> ViewType
makeViewType isSameRef focus =
    case ( isSameRef, focus ) of
        ( True, True ) ->
            ViewTypeSelect

        ( True, False ) ->
            ViewTypeActive

        ( False, _ ) ->
            ViewTypeNone


viewTypeToClass : Bool -> ViewType -> List (Html.Attribute Msg)
viewTypeToClass focus viewType =
    (if focus then
        [ treePanelClass "item--focus" ]

     else
        []
    )
        ++ (case viewType of
                ViewTypeNone ->
                    []

                ViewTypeActive ->
                    [ treePanelClass "item--active" ]

                ViewTypeSelect ->
                    [ treePanelClass "item--select" ]
           )


{-| ツリーの1つの項目
選択しているプロジェクトの参照、プロジェクトのツリー、フォーカスがあたっているか
-}
viewTreeItem : Bool -> EditorTree -> Html.Html Msg
viewTreeItem focus (EditorTree { icon, label, editorRef, viewType, option, children }) =
    case children of
        ChildrenNone ->
            viewNoChildrenItem focus icon label editorRef viewType option

        ChildrenClose ->
            viewCloseChildrenItem focus icon label editorRef viewType option

        ChildrenOpen ( x, xs ) ->
            viewOpenChildrenItem focus icon label editorRef viewType option ( x, xs )


viewNoChildrenItem : Bool -> Icon -> String -> Panel.EditorItemSource.EditorItemSource -> ViewType -> List Option -> Html.Html Msg
viewNoChildrenItem focus icon label editorRef viewType optionList =
    Html.div
        ([ treePanelClass "item", Html.Attributes.tabindex 0 ]
            ++ viewTypeToClass focus viewType
        )
        ([ itemContent viewType editorRef icon label ]
            ++ (case optionList of
                    _ :: _ ->
                        [ optionButton ]

                    [] ->
                        []
               )
        )


viewCloseChildrenItem : Bool -> Icon -> String -> Panel.EditorItemSource.EditorItemSource -> ViewType -> List Option -> Html.Html Msg
viewCloseChildrenItem focus icon label editorRef viewType optionList =
    Html.div
        ([ treePanelClass "item"
         , Html.Attributes.tabindex 0
         ]
            ++ viewTypeToClass focus viewType
        )
        ([ treeCloseIcon editorRef viewType
         , itemContent viewType editorRef icon label
         ]
            ++ (case optionList of
                    _ :: _ ->
                        [ optionButton ]

                    [] ->
                        []
               )
        )


viewOpenChildrenItem : Bool -> Icon -> String -> Panel.EditorItemSource.EditorItemSource -> ViewType -> List Option -> ( EditorTree, List EditorTree ) -> Html.Html Msg
viewOpenChildrenItem focus icon label editorRef viewType optionList ( headTree, restTree ) =
    Html.div
        ([ treePanelClass "itemWithChildren"
         , Html.Attributes.tabindex 0
         ]
            ++ viewTypeToClass focus viewType
        )
        ([ treeOpenIcon editorRef viewType
         , itemContent viewType editorRef icon label
         ]
            ++ (case optionList of
                    _ :: _ ->
                        [ optionButton ]

                    [] ->
                        []
               )
            ++ [ Html.div [ treePanelClass "item-children" ]
                    (viewTreeItem focus headTree :: (restTree |> List.map (viewTreeItem focus)))
               ]
        )



{- ツリーが開いているか閉じているかをあらわしクリックして閉じたり開いたりできるアイコン -}


{-| ツリーが閉じているときのアイコン ▷ クリックして開く
-}
treeCloseIcon : Panel.EditorItemSource.EditorItemSource -> ViewType -> Html.Html Msg
treeCloseIcon editorRef viewType =
    Html.div
        [ treePanelClass "item-openCloseIcon"
        , Html.Events.onClick (TreeOpen editorRef)
        ]
        [ NSvg.toHtml
            { x = 0, y = 0, width = 20, height = 30 }
            [ NSvg.polygon [ ( 5, 8 ), ( 18, 14 ), ( 5, 20 ) ] NSvg.strokeNone (NSvg.fillColor (iconColor viewType)) ]
        ]


{-| ツリーが開いているときのアイコン ▽ クリックして閉じる
-}
treeOpenIcon : Panel.EditorItemSource.EditorItemSource -> ViewType -> Html.Html Msg
treeOpenIcon editorRef viewType =
    Html.div
        [ treePanelClass "item-openCloseIcon"
        , Html.Events.onClick (TreeClose editorRef)
        ]
        [ NSvg.toHtml
            { x = 0, y = 0, width = 20, height = 30 }
            [ NSvg.polygon [ ( 4, 8 ), ( 16, 8 ), ( 10, 21 ) ] NSvg.strokeNone (NSvg.fillColor (iconColor viewType)) ]
        ]


{-| ツリーのアイテムのアイコンとテキスト
-}
itemContent : ViewType -> Panel.EditorItemSource.EditorItemSource -> Icon -> String -> Html.Html Msg
itemContent viewType editorRef icon label =
    Html.div
        [ treePanelClass "item-content"
        , Html.Events.onClick (OpenEditor editorRef)
        ]
        [ iconToElement viewType icon
        , Html.text label
        ]



{- ============================== ICON ================================== -}


iconToElement : ViewType -> Icon -> Html.Html Msg
iconToElement viewType (Icon { size, body }) =
    NSvg.toHtmlWithClass
        "treePanel-item-content-icon"
        { x = 0, y = 0, width = size, height = size }
        (body viewType)
        |> Html.map never


{-| デフォルトのプロジェクトのアイコン
-}
defaultProjectIcon : Icon
defaultProjectIcon =
    Icon
        { size = 28
        , body =
            \viewType ->
                [ NSvg.rect
                    { width = 24
                    , height = 22
                    }
                    (NSvg.strokeColor (iconColor viewType))
                    NSvg.fillNone
                    |> NSvg.translate { x = 2, y = 2 }
                , NSvg.rect
                    { width = 20
                    , height = 10
                    }
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 4, y = 12 }
                ]
        }


{-| ドキュメントのアイコン
-}
documentIcon : Icon
documentIcon =
    Icon
        { size = 28
        , body =
            \viewType ->
                [ NSvg.rect
                    { width = 26
                    , height = 26
                    }
                    (NSvg.strokeColor (iconColor viewType))
                    NSvg.fillNone
                    |> NSvg.translate { x = 1, y = 1 }
                , NSvg.rect
                    { width = 18
                    , height = 2
                    }
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 5, y = 6 }
                , NSvg.rect
                    { width = 18
                    , height = 2
                    }
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 5, y = 11 }
                , NSvg.rect
                    { width = 18
                    , height = 2
                    }
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 5, y = 16 }
                ]
        }


configIcon : Icon
configIcon =
    Icon
        { size = 10
        , body =
            \viewType ->
                [ NSvg.polygon
                    [ ( 6, 5 ), ( 9, 7 ), ( 6, 9 ) ]
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                , NSvg.path
                    "M3.69 6.16h-.72l-.15-1.1a1.92 1.92 0 0 1-.43-.18l-.9.67-.5-.51.67-.89a1.92 1.92 0 0 1-.17-.43l-1.1-.15v-.73l1.1-.15a1.92 1.92 0 0 1 .18-.43L1 1.37l.5-.5.9.67a1.92 1.92 0 0 1 .43-.18l.15-1.1h.72l.15 1.1a1.92 1.92 0 0 1 .43.18l.9-.67.5.52-.67.88a1.92 1.92 0 0 1 .17.43l1.1.16v.72l-1.1.15a1.92 1.92 0 0 1-.18.43l.67.89-.51.5-.89-.67a1.92 1.92 0 0 1-.43.18zM3.33 4.1a.89.89 0 0 0 0-1.77.89.89 0 0 0 0 1.77"
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                ]
        }


sourceIcon : Icon
sourceIcon =
    Icon
        { size = 20
        , body =
            \viewType ->
                [ NSvg.rect
                    { width = 12, height = 12 }
                    (NSvg.strokeColor (iconColor viewType))
                    NSvg.fillNone
                    |> NSvg.translate { x = 2, y = 2 }
                , NSvg.circle
                    2
                    NSvg.strokeNone
                    (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 8, y = 8 }
                , NSvg.path
                    "M14,4 L18,4 L18,18 L4,18 L4,14"
                    (NSvg.strokeColorAndStrokeLineJoinRound (iconColor viewType))
                    NSvg.fillNone
                ]
        }


moduleIcon : Icon
moduleIcon =
    Icon
        { size = 10
        , body =
            \viewType ->
                [ NSvg.rect
                    { width = 8, height = 8 }
                    (NSvg.strokeColor (iconColor viewType))
                    NSvg.fillNone
                    |> NSvg.translate { x = 1, y = 1 }
                , NSvg.circle 2 NSvg.strokeNone (NSvg.fillColor (iconColor viewType))
                    |> NSvg.translate { x = 5, y = 5 }
                ]
        }


optionButton : Html.Html Msg
optionButton =
    Html.div
        [ treePanelClass "item-option" ]
        [ NSvg.toHtml
            { x = 0, y = 0, width = 20, height = 30 }
            [ NSvg.circle 2 NSvg.strokeNone (NSvg.fillColor Palette.X11.white) |> NSvg.translate { x = 10, y = 7 }
            , NSvg.circle 2 NSvg.strokeNone (NSvg.fillColor Palette.X11.white) |> NSvg.translate { x = 10, y = 15 }
            , NSvg.circle 2 NSvg.strokeNone (NSvg.fillColor Palette.X11.white) |> NSvg.translate { x = 10, y = 23 }
            ]
        ]


{-| TODO 整列のことを考える
-}
renameButton : Html.Html Msg
renameButton =
    Html.div [] []


treePanelClass : String -> Html.Attribute Msg
treePanelClass subClassName =
    Html.Attributes.class ("treePanel" ++ "-" ++ subClassName)


iconColor : ViewType -> Color.Color
iconColor viewType =
    case viewType of
        ViewTypeNone ->
            Color.fromRGB ( 136, 136, 136 )

        ViewTypeActive ->
            Color.fromRGB ( 185, 208, 155 )

        ViewTypeSelect ->
            Color.fromRGB ( 0, 0, 0 )
