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


type Mode
    = EditMode
        { editTarget : EditTarget
        , textAreaValue : List ( Char, Bool )
        , caretPos : Int
        }
    | MoveMode
        { moveTarget : MoveTarget
        }


type Msg
    = FocusToNone
    | FocusToDescription
    | FocusToPartEditor
    | InputReadMe String
    | ActiveThisEditor


type Emit
    = EmitChangeReadMe { text : String, ref : Project.Source.ModuleRef }
    | EmitSetTextAreaValue String


type Focus
    = FocusNone
    | FocusDescription
    | FocusPartEditor



{- TODO editTargetが飛び出てる可能性がある -}


type EditTarget
    = EditName
    | EditType
    | EditExprHeadTerm -- [abc]+ def + 28
    | EditExprOp Int --    abc[+]def + 28 Intの範囲は0..254
    | EditExprTerm Int --  abc +[def]+ 28 Intの範囲は0..254


type MoveTarget
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

        FocusToPartEditor ->
            ( Model
                { rec
                    | focus = FocusPartEditor
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

        ActiveThisEditor ->
            ( Model rec
            , case rec.focus of
                FocusNone ->
                    Nothing

                FocusDescription ->
                    Just (EmitSetTextAreaValue (Project.Source.ModuleWithCache.getReadMe targetModule))

                FocusPartEditor ->
                    Nothing
            )


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
            [ Html.text
                (case focus of
                    FocusNone ->
                        "Focus None"

                    FocusDescription ->
                        "Focus Description"

                    FocusPartEditor ->
                        "Focus PartEditor"
                )
            ]
        , descriptionView (Project.Source.ModuleWithCache.getReadMe targetModule) (isEditorItemFocus && focus == FocusDescription)
        , partDefinitionsView
        ]
    }



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
partDefinitionsView : Html.Html Msg
partDefinitionsView =
    Html.div
        [ Html.Attributes.class "moduleEditor-partDefinitions" ]
        [ Html.text "Part Definitions"
        , partDefinitionEditorList
        ]


{-| 複数のパーツエディタが並んだもの
-}
partDefinitionEditorList : Html.Html Msg
partDefinitionEditorList =
    Html.div
        [ Html.Attributes.class "moduelEditor-partDefEditorList" ]
        [ partDefinitionEditor ]


{-| 1つのパーツエディタ
-}
partDefinitionEditor : Html.Html Msg
partDefinitionEditor =
    Html.div
        [ Html.Attributes.class "moduelEditor-partDefEditor" ]
        [ nameAndTypeView
        , exprView
        , intermediateExprView
        ]


nameAndTypeView : Html.Html Msg
nameAndTypeView =
    Html.div
        []
        [ Html.text "point: Int" ]


exprView : Html.Html Msg
exprView =
    Html.div
        []
        [ Html.text "= 1 + 1" ]


intermediateExprView : Html.Html Msg
intermediateExprView =
    Html.div
        []
        [ Html.text "(1+1) ..クリックして評価" ]
