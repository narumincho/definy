module Panel.Editor.Module exposing
    ( Emit(..)
    , Model
    , Msg(..)
    , getModuleRef
    , initModel
    , isFocusDefaultUi
    , update
    , view
    )

import Html
import Html.Attributes
import Html.Events
import Json.Decode
import Json.Encode
import Panel.DefaultUi
import Parser
import Parser.SimpleChar
import Project
import Project.Label
import Project.Source
import Project.Source.Module.Def as Def
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Expr.Operator as Op
import Project.Source.Module.Def.Expr.Term as Term
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type
import Project.Source.ModuleWithCache as ModuleWithCache
import Utility.ListExtra


type Model
    = Model
        { moduleRef : Project.Source.ModuleRef
        , active : Active
        }


type Msg
    = ActiveTo Active
    | SelectLeft
    | SelectRight
    | SelectUp
    | SelectDown
    | SelectFirstChild
    | SelectLastChild
    | SelectParent
    | Input String
    | ToEditMode
    | Confirm
    | ConfirmMultiLineTextField
    | AddPartDef
    | FocusThisEditor
    | BlurThisEditor


type Emit
    = EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitChangeName { name : Name.Name, index : Int, ref : Project.Source.ModuleRef }
    | EmitChangeType { type_ : Type.Type, index : Int, ref : Project.Source.ModuleRef }
    | EmitChangeExpr { expr : Expr.Expr, index : Int, ref : Project.Source.ModuleRef }
    | EmitAddPartDef { ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String
    | EmitFocusEditTextAea


type Active
    = ActiveNone
    | ActiveDescription DescriptionActive
    | ActivePartDefList PartDefListActive


type DescriptionActive
    = ActiveDescriptionSelf
    | ActiveDescriptionText


type PartDefListActive
    = ActivePartDefListSelf
    | ActivePartDef ( Int, PartDefActive )


type PartDefActive
    = ActivePartDefSelf
    | ActivePartDefName
    | ActivePartDefType
    | ActivePartDefExpr PartDefExprActive


{-| 式の中で選択している位置。式の長さを超えるところを指定しているならば、それは式の末尾を表す
-}
type PartDefExprActive
    = ActivePartDefExprSelf
    | ActiveExprHead --     |abc + def + 28
    | ActiveExprTerm Int -- [abc]+ def + 28  Intの範囲は0..255
    | ActiveExprOp Int --  abc[+]def + 28  Intの範囲は0..254


{-| テキストエリアにフォーカスが当たっているか。
当たっていたらKey.ArrowLeftなどのキー入力をpreventDefaultしない。ブラウザの基本機能(訂正など)を阻止しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi (Model { active }) =
    case active of
        ActiveDescription ActiveDescriptionText ->
            Just Panel.DefaultUi.MultiLineTextField

        _ ->
            Nothing


initModel : Project.Source.ModuleRef -> Model
initModel moduleRef =
    Model
        { moduleRef = moduleRef
        , active = ActiveNone
        }


getModuleRef : Model -> Project.Source.ModuleRef
getModuleRef (Model { moduleRef }) =
    moduleRef


update : Msg -> Project.Project -> Model -> ( Model, List Emit )
update msg project (Model rec) =
    let
        targetModule =
            project
                |> Project.getSource
                |> Project.Source.getModule rec.moduleRef
    in
    case msg of
        ActiveTo active ->
            ( Model { rec | active = active }
            , case active of
                ActiveNone ->
                    []

                ActiveDescription ActiveDescriptionSelf ->
                    []

                ActiveDescription ActiveDescriptionText ->
                    [ EmitFocusEditTextAea ]

                ActivePartDefList _ ->
                    [ EmitFocusEditTextAea ]
            )

        SelectLeft ->
            update (ActiveTo (selectLeft targetModule rec.active)) project (Model rec)

        SelectRight ->
            update (ActiveTo (selectRight targetModule rec.active)) project (Model rec)

        SelectUp ->
            update (ActiveTo (selectUp targetModule rec.active)) project (Model rec)

        SelectDown ->
            update (ActiveTo (selectDown targetModule rec.active)) project (Model rec)

        SelectFirstChild ->
            update (ActiveTo (selectFirstChild targetModule rec.active)) project (Model rec)

        SelectLastChild ->
            update (ActiveTo (selectLastChild targetModule rec.active)) project (Model rec)

        SelectParent ->
            update (ActiveTo (selectParent targetModule rec.active)) project (Model rec)

        Input string ->
            ( Model rec
            , [ EmitChangeReadMe { text = string, ref = rec.moduleRef } ]
            )

        ToEditMode ->
            ( Model rec
            , []
            )

        Confirm ->
            ( Model rec
            , []
            )

        ConfirmMultiLineTextField ->
            update (ActiveTo (confirmMultiLineTextField rec.active)) project (Model rec)

        AddPartDef ->
            ( Model rec
            , [ EmitAddPartDef { ref = rec.moduleRef } ]
            )

        FocusThisEditor ->
            ( Model rec
            , []
            )

        BlurThisEditor ->
            ( Model
                { rec
                    | active =
                        case rec.active of
                            ActiveDescription ActiveDescriptionText ->
                                ActiveDescription ActiveDescriptionSelf

                            _ ->
                                rec.active
                }
            , []
            )


{-| 選択を左へ移動して、選択する対象を変える
-}
selectLeft : ModuleWithCache.Module -> Active -> Active
selectLeft module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから概要欄へ
            ActiveDescription ActiveDescriptionSelf

        ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf )) ->
            -- 先頭の定義から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から前の定義へ
            ActivePartDefList (ActivePartDef ( index - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType )) ->
            -- 型から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead )) ->
            -- 先頭の項の前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0) )) ->
            -- 先頭の項から先頭の項の前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp opIndex) )) ->
            -- 演算子から前の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm opIndex) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm termIndex) )) ->
            -- 項から前の演算子へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp (termIndex - 1)) ))

        _ ->
            active


