module Panel.Editor.Module exposing (Emit(..), Model, Msg(..), getModuleRef, initModel, isFocusDefaultUi, update, view)

import Html
import Html.Attributes
import Html.Events
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
        , focus : Focus
        }


type Msg
    = FocusToNone
    | FocusToDescription
    | FocusToPartEditor Int PartEditorFocus
    | InputInDescription String
    | InputInPartEditor String
    | SelectLeft
    | SelectRight
    | SelectUp
    | SelectDown
    | FocusThisEditor
    | BlurThisEditor
    | ToEditMode
    | Confirm
    | AddPartDef


type Emit
    = EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitChangeName { name : Name.Name, index : Int, ref : Project.Source.ModuleRef }
    | EmitChangeType { type_ : Type.Type, index : Int, ref : Project.Source.ModuleRef }
    | EmitChangeExpr { expr : Expr.Expr, index : Int, ref : Project.Source.ModuleRef }
    | EmitAddPartDef { ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String


type Focus
    = FocusNone
    | FocusDescription
    | FocusPartEditor Int PartEditorFocus


type PartEditorFocus
    = PartEditorEdit PartFocusEdit (List ( Char, Bool ))
    | PartEditorMove PartFocusMove


type PartFocusEdit
    = EditName
    | EditType
    | EditExprHeadTerm -- [abc]+ def + 28
    | EditExprOp Int --    abc[+]def + 28 Intの範囲は0..254
    | EditExprTerm Int --  abc +[def]+ 28 Intの範囲は0..254


type PartFocusMove
    = MoveName -- [name]: Type
    | MoveType --  name :[Type]
    | MoveExprHead -- |abc + def + 28
    | MoveHeadTerm --  abc|+ def + 28
    | MoveOp Int --    abc +|def + 28  Intの範囲は0..254
    | MoveTerm Int --  abc + def|+ 28  Intの範囲は0..254


initModel : Project.Source.ModuleRef -> Model
initModel moduleRef =
    Model
        { moduleRef = moduleRef
        , focus = FocusNone
        }


getModuleRef : Model -> Project.Source.ModuleRef
getModuleRef (Model { moduleRef }) =
    moduleRef


{-| テキストエリアにフォーカスが当たっているか。
当たっていたらKey.ArrowLeftなどのキー入力をpreventDefaultしない。ブラウザの基本機能(訂正など)を阻止しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi (Model { focus }) =
    case focus of
        FocusDescription ->
            Just Panel.DefaultUi.TextArea

        FocusPartEditor _ (PartEditorEdit _ _) ->
            Just Panel.DefaultUi.TextField

        _ ->
            Nothing


update : Msg -> Project.Project -> Model -> ( Model, List Emit )
update msg project (Model rec) =
    let
        targetModule =
            project
                |> Project.getSource
                |> Project.Source.getModule rec.moduleRef
    in
    case msg of
        FocusToNone ->
            ( Model { rec | focus = FocusNone }
            , []
            )

        FocusToDescription ->
            ( Model
                { rec
                    | focus = FocusDescription
                }
            , [ EmitSetTextAreaValue (ModuleWithCache.getReadMe targetModule) ]
            )

        FocusToPartEditor index partFocus ->
            ( Model
                { rec
                    | focus = FocusPartEditor index partFocus
                }
            , [ EmitSetTextAreaValue "" ]
            )

        InputInDescription text ->
            ( Model
                { rec
                    | focus = FocusDescription
                }
            , [ EmitChangeReadMe { text = text, ref = rec.moduleRef } ]
            )

        InputInPartEditor text ->
            inputInPartEditor text (Model rec)

        SelectLeft ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor index (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor index (PartEditorMove (partEditorMoveLeft partMove)) }

                FocusPartEditor _ (PartEditorEdit _ _) ->
                    Model rec
            , []
            )

        SelectRight ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor index (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor index (PartEditorMove (partEditorMoveRight partMove)) }

                FocusPartEditor _ (PartEditorEdit _ _) ->
                    Model rec
            , []
            )

        FocusThisEditor ->
            ( Model rec
            , case rec.focus of
                FocusNone ->
                    []

                FocusDescription ->
                    [ EmitSetTextAreaValue (ModuleWithCache.getReadMe targetModule) ]

                FocusPartEditor _ _ ->
                    []
            )

        BlurThisEditor ->
            ( case rec.focus of
                FocusPartEditor index (PartEditorEdit edit _) ->
                    Model { rec | focus = FocusPartEditor index (PartEditorMove (partEditorEditToMove edit)) }

                _ ->
                    Model rec
            , []
            )

        SelectUp ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor index (PartEditorMove partMove) ->
                    let
                        ( newMove, newIndex ) =
                            partEditorMoveUp partMove index
                    in
                    Model
                        { rec
                            | focus = FocusPartEditor newIndex (PartEditorMove newMove)
                        }

                FocusPartEditor _ (PartEditorEdit _ _) ->
                    Model rec
            , []
            )

        SelectDown ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor index (PartEditorMove partMove) ->
                    let
                        ( newMove, newIndex ) =
                            partEditorMoveDown partMove index (ModuleWithCache.getDefNum targetModule)
                    in
                    Model
                        { rec
                            | focus = FocusPartEditor newIndex (PartEditorMove newMove)
                        }

                FocusPartEditor _ (PartEditorEdit _ _) ->
                    Model rec
            , []
            )

        ToEditMode ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor index (PartEditorMove move) ->
                    Model { rec | focus = FocusPartEditor index (PartEditorEdit (partEditorMoveToEdit move) []) }

                FocusPartEditor _ (PartEditorEdit _ _) ->
                    Model rec
            , []
            )

        Confirm ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor _ (PartEditorMove _) ->
                    Model rec

                FocusPartEditor index (PartEditorEdit edit _) ->
                    Model { rec | focus = FocusPartEditor index (PartEditorMove (partEditorEditToMove edit)) }
            , [ EmitSetTextAreaValue "" ]
            )

        AddPartDef ->
            ( Model rec
            , [ EmitAddPartDef { ref = rec.moduleRef } ]
            )


