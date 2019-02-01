module Panel.Editor.Module exposing (Emit(..), Model, Msg(..), getModuleRef, initModel, isFocusTextArea, update, view)

import Html
import Html.Attributes
import Html.Events
import Json.Decode
import Json.Encode
import Project
import Project.Label
import Project.Source
import Project.Source.Module.Def
import Project.Source.Module.Def.Name
import Project.Source.ModuleWithCache
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
    | InputReadMe String
    | SelectLeft
    | SelectRight
    | SelectUp
    | SelectDown
    | ActiveThisEditor


type Emit
    = EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String


type Focus
    = FocusNone
    | FocusDescription
    | FocusPartEditor PartEditorFocus


type PartEditorFocus
    = PartEditorEdit PartFocusEdit
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
isFocusTextArea : Model -> Bool
isFocusTextArea (Model { focus }) =
    case focus of
        FocusDescription ->
            True

        _ ->
            False


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
            , Just (EmitSetTextAreaValue (Project.Source.ModuleWithCache.getReadMe targetModule))
            )

        FocusToPartEditor partFocus ->
            ( Model
                { rec
                    | focus = FocusPartEditor partFocus
                }
            , Nothing
            )

        InputReadMe text ->
            ( Model
                { rec
                    | focus = FocusDescription
                }
            , Just (EmitChangeReadMe { text = text, ref = rec.moduleRef })
            )

        SelectLeft ->
            ( case rec.focus of
                FocusNone ->
                    Model rec

                FocusDescription ->
                    Model rec

                FocusPartEditor (PartEditorMove partMove) ->
                    Model { rec | focus = FocusPartEditor (PartEditorMove (partEditorMoveLeft partMove)) }

                FocusPartEditor (PartEditorEdit _) ->
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

                FocusPartEditor (PartEditorEdit _) ->
                    Model rec
            , Nothing
            )

        ActiveThisEditor ->
            ( Model rec
            , case rec.focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Just (EmitSetTextAreaValue (Project.Source.ModuleWithCache.getReadMe targetModule))

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

                FocusPartEditor (PartEditorEdit _) ->
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

                FocusPartEditor (PartEditorEdit _) ->
                    Model rec
            , Nothing
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
    { title = Project.Label.toCapitalString (Project.Source.ModuleWithCache.getName targetModule)
    , body =
        [ Html.div
            []
            [ Html.text (focusToString focus) ]
        , descriptionView (Project.Source.ModuleWithCache.getReadMe targetModule) (isEditorItemFocus && focus == FocusDescription)
        , partDefinitionsView
            (case focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Nothing

                FocusPartEditor partEditorFocus ->
                    Just partEditorFocus
            )
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
                        PartEditorEdit partEdit ->
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
                                [ Html.Events.on "input" (inputEventDecoder |> Json.Decode.map InputReadMe)
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


inputEventDecoder : Json.Decode.Decoder String
inputEventDecoder =
    Json.Decode.at [ "target", "value" ] Json.Decode.string



{- ===== part definitions ===== -}


{-| モジュールエディタのメインの要素であるパーツエディタを表示する
-}
partDefinitionsView : Maybe PartEditorFocus -> Html.Html Msg
partDefinitionsView partEditorFocus =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefinitions" ]
        [ Html.text "Part Definitions"
        , partDefinitionEditorList partEditorFocus
        ]


{-| 複数のパーツエディタが並んだもの
-}
partDefinitionEditorList : Maybe PartEditorFocus -> Html.Html Msg
partDefinitionEditorList partEditorFocus =
    Html.div
        [ Html.Attributes.class "moduelEditor-partDefEditorList" ]
        [ partDefinitionEditor partEditorFocus ]


{-| 1つのパーツエディタ
-}
partDefinitionEditor : Maybe PartEditorFocus -> Html.Html Msg
partDefinitionEditor partEditorFocus =
    Html.div
        [ Html.Attributes.class "moduelEditor-partDefEditor" ]
        [ nameAndTypeView partEditorFocus
        , exprView partEditorFocus
        , intermediateExprView
        ]


nameAndTypeView : Maybe PartEditorFocus -> Html.Html Msg
nameAndTypeView partEditorFocus =
    Html.div
        [ Html.Attributes.class "moduelEditor-partDefEditor-nameAndType" ]
        [ Html.div
            [ Html.Events.onClick (FocusToPartEditor (PartEditorMove MoveName))
            , Html.Attributes.classList [ ( "focused", partEditorFocus == Just (PartEditorMove MoveName) ) ]
            ]
            [ Html.text "point" ]
        , Html.text ":"
        , Html.div
            [ Html.Events.onClick (FocusToPartEditor (PartEditorMove MoveType))
            , Html.Attributes.classList [ ( "focused", partEditorFocus == Just (PartEditorMove MoveType) ) ]
            ]
            [ Html.text "Int" ]
        ]


exprView : Maybe PartEditorFocus -> Html.Html Msg
exprView partEditorFocus =
    Html.div
        []
        [ Html.text
            (if partEditorFocus == Just (PartEditorMove MoveExprHead) then
                "=|"

             else
                "="
            )
        ]


intermediateExprView : Html.Html Msg
intermediateExprView =
    Html.div
        []
        [ Html.text "(1+1) ..クリックして評価" ]