{-| 選択を右へ移動して、選択する対象を変える
-}
selectRight : ModuleWithCache.Module -> Active -> Active
selectRight module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要欄へ
            ActiveDescription ActiveDescriptionSelf

        ActiveDescription ActiveDescriptionSelf ->
            -- 概要欄から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から次の定義へ
            ActivePartDefList (ActivePartDef ( min (ModuleWithCache.getDefNum module_ - 1) (index + 1), ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName )) ->
            -- 名前から型へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType )) ->
            -- 型から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead )) ->
            -- 先頭の項の前から先頭の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm termIndex) )) ->
            -- 項から次の演算子へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp termIndex) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp opIndex) )) ->
            -- 演算子から次の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm (opIndex + 1)) ))

        _ ->
            active


{-| 選択を上へ移動して、選択する対象を変える
-}
selectUp : ModuleWithCache.Module -> Active -> Active
selectUp module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActiveDescription _ ->
            -- 概要欄から概要欄へ
            ActiveDescription ActiveDescriptionSelf

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから概要欄へ
            ActiveDescription ActiveDescriptionSelf

        ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf )) ->
            -- 先頭の定義から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から前の定義へ
            ActivePartDefList (ActivePartDef ( index - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType )) ->
            -- 型から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr _ )) ->
            -- 式の中身から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))


{-| 選択を下へ移動して、選択する対象を変える
-}
selectDown : ModuleWithCache.Module -> Active -> Active
selectDown module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要へ
            ActiveDescription ActiveDescriptionSelf

        ActiveDescription _ ->
            -- 概要欄から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から次の定義へ
            ActivePartDefList (ActivePartDef ( min (ModuleWithCache.getDefNum module_ - 1) (index + 1), ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName )) ->
            -- 名前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType )) ->
            -- 型から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr _ )) ->
            -- 式の中身から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        _ ->
            active