{-| パーツエディタの移動モードで左に移動する
-}
partEditorMoveLeft : PartFocusMove -> PartFocusMove
partEditorMoveLeft partMove =
    case partMove of
        MoveName ->
            MoveName

        MoveType ->
            MoveName

        MoveExprHead ->
            MoveType

        _ ->
            partMove


{-| パーツエディタの移動モードで右に移動する
-}
partEditorMoveRight : PartFocusMove -> PartFocusMove
partEditorMoveRight partMove =
    case partMove of
        MoveName ->
            MoveType

        MoveType ->
            MoveExprHead

        _ ->
            partMove


{-| パーツエディタの移動モードで上に移動する
-}
partEditorMoveUp : PartFocusMove -> Int -> ( PartFocusMove, Int )
partEditorMoveUp position index =
    case position of
        MoveName ->
            if index == 0 then
                ( MoveName, 0 )

            else
                ( MoveExprHead, index - 1 )

        MoveType ->
            if index == 0 then
                ( MoveType, 0 )

            else
                ( MoveExprHead, index - 1 )

        MoveExprHead ->
            ( MoveName, index )

        _ ->
            ( position, index )


{-| パーツエディタの移動モードで下に移動する
-}
partEditorMoveDown : PartFocusMove -> Int -> Int -> ( PartFocusMove, Int )
partEditorMoveDown position index defNum =
    case position of
        MoveName ->
            ( MoveExprHead, index )

        MoveType ->
            ( MoveExprHead, index )

        MoveExprHead ->
            if index == defNum - 1 then
                ( MoveExprHead, index )

            else
                ( MoveName, index + 1 )

        _ ->
            ( position, index )


