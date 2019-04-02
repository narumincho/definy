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
import NSvg
import Palette.X11
import Panel.EditorTypeRef
import Project
import Project.Label as Label
import Project.SocrceIndex
import Project.Source
import Utility.ListExtra
import Utility.Map


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
        , isSourceOpen : Bool
        , isCoreOpen : Bool
        }


{-| Panel作成時の初期Model
-}
initModel : Model
initModel =
    Model
        { openCloseData =
            OpenCloseData
                { isProjectRootOpen = True
                , isSourceOpen = True
                , isCoreOpen = True
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
isTreeOpen : Panel.EditorTypeRef.EditorTypeRef -> OpenCloseData -> Bool
isTreeOpen projectRef (OpenCloseData { isProjectRootOpen, isSourceOpen, isCoreOpen }) =
    case projectRef of
        Panel.EditorTypeRef.EditorProject Project.ProjectRoot ->
            isProjectRootOpen

        Panel.EditorTypeRef.EditorProject Project.Source ->
            isSourceOpen

        Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.Core) ->
            isCoreOpen

        _ ->
            False


{-| 指定したエディタRefの表示を開く
-}
openTree : Panel.EditorTypeRef.EditorTypeRef -> OpenCloseData -> OpenCloseData
openTree editorRef (OpenCloseData rec) =
    case editorRef of
        Panel.EditorTypeRef.EditorProject Project.ProjectRoot ->
            OpenCloseData
                { rec
                    | isProjectRootOpen = True
                }

        Panel.EditorTypeRef.EditorProject Project.Source ->
            OpenCloseData
                { rec
                    | isSourceOpen = True
                }

        Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.Core) ->
            OpenCloseData
                { rec
                    | isCoreOpen = True
                }

        _ ->
            OpenCloseData rec