{-| 選択を選択していたものからその子供の先頭へ移動する
-}
selectFirstChild : ModuleWithCache.Module -> Active -> Active
selectFirstChild module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要へ
            ActiveDescription ActiveDescriptionSelf

        ActiveDescription ActiveDescriptionSelf ->
            -- 概要欄から概要欄のテキスト入力へ
            ActiveDescription ActiveDescriptionText

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから先頭の定義へ
            ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から先頭の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0) ))

        _ ->
            active


{-| 選択を選択していたものからその子供の末尾へ移動する
-}
selectLastChild : ModuleWithCache.Module -> Active -> Active
selectLastChild module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActiveDescription ActiveDescriptionSelf ->
            -- 概要欄から概要欄のテキスト入力へ
            ActiveDescription ActiveDescriptionText

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから最後の定義リストへ
            ActivePartDefList
                (ActivePartDef ( ModuleWithCache.getDefNum module_ - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から式へ
            ActivePartDefList
                (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        _ ->
            active


selectParent : ModuleWithCache.Module -> Active -> Active
selectParent module_ active =
    active


{-| 複数行入力の確定。概要や文字列リテラルでの入力を確定にする
-}
confirmMultiLineTextField : Active -> Active
confirmMultiLineTextField active =
    case active of
        ActiveDescription ActiveDescriptionText ->
            ActiveDescription ActiveDescriptionSelf

        _ ->
            active



{- ================================================
   ==================================================
                       View
   ==================================================
   ================================================
-}


{-| モジュールエディタのview。
プロジェクト全体のデータと
このエディタが全体にとってフォーカスが当たっているか当たっていないかのBoolと
モジュールエディタのModelで見た目を決める
-}
view : Project.Project -> Bool -> Model -> { title : String, body : List (Html.Html Msg) }
view project isFocus (Model { moduleRef, active }) =
    let
        targetModule =
            project
                |> Project.getSource
                |> Project.Source.getModule moduleRef
    in
    { title = Project.Label.toCapitalString (ModuleWithCache.getName targetModule)
    , body =
        [ Html.div [] [ Html.text (activeToString active) ]
        , descriptionView (ModuleWithCache.getReadMe targetModule)
            isFocus
            (case active of
                ActiveDescription descriptionActive ->
                    Just descriptionActive

                _ ->
                    Nothing
            )
        , partDefinitionsView
            isFocus
            (case active of
                ActivePartDefList partDefListActive ->
                    Just partDefListActive

                _ ->
                    Nothing
            )
            (ModuleWithCache.getDefWithCacheList targetModule |> List.map Tuple.first)
        ]
    }


activeToString : Active -> String
activeToString active =
    case active of
        ActiveNone ->
            "アクティブなし"

        ActiveDescription ActiveDescriptionSelf ->
            "概要欄"

        ActiveDescription ActiveDescriptionText ->
            "概要欄のテキストを編集している"

        ActivePartDefList ActivePartDefListSelf ->
            "パーツエディタ全体"

        ActivePartDefList (ActivePartDef ( index, partDefActive )) ->
            String.fromInt index
                ++ "番目の定義"
                ++ (partDefActive |> partDefActiveToString)


partDefActiveToString : PartDefActive -> String
partDefActiveToString partDefActive =
    case partDefActive of
        ActivePartDefSelf ->
            "全体"

        ActivePartDefName ->
            "名前"

        ActivePartDefType ->
            "型"

        ActivePartDefExpr ActivePartDefExprSelf ->
            "式全体"

        ActivePartDefExpr ActiveExprHead ->
            "先頭の項の前"

        ActivePartDefExpr (ActiveExprTerm index) ->
            String.fromInt index ++ "番目の項"

        ActivePartDefExpr (ActiveExprOp index) ->
            String.fromInt index ++ "番目の演算子"



{- ===== descriptionView ===== -}


descriptionView : String -> Bool -> Maybe DescriptionActive -> Html.Html Msg
descriptionView description isFocus descriptionActiveMaybe =
    let
        editHere =
            case descriptionActiveMaybe of
                Just ActiveDescriptionText ->
                    isFocus

                _ ->
                    False
    in
    Html.div
        ([ subClassList
            [ ( "description", True )
            , ( "description-active", descriptionActiveMaybe == Just ActiveDescriptionSelf )
            ]
         ]
            ++ (case descriptionActiveMaybe of
                    Just ActiveDescriptionSelf ->
                        []

                    _ ->
                        [ Html.Events.onClick (ActiveTo (ActiveDescription ActiveDescriptionSelf)) ]
               )
        )
        [ descriptionViewTitle
        , descriptionViewInputArea description isFocus descriptionActiveMaybe
        ]


descriptionViewTitle : Html.Html Msg
descriptionViewTitle =
    Html.h2
        [ subClass "description-title" ]
        [ Html.text "Description" ]


descriptionViewInputArea : String -> Bool -> Maybe DescriptionActive -> Html.Html Msg
descriptionViewInputArea description isFocus descriptionActiveMaybe =
    Html.div [ subClass "description-inputArea" ]
        [ Html.div
            [ subClassList
                [ ( "description-container", True )
                , ( "description-container-active", descriptionActiveMaybe == Just ActiveDescriptionText )
                ]
            ]
            [ descriptionViewMeasure description
            , descriptionViewTextArea description isFocus descriptionActiveMaybe
            ]
        ]


descriptionViewMeasure : String -> Html.Html Msg
descriptionViewMeasure description =
    let
        lineList =
            description |> String.lines
    in
    Html.div
        [ subClass "description-measure" ]
        ((lineList
            |> List.map Html.text
            |> List.intersperse (Html.br [] [])
         )
            ++ (if Utility.ListExtra.last lineList == Just "" then
                    [ Html.div [] [ Html.text "_" ] ]

                else
                    []
               )
        )


descriptionViewTextArea : String -> Bool -> Maybe DescriptionActive -> Html.Html Msg
descriptionViewTextArea description isFocus descriptionActiveMaybe =
    Html.textarea
        ([ subClass "description-textarea"
         ]
            ++ (case descriptionActiveMaybe of
                    Just ActiveDescriptionSelf ->
                        [ Html.Attributes.property "value" (Json.Encode.string description)
                        ]
                            ++ (if isFocus then
                                    [ Html.Events.stopPropagationOn "click" focusEventJsonDecoder ]

                                else
                                    [ Html.Events.onClick (ActiveTo (ActiveDescription ActiveDescriptionText)) ]
                               )

                    Just ActiveDescriptionText ->
                        [ Html.Events.onInput Input
                        , Html.Attributes.property "value" (Json.Encode.string description)
                        , Html.Events.stopPropagationOn "click" focusEventJsonDecoder
                        , subClass "description-textarea-focus"
                        ]
                            ++ (if isFocus then
                                    [ Html.Attributes.id "edit" ]

                                else
                                    []
                               )

                    Nothing ->
                        if isFocus then
                            [ Html.Events.stopPropagationOn "click" focusEventJsonDecoder
                            , Html.Attributes.property "value" (Json.Encode.string description)
                            ]

                        else
                            [ Html.Events.onClick (ActiveTo (ActiveDescription ActiveDescriptionText))
                            , Html.Attributes.property "value" (Json.Encode.string description)
                            ]
               )
        )
        []


focusEventJsonDecoder : Json.Decode.Decoder ( Msg, Bool )
focusEventJsonDecoder =
    Json.Decode.succeed
        ( ActiveTo (ActiveDescription ActiveDescriptionText), True )



{- ===== part definitions ===== -}


{-| モジュールエディタのメインの要素であるパーツエディタを表示する
partDefActiveMaybeAndIndexがJustならこのエディタ
-}
partDefinitionsView : Bool -> Maybe PartDefListActive -> List Def.Def -> Html.Html Msg
partDefinitionsView isEditorItemFocus partDefListActiveMaybe defList =
    Html.div
        ([ subClass "partDefinitions"
         ]
            ++ (case partDefListActiveMaybe of
                    Just ActivePartDefListSelf ->
                        [ subClass "partDefinitions-active" ]

                    _ ->
                        [ Html.Events.onClick (ActiveTo (ActivePartDefList ActivePartDefListSelf)) ]
               )
        )
        ([ partDefinitionsViewTitle
         , partDefListView defList
            (case partDefListActiveMaybe of
                Just (ActivePartDef partDefActiveWithIndex) ->
                    Just partDefActiveWithIndex

                _ ->
                    Nothing
            )
         ]
            ++ (case partDefListActiveMaybe of
                    Just _ ->
                        [ Html.textarea
                            [ Html.Attributes.class "partDefEditor-hideTextArea"
                            , Html.Attributes.id "edit"
                            ]
                            []
                        ]

                    Nothing ->
                        []
               )
        )


partDefinitionsViewTitle : Html.Html Msg
partDefinitionsViewTitle =
    Html.div
        [ subClass "partDefinitions-title" ]
        [ Html.text "Part Definitions" ]


partDefListView : List Def.Def -> Maybe ( Int, PartDefActive ) -> Html.Html Msg
partDefListView defList partDefActiveWithIndexMaybe =
    Html.div
        [ subClass "partDefEditorList"
        ]
        (defList
            |> List.indexedMap
                (\index def ->
                    partDefView index
                        def
                        (case partDefActiveWithIndexMaybe of
                            Just ( i, partDefActive ) ->
                                if i == index then
                                    Just partDefActive

                                else
                                    Nothing

                            _ ->
                                Nothing
                        )
                )
        )


partDefView : Int -> Def.Def -> Maybe PartDefActive -> Html.Html Msg
partDefView index def partDefActiveMaybe =
    Html.div
        [ subClassList
            [ ( "partDefEditor", True )
            , ( "partDefEditor-active", partDefActiveMaybe == Just ActivePartDefSelf )
            ]
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed
                ( ActiveTo
                    (ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )))
                , True
                )
            )
        ]
        [ partDefViewNameAndType (Def.getName def) (Def.getType def) partDefActiveMaybe
        , partDefViewExpr (Def.getExpr def)
            (case partDefActiveMaybe of
                Just (ActivePartDefExpr partDefExprActive) ->
                    Just partDefExprActive

                _ ->
                    Nothing
            )
        ]