{-| パーツエディタの移動モードから編集モードに変える
-}
partEditorMoveToEdit : PartFocusMove -> PartFocusEdit
partEditorMoveToEdit move =
    case move of
        MoveName ->
            EditName

        MoveType ->
            EditType

        MoveExprHead ->
            EditExprHeadTerm

        _ ->
            EditExprHeadTerm


{-| パーツエディタの編集モードから移動モードに変える
-}
partEditorEditToMove : PartFocusEdit -> PartFocusMove
partEditorEditToMove edit =
    case edit of
        EditName ->
            MoveName

        EditType ->
            MoveType

        EditExprHeadTerm ->
            MoveExprHead

        EditExprTerm 0 ->
            MoveHeadTerm

        EditExprOp n ->
            MoveOp n

        EditExprTerm n ->
            MoveTerm (n - 1)


{-| パーツエディタで<textaera>に何かを入力したとき
-}
inputInPartEditor : String -> Model -> ( Model, List Emit )
inputInPartEditor string (Model rec) =
    case rec.focus of
        FocusNone ->
            ( Model rec
            , []
            )

        FocusDescription ->
            ( Model rec
            , []
            )

        FocusPartEditor index (PartEditorMove move) ->
            let
                { edit, textAreaValue, name, type_, expr, reset } =
                    parseSimple string (partEditorMoveToEdit move)
            in
            ( Model
                { rec | focus = FocusPartEditor index (PartEditorEdit edit textAreaValue) }
            , Utility.ListExtra.takeFromMaybe
                [ name |> Maybe.map (\n -> EmitChangeName { name = n, index = index, ref = rec.moduleRef })
                , type_ |> Maybe.map (\t -> EmitChangeType { type_ = t, index = index, ref = rec.moduleRef })
                , expr |> Maybe.map (\e -> EmitChangeExpr { expr = e, index = index, ref = rec.moduleRef })
                , if reset then
                    Just (EmitSetTextAreaValue (textAreaValue |> List.map Tuple.first |> String.fromList))

                  else
                    Nothing
                ]
            )

        FocusPartEditor index (PartEditorEdit oldEdit _) ->
            let
                { edit, textAreaValue, name, type_, expr, reset } =
                    parseSimple string oldEdit
            in
            ( Model
                { rec | focus = FocusPartEditor index (PartEditorEdit edit textAreaValue) }
            , Utility.ListExtra.takeFromMaybe
                [ name |> Maybe.map (\n -> EmitChangeName { name = n, index = index, ref = rec.moduleRef })
                , type_ |> Maybe.map (\t -> EmitChangeType { type_ = t, index = index, ref = rec.moduleRef })
                , expr |> Maybe.map (\e -> EmitChangeExpr { expr = e, index = index, ref = rec.moduleRef })
                , if reset then
                    Just (EmitSetTextAreaValue (textAreaValue |> List.map Tuple.first |> String.fromList))

                  else
                    Nothing
                ]
            )


parseSimple :
    String
    -> PartFocusEdit
    ->
        { edit : PartFocusEdit
        , textAreaValue : List ( Char, Bool )
        , name : Maybe Name.Name
        , type_ : Maybe Type.Type
        , expr : Maybe Expr.Expr
        , reset : Bool
        }