{-| 指定したエディタRefの表示を閉じる
-}
closeTree : Panel.EditorTypeRef.EditorTypeRef -> OpenCloseData -> OpenCloseData
closeTree editorRef (OpenCloseData rec) =
    case editorRef of
        Panel.EditorTypeRef.EditorProject Project.ProjectRoot ->
            OpenCloseData
                { rec
                    | isProjectRootOpen = False
                }

        Panel.EditorTypeRef.EditorProject Project.Source ->
            OpenCloseData
                { rec
                    | isSourceOpen = False
                }

        Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.Core) ->
            OpenCloseData
                { rec
                    | isCoreOpen = False
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
    = TreeOpen Panel.EditorTypeRef.EditorTypeRef
    | TreeClose Panel.EditorTypeRef.EditorTypeRef
    | SelectUp -- デフォルトで↑キーの操作
    | SelectDown -- デフォルトで↓キーの操作
    | SelectParentOrTreeClose -- デフォルトで←キーの操作
    | SelectFirstChildOrTreeOpen -- デフォルトで→キーの操作
    | ToFocusEditorPanel -- デフォルトでEnterの動作
    | OpenEditor Panel.EditorTypeRef.EditorTypeRef -- エディタを開く
    | SelectAndOpenKeyConfig -- キーコンフィッグを選択して開く


{-| 全体に送るメッセージ
-}
type Emit
    = EmitFocusToEditorGroup -- エディタグループにフォーカスを移動
    | EmitOpenEditor Panel.EditorTypeRef.EditorTypeRef -- エディタを開く



{- ====================== Update ====================== -}


{-| ツリーパネルを更新する
メッセージとモデルと親から情報を受け取り、新しいモデルと親へのエミット
-}
update : Msg -> Panel.EditorTypeRef.EditorTypeRef -> Project.Project -> Model -> ( Model, Maybe Emit )
update msg editorRef project model =
    case msg of
        TreeOpen ref ->
            ( model |> mapOpenCloseData (openTree ref)
            , Nothing
            )

        TreeClose ref ->
            ( model |> mapOpenCloseData (closeTree ref)
            , Nothing
            )

        SelectUp ->
            ( model
            , Just (EmitOpenEditor (selectUp project (getOpenCloseData model) editorRef))
            )

        SelectDown ->
            ( model
            , Just (EmitOpenEditor (selectDown project (getOpenCloseData model) editorRef))
            )

        SelectParentOrTreeClose ->
            if isTreeOpen editorRef (getOpenCloseData model) then
                ( model |> mapOpenCloseData (closeTree editorRef)
                , Nothing
                )

            else
                ( model
                , Just (EmitOpenEditor (selectToParent project (getOpenCloseData model) editorRef))
                )

        SelectFirstChildOrTreeOpen ->
            if isTreeOpen editorRef (getOpenCloseData model) then
                ( model
                , Just (EmitOpenEditor (selectDown project (getOpenCloseData model) editorRef))
                )

            else
                ( model |> mapOpenCloseData (openTree editorRef)
                , Nothing
                )

        ToFocusEditorPanel ->
            ( model
            , Just EmitFocusToEditorGroup
            )

        OpenEditor projectRef ->
            ( model
            , Just (EmitOpenEditor projectRef)
            )

        SelectAndOpenKeyConfig ->
            ( model
            , Just (EmitOpenEditor Panel.EditorTypeRef.EditorKeyConfig)
            )


type SelectUpResult
    = UpNoExistThisTree
    | UpPrevious Panel.EditorTypeRef.EditorTypeRef
    | UpExist Panel.EditorTypeRef.EditorTypeRef


{-| 上を選択する
-}
selectUp : Project.Project -> OpenCloseData -> Panel.EditorTypeRef.EditorTypeRef -> Panel.EditorTypeRef.EditorTypeRef
selectUp project openCloseData selectedRef =
    case selectUpListLoop ( Nothing, simpleProjectTree project openCloseData ) selectedRef of
        UpNoExistThisTree ->
            Panel.EditorTypeRef.EditorProject Project.ProjectRoot

        UpPrevious ref ->
            ref

        UpExist ref ->
            ref


selectUpLoop : SimpleTree -> Panel.EditorTypeRef.EditorTypeRef -> SelectUpResult
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


selectUpListLoop : ( Maybe SimpleTree, List SimpleTree ) -> Panel.EditorTypeRef.EditorTypeRef -> SelectUpResult
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


getTailRef : SimpleTree -> Panel.EditorTypeRef.EditorTypeRef
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
    = DownExist Panel.EditorTypeRef.EditorTypeRef
    | DownNext Panel.EditorTypeRef.EditorTypeRef
    | DownNoExistThisTree


{-| 下を選択する
-}
selectDown : Project.Project -> OpenCloseData -> Panel.EditorTypeRef.EditorTypeRef -> Panel.EditorTypeRef.EditorTypeRef
selectDown project openCloseData selectedRef =
    case selectDownListLoop (simpleProjectTree project openCloseData) selectedRef of
        DownExist ref ->
            ref

        DownNext ref ->
            ref

        DownNoExistThisTree ->
            Panel.EditorTypeRef.EditorProject Project.ProjectRoot


selectDownLoop : SimpleTree -> Panel.EditorTypeRef.EditorTypeRef -> SelectDownResult
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


selectDownListLoop : List SimpleTree -> Panel.EditorTypeRef.EditorTypeRef -> SelectDownResult
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
selectToParent : Project.Project -> OpenCloseData -> Panel.EditorTypeRef.EditorTypeRef -> Panel.EditorTypeRef.EditorTypeRef
selectToParent project openCloseData selectedRef =
    case selectToParentLoop (simpleProjectTree project openCloseData) selectedRef of
        Just ref ->
            ref

        Nothing ->
            Panel.EditorTypeRef.EditorProject Project.ProjectRoot


selectToParentLoop : List SimpleTree -> Panel.EditorTypeRef.EditorTypeRef -> Maybe Panel.EditorTypeRef.EditorTypeRef
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


isExistInChildren : SimpleTree -> Panel.EditorTypeRef.EditorTypeRef -> Bool
isExistInChildren (SimpleTree { children }) target =
    case children of
        ChildrenNone ->
            False

        ChildrenClose ->
            False

        ChildrenOpen ( x, xs ) ->
            List.any (simpleTreeGetEditorRef >> (==) target) (x :: xs)



{- ====================== View ====================== -}


{-| ModuleTreePanelの表示
-}
view :
    { project : Project.Project
    , editorRef : Panel.EditorTypeRef.EditorTypeRef
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
    Html.div [ treePanelClass "title" ]
        [ Html.text "Definy" ]


{-| ツリービュー本体
-}
viewTree : { project : Project.Project, editorRef : Panel.EditorTypeRef.EditorTypeRef, focus : Bool, width : Int } -> Model -> List (Html.Html Msg)
viewTree { project, editorRef, focus, width } model =
    projectToProjectTree project editorRef focus (getOpenCloseData model)
        |> List.map viewTreeItem


projectToProjectTree : Project.Project -> Panel.EditorTypeRef.EditorTypeRef -> Bool -> OpenCloseData -> List EditorTree
projectToProjectTree project editorRef isFocus openCloseData =
    simpleProjectTree project openCloseData
        |> List.map (makeEditorTree isFocus editorRef)


{-| プロジェクトを木構造にする
-}
simpleProjectTree : Project.Project -> OpenCloseData -> List SimpleTree
simpleProjectTree project openCloseData =
    baseTree project
        |> List.map (baseTreeToSimpleProjectTree openCloseData)


makeEditorTree : Bool -> Panel.EditorTypeRef.EditorTypeRef -> SimpleTree -> EditorTree
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
        { editorRef = Panel.EditorTypeRef.EditorProject Project.ProjectRoot
        , label = Label.toSmallString (Project.getAuthor project) ++ "/" ++ Label.toCapitalString (Project.getName project)
        , icon = defaultProjectIcon
        , children =
            [ BaseTree
                { editorRef = Panel.EditorTypeRef.EditorProject Project.Document
                , label = "Document"
                , icon = documentIcon
                , children = []
                }
            , BaseTree
                { editorRef = Panel.EditorTypeRef.EditorProject Project.Config
                , label = "Default IO Config"
                , icon = configIcon
                , children = []
                }
            , BaseTree
                { editorRef = Panel.EditorTypeRef.EditorProject Project.Source
                , label = "Source"
                , icon = sourceIcon
                , children =
                    [ BaseTree
                        { editorRef = Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.SampleModule)
                        , label = "SampleModule"
                        , icon = moduleIcon
                        , children = []
                        }
                    , BaseTree
                        { editorRef = Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.Core)
                        , label = "Core"
                        , icon = moduleIcon
                        , children =
                            [ BaseTree
                                { editorRef = Panel.EditorTypeRef.EditorProject (Project.Module Project.SocrceIndex.CoreInt32)
                                , label = "Int32"
                                , icon = moduleIcon
                                , children = []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    , BaseTree
        { editorRef = Panel.EditorTypeRef.EditorKeyConfig
        , label = "Editor Key Config"
        , icon = moduleIcon
        , children = []
        }
    ]


{-| 基本構造
-}
type BaseTree
    = BaseTree
        { editorRef : Panel.EditorTypeRef.EditorTypeRef
        , label : String
        , icon : Icon
        , children : List BaseTree
        }


{-| 開いているか閉じているかの情報も含んだ木構造
-}
type SimpleTree
    = SimpleTree
        { editorRef : Panel.EditorTypeRef.EditorTypeRef
        , label : String
        , icon : Icon
        , children : Children SimpleTree
        }



{- プロジェクトの木構造を表示するための中間表現。フォーカスが当たっているときの表現も持つ -}


type EditorTree
    = EditorTree
        { icon : Icon
        , label : String
        , editorRef : Panel.EditorTypeRef.EditorTypeRef
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


simpleTreeGetEditorRef : SimpleTree -> Panel.EditorTypeRef.EditorTypeRef
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
        , clickMsg : Project.ProjectRef -> Msg
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


viewTypeToClass : ViewType -> Maybe (Html.Attribute Msg)
viewTypeToClass viewType =
    case viewType of
        ViewTypeNone ->
            Nothing

        ViewTypeActive ->
            Just (treePanelClass "item--active")

        ViewTypeSelect ->
            Just (treePanelClass "item--select")


{-| ツリーの1つの項目
選択しているプロジェクトの参照、プロジェクトのツリー、フォーカスがあたっているか
-}
viewTreeItem : EditorTree -> Html.Html Msg
viewTreeItem (EditorTree { icon, label, editorRef, viewType, option, children }) =
    case children of
        ChildrenNone ->
            viewNoChildrenItem icon label editorRef viewType option

        ChildrenClose ->
            viewCloseChildrenItem icon label editorRef viewType option

        ChildrenOpen ( x, xs ) ->
            viewOpenChildrenItem icon label editorRef viewType option ( x, xs )


viewNoChildrenItem : Icon -> String -> Panel.EditorTypeRef.EditorTypeRef -> ViewType -> List Option -> Html.Html Msg
viewNoChildrenItem icon label editorRef viewType optionList =
    Html.div
        ([ treePanelClass "item", Html.Attributes.tabindex 0 ]
            ++ Utility.ListExtra.fromMaybe (viewTypeToClass viewType)
        )
        ([ itemContent viewType editorRef icon label ]
            ++ (case optionList of
                    _ :: _ ->
                        [ optionButton ]

                    [] ->
                        []
               )
        )


viewCloseChildrenItem : Icon -> String -> Panel.EditorTypeRef.EditorTypeRef -> ViewType -> List Option -> Html.Html Msg
viewCloseChildrenItem icon label editorRef viewType optionList =
    Html.div
        ([ treePanelClass "item"
         , Html.Attributes.tabindex 0
         ]
            ++ Utility.ListExtra.fromMaybe (viewTypeToClass viewType)
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


viewOpenChildrenItem : Icon -> String -> Panel.EditorTypeRef.EditorTypeRef -> ViewType -> List Option -> ( EditorTree, List EditorTree ) -> Html.Html Msg
viewOpenChildrenItem icon label editorRef viewType optionList ( headTree, restTree ) =
    Html.div
        ([ treePanelClass "itemWithChildren"
         , Html.Attributes.tabindex 0
         ]
            ++ Utility.ListExtra.fromMaybe (viewTypeToClass viewType)
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
                    (viewTreeItem headTree :: (restTree |> List.map viewTreeItem))
               ]
        )



{- ツリーが開いているか閉じているかをあらわしクリックして閉じたり開いたりできるアイコン -}


{-| ツリーが閉じているときのアイコン ▷ クリックして開く
-}
treeCloseIcon : Panel.EditorTypeRef.EditorTypeRef -> ViewType -> Html.Html Msg
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
treeOpenIcon : Panel.EditorTypeRef.EditorTypeRef -> ViewType -> Html.Html Msg
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
itemContent : ViewType -> Panel.EditorTypeRef.EditorTypeRef -> Icon -> String -> Html.Html Msg
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