partDefViewNameAndType : Name.Name -> Type.Type -> Maybe PartDefActive -> Html.Html Msg
partDefViewNameAndType name type_ partDefActiveMaybe =
    Html.div
        [ subClass "partDefEditor-nameAndType" ]
        [ partDefViewName name (partDefActiveMaybe == Just ActivePartDefName)
        , Html.text ":"
        , partDefViewType type_ (partDefActiveMaybe == Just ActivePartDefType)
        ]


partDefViewName : Name.Name -> Bool -> Html.Html Msg
partDefViewName name isActive =
    case Name.toString name of
        Just nameString ->
            Html.div
                [ subClassList
                    [ ( "partDefEditor-name", True )
                    , ( "partDefEditor-element-active", isActive )
                    ]
                ]
                [ Html.text nameString ]

        Nothing ->
            Html.div
                [ subClassList
                    [ ( "partDefEditor-noName", True )
                    , ( "partDefEditor-element-active", isActive )
                    ]
                ]
                [ Html.text "NO NAME" ]


partDefViewType : Type.Type -> Bool -> Html.Html Msg
partDefViewType type_ isActive =
    case Type.toString type_ of
        Just nameString ->
            Html.div
                [ subClassList
                    [ ( "partDefEditor-type", True )
                    , ( "partDefEditor-element-active", isActive )
                    ]
                ]
                [ Html.text nameString ]

        Nothing ->
            Html.div
                [ subClassList
                    [ ( "partDefEditor-noType", True )
                    , ( "partDefEditor-element-active", isActive )
                    ]
                ]
                [ Html.text "NO TYPE" ]