parseSimple string edit =
    case edit of
        EditName ->
            case Parser.beginWithName (Parser.SimpleChar.fromString string) of
                Parser.BeginWithNameEndName { name, textAreaValue } ->
                    { edit = EditName
                    , textAreaValue = textAreaValue
                    , name = Just name
                    , type_ = Nothing
                    , expr = Nothing
                    , reset = False
                    }

                Parser.BeginWithNameEndType { name, type_, textAreaValue } ->
                    { edit = EditType
                    , textAreaValue = textAreaValue
                    , name = Just name
                    , type_ = Just type_
                    , expr = Nothing
                    , reset = True
                    }

                Parser.BeginWithNameEndExprTerm { name, type_, headTerm, termAndOpList, textAreaValue } ->
                    { edit =
                        if termAndOpList == [] then
                            EditExprHeadTerm

                        else
                            EditExprTerm (List.length termAndOpList - 1)
                    , textAreaValue = textAreaValue
                    , name = Just name
                    , type_ = Just type_
                    , expr = Just (Expr.make headTerm termAndOpList)
                    , reset = True
                    }

                Parser.BeginWithNameEndExprOp { name, type_, headTerm, termAndOpList, lastOp, textAreaValue } ->
                    { edit = EditExprOp (List.length termAndOpList - 1)
                    , textAreaValue = textAreaValue
                    , name = Just name
                    , type_ = Just type_
                    , expr = Just (Expr.make headTerm (termAndOpList ++ [ ( lastOp, Term.none ) ]))
                    , reset = True
                    }

        EditType ->
            case Parser.beginWithType (Parser.SimpleChar.fromString string) of
                Parser.BeginWithTypeEndType { type_, textAreaValue } ->
                    { edit = EditType
                    , textAreaValue = textAreaValue
                    , name = Nothing
                    , type_ = Just type_
                    , expr = Nothing
                    , reset = False
                    }

                Parser.BeginWithTypeEndExprTerm { type_, headTerm, termAndOpList, textAreaValue } ->
                    { edit =
                        if termAndOpList == [] then
                            EditExprHeadTerm

                        else
                            EditExprTerm (List.length termAndOpList - 1)
                    , textAreaValue = textAreaValue
                    , name = Nothing
                    , type_ = Just type_
                    , expr = Just (Expr.make headTerm termAndOpList)
                    , reset = True
                    }

                Parser.BeginWithTypeEndExprOp { type_, headTerm, termAndOpList, lastOp, textAreaValue } ->
                    { edit = EditExprOp (List.length termAndOpList - 1)
                    , textAreaValue = []
                    , name = Nothing
                    , type_ = Just type_
                    , expr = Just (Expr.make headTerm (termAndOpList ++ [ ( lastOp, Term.none ) ]))
                    , reset = True
                    }

        EditExprHeadTerm ->
            case Parser.beginWithExprHead (Parser.SimpleChar.fromString string) of
                Parser.BeginWithExprHeadEndTerm { headTerm, opAndTermList, textAreaValue } ->
                    { edit =
                        if opAndTermList == [] then
                            EditExprHeadTerm

                        else
                            EditExprTerm (List.length opAndTermList - 1)
                    , textAreaValue = textAreaValue
                    , name = Nothing
                    , type_ = Nothing
                    , expr = Just (Expr.make headTerm opAndTermList)
                    , reset = False
                    }

                Parser.BeginWithExprHeadEndOp { headTerm, opAndTermList, lastOp, textAreaValue } ->
                    { edit = EditExprOp (List.length opAndTermList - 1)
                    , textAreaValue = textAreaValue
                    , name = Nothing
                    , type_ = Nothing
                    , expr = Just (Expr.make headTerm (opAndTermList ++ [ ( lastOp, Term.none ) ]))
                    , reset = True
                    }

        _ ->
            { edit = edit
            , textAreaValue = []
            , name = Nothing
            , type_ = Nothing
            , expr = Nothing
            , reset = False
            }


{-| モジュールエディタのview。
プロジェクト全体のデータと
このエディタが全体にとってフォーカスが当たっているか当たっていないかのBoolと
モジュールエディタのModelで見た目を決める
-}
view : Project.Project -> Bool -> Model -> { title : String, body : List (Html.Html Msg) }
view project isEditorItemFocus (Model { moduleRef, focus }) =
    let
        targetModule =
            project
                |> Project.getSource
                |> Project.Source.getModule moduleRef
    in
    { title = Project.Label.toCapitalString (ModuleWithCache.getName targetModule)
    , body =
        [ Html.div
            []
            [ Html.text (focusToString focus) ]
        , descriptionView (ModuleWithCache.getReadMe targetModule) (isEditorItemFocus && focus == FocusDescription)
        , partDefinitionsView
            isEditorItemFocus
            (case focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Nothing

                FocusPartEditor index partEditorFocus ->
                    Just ( index, partEditorFocus )
            )
            (ModuleWithCache.getDefList targetModule |> List.map Tuple.first)
        ]
    }


