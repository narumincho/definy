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
    | FocusToPartEditor PartEditorFocus
    | InputInDescription String
    | InputInPartEditor String
    | SelectLeft
    | SelectRight
    | SelectUp
    | SelectDown
    | ActiveThisEditor
    | ToEditMode
    | Confirm
    | AddPartDef


type Emit
    = EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitChangeName { name : Name.Name, ref : Project.Source.ModuleRef }
    | EmitAddPartDef { ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String


type Focus
    = FocusNone
    | FocusDescription
    | FocusPartEditor PartEditorFocus


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

        FocusPartEditor (PartEditorEdit _ _) ->
            Just Panel.DefaultUi.TextField

        _ ->
            Nothing


update : Msg -> Project.Project -> Model -> ( Model, Maybe Emit )
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
            , Nothing
            )

        FocusToDescription ->
            ( Model
                { rec
                    | focus = FocusDescription
                }
            , Just (EmitSetTextAreaValue (ModuleWithCache.getReadMe targetModule))
            )

        FocusToPartEditor partFocus ->
            ( Model
                { rec
                    | focus = FocusPartEditor partFocus
                }
            , Just (EmitSetTextAreaValue "")
            )

        InputInDescription text ->
            ( Model
                { rec
                    | focus = FocusDescription
                }
            , Just (EmitChangeReadMe { text = text, ref = rec.moduleRef })
            )

        InputInPartEditor text ->
            let
                { name, textAreaValue } =
                    parseSimple text
            in
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove move) ->
                    Model
                        { rec | focus = FocusPartEditor (PartEditorEdit (partEditorMoveToEdit move) textAreaValue) }

                FocusPartEditor (PartEditorEdit edit _) ->
                    Model
                        { rec | focus = FocusPartEditor (PartEditorEdit edit textAreaValue) }
            , Just (EmitChangeName { name = name, ref = rec.moduleRef })
            )

        SelectLeft ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorMoveLeft partMove)) }

                FocusPartEditor (PartEditorEdit _ _) ->
                    Model rec
            , Nothing
            )

        SelectRight ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorMoveRight partMove)) }

                FocusPartEditor (PartEditorEdit _ _) ->
                    Model rec
            , Nothing
            )

        ActiveThisEditor ->
            ( Model rec
            , case rec.focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Just (EmitSetTextAreaValue (ModuleWithCache.getReadMe targetModule))

                FocusPartEditor _ ->
                    Nothing
            )

        SelectUp ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorMoveUp partMove)) }

                FocusPartEditor (PartEditorEdit _ _) ->
                    Model rec
            , Nothing
            )

        SelectDown ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorMoveDown partMove)) }

                FocusPartEditor (PartEditorEdit _ _) ->
                    Model rec
            , Nothing
            )

        ToEditMode ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove move) ->
                    Model { rec | focus = FocusPartEditor (PartEditorEdit (partEditorMoveToEdit move) []) }

                FocusPartEditor (PartEditorEdit _ _) ->
                    Model rec
            , Nothing
            )

        Confirm ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove _) ->
                    Model rec

                FocusPartEditor (PartEditorEdit edit _) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorEditToMove edit)) }
            , Nothing
            )

        AddPartDef ->
            ( Model rec
            , Just (EmitAddPartDef { ref = rec.moduleRef })
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
partEditorMoveUp : PartFocusMove -> PartFocusMove
partEditorMoveUp position =
    case position of
        MoveName ->
            MoveName

        MoveType ->
            MoveType

        MoveExprHead ->
            MoveName

        _ ->
            position


{-| パーツエディタの移動モードで下に移動する
-}
partEditorMoveDown : PartFocusMove -> PartFocusMove
partEditorMoveDown position =
    case position of
        MoveName ->
            MoveExprHead

        MoveType ->
            MoveExprHead

        MoveExprHead ->
            MoveExprHead

        _ ->
            position


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


parseSimple : String -> { name : Name.Name, textAreaValue : List ( Char, Bool ) }
parseSimple string =
    case Parser.beginWithName (Parser.SimpleChar.fromString string) of
        Parser.BeginWithNameEndName { name, textAreaValue } ->
            { name = name
            , textAreaValue = textAreaValue
            }

        Parser.BeginWithNameEndType { name } ->
            { name = name
            , textAreaValue = []
            }

        Parser.BeginWithNameEndExprTerm { name } ->
            { name = name
            , textAreaValue = []
            }

        Parser.BeginWithNameEndExprOp { name } ->
            { name = name
            , textAreaValue = []
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
            (case focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Nothing

                FocusPartEditor partEditorFocus ->
                    Just partEditorFocus
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

        FocusPartEditor partEditorFocus ->
            "パーツエディタにフォーカス "
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
partDefinitionsView : Maybe PartEditorFocus -> List Def.Def -> Html.Html Msg
partDefinitionsView partEditorFocus defList =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefinitions" ]
        [ Html.text "Part Definitions"
        , partDefinitionEditorList partEditorFocus defList
        ]


{-| 複数のパーツエディタが並んだもの
-}
partDefinitionEditorList : Maybe PartEditorFocus -> List Def.Def -> Html.Html Msg
partDefinitionEditorList partEditorFocus defList =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditorList" ]
        ((defList
            |> List.map (partDefinitionEditor partEditorFocus)
         )
            ++ [ addDefButton ]
        )


{-| 1つのパーツエディタ
-}
partDefinitionEditor : Maybe PartEditorFocus -> Def.Def -> Html.Html Msg
partDefinitionEditor partEditorFocus def =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor" ]
        ([ nameAndTypeView partEditorFocus (Def.getName def) (Def.getType def)
         , exprView partEditorFocus
         , intermediateExprView
         ]
            ++ (case partEditorFocus of
                    Just _ ->
                        [ inputTextArea ]

                    Nothing ->
                        []
               )
        )


nameAndTypeView : Maybe PartEditorFocus -> Name.Name -> Type.Type -> Html.Html Msg
nameAndTypeView partEditorFocus name type_ =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-nameAndType" ]
        [ case partEditorFocus of
            Just (PartEditorEdit EditName textAreaValue) ->
                nameViewInputOutput textAreaValue

            Just (PartEditorMove MoveName) ->
                nameViewOutput True name

            _ ->
                nameViewOutput False name
        , Html.text ":"
        , case partEditorFocus of
            Just (PartEditorEdit EditType textAreaValue) ->
                typeViewInputOutput textAreaValue

            Just (PartEditorMove MoveType) ->
                typeViewOutput True type_

            _ ->
                typeViewOutput False type_
        ]


nameViewOutput : Bool -> Name.Name -> Html.Html Msg
nameViewOutput isFocus name =
    Html.div
        (if isFocus then
            [ Html.Attributes.class "moduleEditor-partDefEditor-name"
            , Html.Attributes.class "focused"
            ]

         else
            [ Html.Events.onClick (FocusToPartEditor (PartEditorMove MoveName))
            , Html.Attributes.class "moduleEditor-partDefEditor-name"
            ]
        )
        [ Html.text (Name.toString name |> Maybe.withDefault "<?>") ]


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


typeViewOutput : Bool -> Type.Type -> Html.Html Msg
typeViewOutput isSelect type_ =
    Html.div
        (if isSelect then
            [ Html.Attributes.class "moduleEditor-partDefEditor-name"
            , Html.Attributes.class "focused"
            ]

         else
            [ Html.Events.onClick (FocusToPartEditor (PartEditorMove MoveType))
            , Html.Attributes.class "moduleEditor-partDefEditor-name"
            ]
        )
        [ Html.text (Type.toString type_ |> Maybe.withDefault "<?>") ]


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


exprView : Maybe PartEditorFocus -> Html.Html Msg
exprView partEditorFocus =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-expr" ]
        ([ Html.text "="
         ]
            ++ (if partEditorFocus == Just (PartEditorMove MoveExprHead) then
                    [ caret ]

                else
                    []
               )
        )


caret : Html.Html Msg
caret =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefEditor-caret" ]
        []


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