partDefViewExpr : Expr.Expr -> Maybe PartDefExprActive -> Html.Html Msg
partDefViewExpr expr partDefExprActiveMaybe =
    Html.div
        [ subClassList
            [ ( "partDefEditor-expr", True )
            , ( "partDefEditor-element-active", partDefExprActiveMaybe == Just ActivePartDefExprSelf )
            ]
        ]
        [ Html.text ("=" ++ Expr.toString expr) ]


exprViewOpAndTermNormal : Int -> Op.Operator -> Term.Term -> List (Html.Html PartDefExprActive)
exprViewOpAndTermNormal index op term =
    [ opViewOutput op
        |> Html.map (always (ActiveExprOp index))
    , termViewOutput term
        |> Html.map (always (ActiveExprTerm index))
    ]


{-| 編集していない項の表示
-}
termViewOutput : Term.Term -> Html.Html ()
termViewOutput term =
    Html.div
        [ Html.Events.onClick ()
        , subClass "partDefEditor-term"
        ]
        [ Html.text (Term.toString term) ]


{-| 編集している項の表示
-}
termViewInputOutput : List ( Char, Bool ) -> Html.Html msg
termViewInputOutput textAreaValue =
    Html.div
        [ subClass "partDefEditor-editTarget"
        , subClass "partDefEditor-term"
        ]
        (case textAreaValue of
            _ :: _ ->
                textAreaValue
                    |> List.map
                        (\( char, bool ) ->
                            Html.div
                                [ subClass
                                    (if bool then
                                        "partDefEditor-okChar"

                                     else
                                        "partDefEditor-errChar"
                                    )
                                ]
                                [ Html.text (String.fromChar char) ]
                        )

            [] ->
                [ Html.text "TERM" ]
        )