focusToString : Focus -> String
focusToString focus =
    case focus of
        FocusNone ->
            "フォーカスなし"

        FocusDescription ->
            "概要欄にフォーカス"

        FocusPartEditor index partEditorFocus ->
            "パーツエディタにフォーカス "
                ++ String.fromInt index
                ++ " "
                ++ (case partEditorFocus of
                        PartEditorEdit partEdit _ ->
                            "テキストで編集 "
                                ++ (case partEdit of
                                        EditName ->
                                            "名前"

                                        EditType ->
                                            "型"

                                        EditExprHeadTerm ->
                                            "先頭のTerm"

                                        EditExprOp n ->
                                            String.fromInt n ++ "番目の演算子"

                                        EditExprTerm n ->
                                            String.fromInt n ++ "番目の項"
                                   )

                        PartEditorMove partMove ->
                            "移動モード(ボタンやショートカットーで操作)"
                                ++ (case partMove of
                                        MoveName ->
                                            "名前"

                                        MoveType ->
                                            "型"

                                        MoveExprHead ->
                                            "|a + b + c"

                                        MoveHeadTerm ->
                                            " a|+ b + c"

                                        MoveOp n ->
                                            "+|" ++ String.fromInt n

                                        MoveTerm n ->
                                            "a|" ++ String.fromInt n
                                   )
                   )



{- ===== descriptionView ===== -}


descriptionView : String -> Bool -> Html.Html Msg
descriptionView description editHere =
    Html.div
        [ Html.Attributes.class "moduleEditor-description" ]
        [ Html.text "Description"
        , Html.div [ Html.Attributes.class "moduleEditor-description-inputArea" ]
            [ Html.div
                [ Html.Attributes.class "moduleEditor-description-measure" ]
                [ Html.div
                    [ Html.Attributes.class "moduleEditor-description-measure-text" ]
                    (lfToBr description)
                , Html.textarea
                    ([ Html.Attributes.classList
                        [ ( "moduleEditor-description-textarea", True )
                        , ( "moduleEditor-description-textarea-focus", editHere )
                        ]
                     ]
                        ++ (if editHere then
                                [ Html.Events.onInput InputInDescription
                                , Html.Attributes.id "edit"
                                ]

                            else
                                [ Html.Attributes.property "value" (Json.Encode.string description)
                                , Html.Events.onClick FocusToDescription
                                ]
                           )
                    )
                    []
                ]
            ]
        ]


lfToBr : String -> List (Html.Html Msg)
lfToBr string =
    let
        lineList =
            string
                |> String.lines
    in
    (lineList
        |> List.map Html.text
        |> List.intersperse (Html.br [] [])
    )
        ++ (if Utility.ListExtra.last lineList == Just "" then
                [ Html.div [ Html.Attributes.class "moduleEditor-description-measure-lastLine" ] [ Html.text "_" ] ]

            else
                []
           )



{- ===== part definitions ===== -}


{-| モジュールエディタのメインの要素であるパーツエディタを表示する
-}
partDefinitionsView : Bool -> Maybe ( Int, PartEditorFocus ) -> List Def.Def -> Html.Html Msg
partDefinitionsView isEditorItemFocus partEditorFocus defList =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefinitions" ]
        [ Html.text "Part Definitions"
        , partDefinitionEditorList isEditorItemFocus partEditorFocus defList
        ]