opViewOutput : Op.Operator -> Html.Html ()
opViewOutput op =
    Html.div
        [ Html.Events.onClick ()
        , subClass "partDefEditor-op"
        ]
        [ Html.text (Op.toString op |> Maybe.withDefault "?") ]


opViewInputOutput : List ( Char, Bool ) -> Html.Html msg
opViewInputOutput textAreaValue =
    Html.div
        [ subClass "partDefEditor-editTarget"
        , subClass "partDefEditor-op"
        ]
        (textAreaValue
            |> List.map
                (\( char, bool ) ->
                    Html.div
                        [ subClass
                            (if bool then
                                "partDefEditor-okChar"

                             else
                                "partDefEditor-errChar"
                            )
                        ]
                        [ Html.text (String.fromChar char) ]
                )
        )


{-| 移動モードの式のキャレット
-}
moveModeCaret : Html.Html msg
moveModeCaret =
    Html.div
        [ subClass "partDefEditor-caretBox" ]
        [ Html.div
            [ subClass "partDefEditor-caret" ]
            []
        ]


intermediateExprView : Html.Html Msg
intermediateExprView =
    Html.div
        []
        [ Html.text "評価エリア" ]


inputTextArea : Html.Html Msg
inputTextArea =
    Html.textarea
        [ subClass "partDefEditor-hideTextArea"
        , Html.Attributes.id "edit"
        ]
        []


addDefButton : Html.Html Msg
addDefButton =
    Html.button
        [ Html.Events.onClick AddPartDef
        , subClass "partDefEditor-addPartDef"
        ]
        [ Html.text "+ 新しいパーツの定義" ]


subClass : String -> Html.Attribute msg
subClass class =
    case class of
        "" ->
            Html.Attributes.class "moduleEditor"

        _ ->
            Html.Attributes.class ("moduleEditor-" ++ class)


subClassList : List ( String, Bool ) -> Html.Attribute msg
subClassList =
    List.map (Tuple.mapFirst ((++) "moduleEditor-"))
        >> Html.Attributes.classList