{-| 複数のパーツエディタが並んだもの
-}
partDefinitionEditorList : Bool -> Maybe ( Int, PartEditorFocus ) -> List Def.Def -> Html.Html Msg
partDefinitionEditorList isEditorItemFocus partEditorFocus defList =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditorList" ]
        (case partEditorFocus of
            Just ( focusIndex, partFocus ) ->
                (defList
                    |> List.indexedMap
                        (\index def ->
                            if index == focusIndex then
                                partDefinitionEditor (Just partFocus) def index

                            else
                                partDefinitionEditor Nothing def index
                        )
                )
                    ++ (if isEditorItemFocus then
                            [ inputTextArea, addDefButton ]

                        else
                            [ addDefButton ]
                       )

            Nothing ->
                (defList |> List.indexedMap (\index def -> partDefinitionEditor Nothing def index))
                    ++ [ addDefButton ]
        )


{-| 1つのパーツエディタ
-}
partDefinitionEditor : Maybe PartEditorFocus -> Def.Def -> Int -> Html.Html Msg
partDefinitionEditor partEditorFocus def index =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor" ]
        [ nameAndTypeView partEditorFocus (Def.getName def) (Def.getType def) index
        , exprView partEditorFocus (Def.getExpr def) index
        , intermediateExprView
        ]


{-| 名前と型の表示
-}
nameAndTypeView : Maybe PartEditorFocus -> Name.Name -> Type.Type -> Int -> Html.Html Msg
nameAndTypeView partEditorFocus name type_ index =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-nameAndType" ]
        [ case partEditorFocus of
            Just (PartEditorEdit EditName textAreaValue) ->
                nameViewInputOutput textAreaValue

            Just (PartEditorMove MoveName) ->
                nameViewOutput True name index

            _ ->
                nameViewOutput False name index
        , Html.text ":"
        , case partEditorFocus of
            Just (PartEditorEdit EditType textAreaValue) ->
                typeViewInputOutput textAreaValue

            Just (PartEditorMove MoveType) ->
                typeViewOutput True type_ index

            _ ->
                typeViewOutput False type_ index
        ]


{-| 編集していない名前の表示
-}
nameViewOutput : Bool -> Name.Name -> Int -> Html.Html Msg
nameViewOutput isFocus name index =
    Html.div
        (if isFocus then
            [ Html.Attributes.class "moduleEditor-partDefEditor-name"
            , Html.Attributes.class "focused"
            ]

         else
            [ Html.Events.onClick (FocusToPartEditor index (PartEditorMove MoveName))
            , Html.Attributes.class "moduleEditor-partDefEditor-name"
            ]
        )
        [ Html.text (Name.toString name |> Maybe.withDefault "<?>") ]


{-| 編集している名前の表示
-}
nameViewInputOutput : List ( Char, Bool ) -> Html.Html Msg
nameViewInputOutput textAreaValue =
    Html.div
        [ Html.Attributes.class "editTarget"
        , Html.Attributes.class "moduleEditor-partDefEditor-name"
        ]
        (case textAreaValue of
            _ :: _ ->
                textAreaValue
                    |> List.map
                        (\( char, bool ) ->
                            Html.div
                                [ Html.Attributes.class
                                    (if bool then
                                        "nameOkChar"

                                     else
                                        "errChar"
                                    )
                                ]
                                [ Html.text (String.fromChar char) ]
                        )

            [] ->
                [ Html.text "NAME" ]
        )


{-| 編集していない型の表示
-}
typeViewOutput : Bool -> Type.Type -> Int -> Html.Html Msg
typeViewOutput isSelect type_ index =
    Html.div
        (if isSelect then
            [ Html.Attributes.class "moduleEditor-partDefEditor-name"
            , Html.Attributes.class "focused"
            ]

         else
            [ Html.Events.onClick (FocusToPartEditor index (PartEditorMove MoveType))
            , Html.Attributes.class "moduleEditor-partDefEditor-name"
            ]
        )
        [ Html.text (Type.toString type_ |> Maybe.withDefault "<?>") ]


{-| 編集している型の表示
-}
typeViewInputOutput : List ( Char, Bool ) -> Html.Html Msg
typeViewInputOutput textAreaValue =
    Html.div
        [ Html.Attributes.class "editTarget"
        , Html.Attributes.class "moduleEditor-partDefEditor-type"
        ]
        (case textAreaValue of
            _ :: _ ->
                textAreaValue
                    |> List.map
                        (\( char, bool ) ->
                            Html.div
                                [ Html.Attributes.class
                                    (if bool then
                                        "nameOkChar"

                                     else
                                        "errChar"
                                    )
                                ]
                                [ Html.text (String.fromChar char) ]
                        )

            [] ->
                [ Html.text "TYPE" ]
        )


{-| 式の表示
-}
exprView : Maybe PartEditorFocus -> Expr.Expr -> Int -> Html.Html Msg
exprView partEditorFocus expr index =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-expr" ]
        ((Html.text "="
            :: (case partEditorFocus of
                    Just (PartEditorMove MoveExprHead) ->
                        [ moveModeCaret, termViewOutput (Expr.getHead expr) ]

                    Just (PartEditorMove MoveHeadTerm) ->
                        [ termViewOutput (Expr.getHead expr), moveModeCaret ]

                    Just (PartEditorEdit EditExprHeadTerm textAreaValue) ->
                        [ termViewInputOutput textAreaValue ]

                    _ ->
                        [ termViewOutput (Expr.getHead expr) ]
               )
         )
            |> List.map
                (Html.map
                    (always
                        (FocusToPartEditor index (PartEditorMove MoveExprHead))
                    )
                )
        )


{-| 編集していない項の表示
-}
termViewOutput : Term.Term -> Html.Html ()
termViewOutput term =
    Html.div
        [ Html.Events.onClick ()
        , Html.Attributes.class "moduleEditor-partDefEditor-term"
        ]
        [ Html.text (Term.toString term) ]


{-| 編集している項の表示
-}
termViewInputOutput : List ( Char, Bool ) -> Html.Html msg
termViewInputOutput textAreaValue =
    Html.div
        [ Html.Attributes.class "editTarget"
        , Html.Attributes.class "moduleEditor-partDefEditor-term"
        ]
        (case textAreaValue of
            _ :: _ ->
                textAreaValue
                    |> List.map
                        (\( char, bool ) ->
                            Html.div
                                [ Html.Attributes.class
                                    (if bool then
                                        "nameOkChar"

                                     else
                                        "errChar"
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
        , Html.Attributes.class "moduleEditor-partDefEditor-op"
        ]
        [ Html.text (Op.toString op |> Maybe.withDefault "?") ]


opViewInputOutput : List ( Char, Bool ) -> Html.Html msg
opViewInputOutput textAreaValue =
    Html.div
        [ Html.Attributes.class "editTarget"
        , Html.Attributes.class "moduleEditor-partDefEditor-op"
        ]
        (case textAreaValue of
            _ :: _ ->
                textAreaValue
                    |> List.map
                        (\( char, bool ) ->
                            Html.div
                                [ Html.Attributes.class
                                    (if bool then
                                        "nameOkChar"

                                     else
                                        "errChar"
                                    )
                                ]
                                [ Html.text (String.fromChar char) ]
                        )

            [] ->
                [ Html.text "OP" ]
        )


{-| 移動モードの式のキャレット
-}
moveModeCaret : Html.Html msg
moveModeCaret =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-caretBox" ]
        [ Html.div
            [ Html.Attributes.class "moduleEditor-partDefEditor-caret" ]
            []
        ]


intermediateExprView : Html.Html Msg
intermediateExprView =
    Html.div
        []
        [ Html.text "(1+1) ..クリックして評価" ]


inputTextArea : Html.Html Msg
inputTextArea =
    Html.textarea
        [ Html.Attributes.class "moduleEditor-partDefEditor-hideTextArea"
        , Html.Attributes.id "edit"
        , Html.Events.onInput InputInPartEditor
        ]
        []


addDefButton : Html.Html Msg
addDefButton =
    Html.button
        [ Html.Events.onClick AddPartDef
        , Html.Attributes.class "moduleEditor-partDefEditor-addPartDef"
        ]
        [ Html.text "+ 新しいパーツの定義" ]
