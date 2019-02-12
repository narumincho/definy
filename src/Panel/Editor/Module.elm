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
import NSvg
import Palette.X11
import Panel.DefaultUi
import Parser
import Parser.SimpleChar
import Project
import Project.Label as L
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
    | SuggestionNextOrSelectDown
    | SuggestionPrevOrSelectUp
    | Input String
    | ToEditMode
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
    | ActivePartDefName (Maybe ( List ( Char, Bool ), Int ))
    | ActivePartDefType (Maybe ( List ( Char, Bool ), Int ))
    | ActivePartDefExpr PartDefExprActive


{-| 式の中で選択している位置。式の長さを超えるところを指定しているならば、それは式の末尾を表す
-}
type PartDefExprActive
    = ActivePartDefExprSelf
    | ActiveExprHead --     |abc + def + 28
    | ActiveExprTerm Int (Maybe (List ( Char, Bool ))) -- [abc]+ def + 28  Intの範囲は0..255
    | ActiveExprOp Int (Maybe (List ( Char, Bool ))) --  abc[+]def + 28  Intの範囲は0..254


{-| テキストエリアにフォーカスが当たっているか。
当たっていたらKey.ArrowLeftなどのキー入力をpreventDefaultしない。ブラウザの基本機能(訂正など)を阻止しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi (Model { active }) =
    case active of
        ActiveDescription ActiveDescriptionText ->
            Just Panel.DefaultUi.MultiLineTextField

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName (Just _) )) ->
            Just Panel.DefaultUi.SingleLineTextField

        ActivePartDefList (ActivePartDef ( _, ActivePartDefType (Just _) )) ->
            Just Panel.DefaultUi.SingleLineTextField

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
            activeTo active (Model rec)

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

        SuggestionPrevOrSelectUp ->
            suggestionPrevOrSelectUp targetModule project (Model rec)

        SuggestionNextOrSelectDown ->
            suggestionPrevOrSelectDown targetModule project (Model rec)

        Input string ->
            input string targetModule (Model rec)

        ToEditMode ->
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


activeTo : Active -> Model -> ( Model, List Emit )
activeTo active (Model rec) =
    ( Model { rec | active = active }
    , case active of
        ActiveNone ->
            []

        ActiveDescription ActiveDescriptionSelf ->
            []

        ActiveDescription ActiveDescriptionText ->
            [ EmitFocusEditTextAea ]

        ActivePartDefList ActivePartDefListSelf ->
            [ EmitFocusEditTextAea ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefSelf )) ->
            [ EmitFocusEditTextAea ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName Nothing )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefType Nothing )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefExpr ActivePartDefExprSelf )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefExpr ActiveExprHead )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefExpr (ActiveExprTerm _ Nothing) )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        ActivePartDefList (ActivePartDef ( _, ActivePartDefExpr (ActiveExprOp _ Nothing) )) ->
            [ EmitFocusEditTextAea, EmitSetTextAreaValue "" ]

        _ ->
            []
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

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing )) ->
            -- 型から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead )) ->
            -- 先頭の項の前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0 _) )) ->
            -- 先頭の項から先頭の項の前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp opIndex _) )) ->
            -- 演算子から前の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm opIndex Nothing) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm termIndex _) )) ->
            -- 項から前の演算子へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp (termIndex - 1) Nothing) ))

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

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing )) ->
            -- 名前から型へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing )) ->
            -- 型から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActiveExprHead )) ->
            -- 先頭の項の前から先頭の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0 Nothing) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm termIndex _) )) ->
            -- 項から次の演算子へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp termIndex Nothing) ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp opIndex _) )) ->
            -- 演算子から次の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm (opIndex + 1) Nothing) ))

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

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing )) ->
            -- 型から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr _ )) ->
            -- 式の中身から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        _ ->
            active


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

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing )) ->
            -- 名前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing )) ->
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
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            -- 式から先頭の項へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm 0 Nothing) ))

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
    case active of
        ActiveDescription ActiveDescriptionText ->
            ActiveDescription ActiveDescriptionSelf

        ActivePartDefList (ActivePartDef ( _, ActivePartDefSelf )) ->
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName (Just _) )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType (Just _) )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr _ )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))

        _ ->
            active


suggestionPrevOrSelectUp : ModuleWithCache.Module -> Project.Project -> Model -> ( Model, List Emit )
suggestionPrevOrSelectUp module_ project (Model rec) =
    case rec.active of
        ActivePartDefList (ActivePartDef ( index, ActivePartDefName (Just ( textAreaValue, suggestIndex )) )) ->
            ( Model
                { rec
                    | active =
                        ActivePartDefList
                            (ActivePartDef
                                ( index, ActivePartDefName (Just ( textAreaValue, max 0 (suggestIndex - 1) )) )
                            )
                }
            , suggestionSelectChangedThenNameChangeEmit suggestIndex index rec.moduleRef
            )

        _ ->
            update SelectUp project (Model rec)


suggestionPrevOrSelectDown : ModuleWithCache.Module -> Project.Project -> Model -> ( Model, List Emit )
suggestionPrevOrSelectDown module_ project (Model rec) =
    case rec.active of
        ActivePartDefList (ActivePartDef ( index, ActivePartDefName (Just ( textAreaValue, suggestIndex )) )) ->
            ( Model
                { rec
                    | active =
                        ActivePartDefList
                            (ActivePartDef
                                ( index, ActivePartDefName (Just ( textAreaValue, suggestIndex + 1 )) )
                            )
                }
            , suggestionSelectChangedThenNameChangeEmit suggestIndex index rec.moduleRef
            )

        _ ->
            update SelectDown project (Model rec)


suggestionSelectChangedThenNameChangeEmit : Int -> Int -> Project.Source.ModuleRef -> List Emit
suggestionSelectChangedThenNameChangeEmit suggestIndex defIndex moduleRef =
    case nameSuggestList |> Utility.ListExtra.getAt suggestIndex of
        Just ( suggestName, _ ) ->
            [ EmitChangeName
                { name = suggestName
                , index = defIndex
                , ref = moduleRef
                }
            ]

        Nothing ->
            []


{-| 複数行入力の確定。概要や文字列リテラルでの入力を確定にする
-}
confirmMultiLineTextField : Active -> Active
confirmMultiLineTextField active =
    case active of
        ActiveDescription ActiveDescriptionText ->
            ActiveDescription ActiveDescriptionSelf

        _ ->
            active


input : String -> ModuleWithCache.Module -> Model -> ( Model, List Emit )
input string targetModule (Model rec) =
    if String.isEmpty (String.trim string) then
        ( Model rec
        , []
        )

    else
        case rec.active of
            ActiveDescription ActiveDescriptionText ->
                ( Model rec
                , [ EmitChangeReadMe { text = string, ref = rec.moduleRef } ]
                )

            ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
                let
                    ( active, emitList ) =
                        parserBeginWithName string index rec.moduleRef
                in
                ( Model { rec | active = active }
                , emitList
                )

            ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
                let
                    ( active, emitList ) =
                        parserBeginWithType string index rec.moduleRef
                in
                ( Model { rec | active = active }
                , emitList
                )

            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf )) ->
                let
                    ( active, emitList ) =
                        parserInExpr string index rec.moduleRef
                in
                ( Model { rec | active = active }
                , emitList
                )

            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprTerm termIndex _) )) ->
                let
                    ( active, emitList ) =
                        parserBeginWithTerm string
                            index
                            rec.moduleRef
                            termIndex
                            (ModuleWithCache.getDef index targetModule |> Maybe.withDefault Def.empty |> Def.getExpr)
                in
                ( Model { rec | active = active }
                , emitList
                )

            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (ActiveExprOp opIndex _) )) ->
                let
                    ( active, emitList ) =
                        parserBeginWithOp string
                            index
                            rec.moduleRef
                            opIndex
                            (ModuleWithCache.getDef index targetModule |> Maybe.withDefault Def.empty |> Def.getExpr)
                in
                ( Model { rec | active = active }
                , emitList
                )

            _ ->
                ( Model rec
                , []
                )


parserBeginWithName : String -> Int -> Project.Source.ModuleRef -> ( Active, List Emit )
parserBeginWithName string index moduleRef =
    case Parser.beginWithName (Parser.SimpleChar.fromString string) of
        Parser.BeginWithNameEndName { name, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefName (Just ( textAreaValue, 0 )) ))
            , [ EmitChangeName { name = name, index = index, ref = moduleRef } ]
            )

        Parser.BeginWithNameEndType { name, type_, textAreaValue } ->
            if Type.isEmpty type_ then
                ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType Nothing ))
                , [ EmitChangeName { name = name, index = index, ref = moduleRef }
                  , EmitSetTextAreaValue ""
                  ]
                )

            else
                ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType (Just ( textAreaValue, 0 )) ))
                , [ EmitChangeName { name = name, index = index, ref = moduleRef }
                  , EmitChangeType { type_ = type_, index = index, ref = moduleRef }
                  , textAreaValueToSetTextEmit textAreaValue
                  ]
                )

        Parser.BeginWithNameEndExprTerm { name, type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (if headTerm == Term.none && opAndTermList == [] then
                            ActivePartDefExprSelf

                         else
                            ActiveExprTerm (List.length opAndTermList) (Just textAreaValue)
                        )
                    )
                )
            , [ EmitChangeName { name = name, index = index, ref = moduleRef }
              , EmitSetTextAreaValue (textAreaValue |> List.map Tuple.first |> String.fromList)
              ]
                ++ (if Type.isEmpty type_ then
                        []

                    else
                        [ EmitChangeType { type_ = type_, index = index, ref = moduleRef } ]
                   )
                ++ [ EmitChangeExpr { expr = Expr.make headTerm opAndTermList, index = index, ref = moduleRef } ]
            )

        Parser.BeginWithNameEndExprOp { name, type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index, ActivePartDefExpr (ActiveExprOp (List.length opAndTermList) (Just textAreaValue)) )
                )
            , [ EmitChangeName { name = name, index = index, ref = moduleRef }
              , EmitChangeType { type_ = type_, index = index, ref = moduleRef }
              , EmitChangeExpr { expr = Expr.make headTerm (opAndTermList ++ [ ( lastOp, Term.none ) ]), index = index, ref = moduleRef }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithType : String -> Int -> Project.Source.ModuleRef -> ( Active, List Emit )
parserBeginWithType string index moduleRef =
    case Parser.beginWithType (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTypeEndType { type_, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType (Just ( textAreaValue, 0 )) ))
            , [ EmitChangeType { type_ = type_, index = index, ref = moduleRef } ]
            )

        Parser.BeginWithTypeEndExprTerm { type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (case List.length opAndTermList of
                            0 ->
                                ActivePartDefExprSelf

                            length ->
                                ActiveExprTerm length
                                    (if textAreaValue == [] then
                                        Nothing

                                     else
                                        Just textAreaValue
                                    )
                        )
                    )
                )
            , [ EmitChangeType { type_ = type_, index = index, ref = moduleRef }
              , EmitChangeExpr { expr = Expr.make headTerm opAndTermList, index = index, ref = moduleRef }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )

        Parser.BeginWithTypeEndExprOp { type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr ActivePartDefExprSelf ))
            , [ EmitChangeType { type_ = type_, index = index, ref = moduleRef }
              , EmitChangeExpr { expr = Expr.make headTerm (opAndTermList ++ [ ( lastOp, Term.none ) ]), index = index, ref = moduleRef }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserInExpr : String -> Int -> Project.Source.ModuleRef -> ( Active, List Emit )
parserInExpr string index moduleRef =
    case Parser.beginWithExprHead (Parser.SimpleChar.fromString string) of
        Parser.BeginWithExprHeadEndTerm { headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprTerm
                            (List.length opAndTermList)
                            (if getLastTerm headTerm opAndTermList == Term.none then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr { expr = Expr.make headTerm opAndTermList, index = index, ref = moduleRef } ]
                ++ (if opAndTermList == [] then
                        []

                    else
                        [ textAreaValueToSetTextEmit textAreaValue ]
                   )
            )

        Parser.BeginWithExprHeadEndOp { headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprOp
                            (List.length opAndTermList)
                            (if lastOp == Op.blank then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr { expr = Expr.make headTerm opAndTermList, index = index, ref = moduleRef }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithTerm : String -> Int -> Project.Source.ModuleRef -> Int -> Expr.Expr -> ( Active, List Emit )
parserBeginWithTerm string index moduleRef termIndex expr =
    case Parser.beginWithExprTerm (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTermEndTerm { headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprTerm
                            (termIndex + List.length opAndTermList)
                            (if getLastTerm headTerm opAndTermList == Term.none then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr
                    { expr =
                        expr
                            |> (if termIndex == 0 then
                                    Expr.replaceAndInsertHeadLastTerm headTerm opAndTermList

                                else
                                    Expr.replaceAndInsertTermLastTerm (termIndex - 1) headTerm opAndTermList
                               )
                    , index = index
                    , ref = moduleRef
                    }
              ]
                ++ (if opAndTermList == [] then
                        []

                    else
                        [ textAreaValueToSetTextEmit textAreaValue ]
                   )
            )

        Parser.BeginWithTermEndOp { headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprOp
                            (termIndex + List.length opAndTermList)
                            (if lastOp == Op.blank then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr
                    { expr =
                        expr
                            |> (if termIndex == 0 then
                                    Expr.replaceAndInsertHeadLastOp headTerm opAndTermList lastOp

                                else
                                    Expr.replaceAndInsertTermLastOp termIndex headTerm opAndTermList lastOp
                               )
                    , index = index
                    , ref = moduleRef
                    }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithOp : String -> Int -> Project.Source.ModuleRef -> Int -> Expr.Expr -> ( Active, List Emit )
parserBeginWithOp string index moduleRef opIndex expr =
    case Parser.beginWithExprOp (Parser.SimpleChar.fromString string) of
        Parser.BeginWithOpEndTerm { headOp, termAndOpList, lastTerm, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprTerm
                            (opIndex + 1 + List.length termAndOpList)
                            (if lastTerm == Term.none then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr
                    { expr = expr |> Expr.replaceAndInsertOpLastTerm opIndex headOp termAndOpList lastTerm
                    , index = index
                    , ref = moduleRef
                    }
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )

        Parser.BeginWithOpEndOp { headOp, termAndOpList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (ActiveExprOp
                            (opIndex + List.length termAndOpList)
                            (if getLastOp headOp termAndOpList == Op.blank then
                                Nothing

                             else
                                Just textAreaValue
                            )
                        )
                    )
                )
            , [ EmitChangeExpr
                    { expr = expr |> Expr.replaceAndInsertOpLastOp opIndex headOp termAndOpList
                    , index = index
                    , ref = moduleRef
                    }
              ]
                ++ (if termAndOpList == [] then
                        []

                    else
                        [ textAreaValueToSetTextEmit textAreaValue ]
                   )
            )


getLastTerm : Term.Term -> List ( Op.Operator, Term.Term ) -> Term.Term
getLastTerm headTerm opAndTermList =
    Utility.ListExtra.last opAndTermList
        |> Maybe.map Tuple.second
        |> Maybe.withDefault headTerm


getLastOp : Op.Operator -> List ( Term.Term, Op.Operator ) -> Op.Operator
getLastOp headOp termAndOpList =
    Utility.ListExtra.last termAndOpList
        |> Maybe.map Tuple.second
        |> Maybe.withDefault headOp


textAreaValueToSetTextEmit : List ( Char, Bool ) -> Emit
textAreaValueToSetTextEmit =
    List.map Tuple.first >> String.fromList >> EmitSetTextAreaValue



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
    { title = L.toCapitalString (ModuleWithCache.getName targetModule)
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
            (ModuleWithCache.getDefAndResult targetModule)
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

        ActivePartDefName Nothing ->
            "名前"

        ActivePartDefName (Just _) ->
            "名前を編集中"

        ActivePartDefType Nothing ->
            "型"

        ActivePartDefType (Just _) ->
            "型を編集中"

        ActivePartDefExpr ActivePartDefExprSelf ->
            "式全体"

        ActivePartDefExpr ActiveExprHead ->
            "先頭の項の前"

        ActivePartDefExpr (ActiveExprTerm index Nothing) ->
            String.fromInt index ++ "番目の項"

        ActivePartDefExpr (ActiveExprTerm index (Just _)) ->
            String.fromInt index ++ "番目の項を編集中"

        ActivePartDefExpr (ActiveExprOp index Nothing) ->
            String.fromInt index ++ "番目の演算子"

        ActivePartDefExpr (ActiveExprOp index (Just _)) ->
            String.fromInt index ++ "番目の演算子を編集中"



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
partDefinitionsView : Bool -> Maybe PartDefListActive -> List ModuleWithCache.DefAndResult -> Html.Html Msg
partDefinitionsView isFocus partDefListActiveMaybe defAndResultList =
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
         , partDefListView defAndResultList
            (case partDefListActiveMaybe of
                Just (ActivePartDef partDefActiveWithIndex) ->
                    Just partDefActiveWithIndex

                _ ->
                    Nothing
            )
         ]
            ++ (case partDefListActiveMaybe of
                    Just _ ->
                        if isFocus then
                            [ Html.textarea
                                [ Html.Attributes.class "partDef-hideTextArea"
                                , Html.Attributes.id "edit"
                                , Html.Events.onInput Input
                                ]
                                []
                            ]

                        else
                            []

                    Nothing ->
                        []
               )
        )


partDefinitionsViewTitle : Html.Html Msg
partDefinitionsViewTitle =
    Html.div
        [ subClass "partDefinitions-title" ]
        [ Html.text "Part Definitions" ]


partDefListView : List ModuleWithCache.DefAndResult -> Maybe ( Int, PartDefActive ) -> Html.Html Msg
partDefListView defAndResultList partDefActiveWithIndexMaybe =
    Html.div
        [ subClass "partDefList"
        ]
        ((defAndResultList
            |> List.indexedMap
                (\index defAndResult ->
                    partDefView
                        index
                        defAndResult
                        (case partDefActiveWithIndexMaybe of
                            Just ( i, partDefActive ) ->
                                if i == index then
                                    Just partDefActive

                                else
                                    Nothing

                            _ ->
                                Nothing
                        )
                        |> Html.map (\m -> ActiveTo (ActivePartDefList (ActivePartDef ( index, m ))))
                )
         )
            ++ [ addDefButton ]
        )


partDefView : Int -> ModuleWithCache.DefAndResult -> Maybe PartDefActive -> Html.Html PartDefActive
partDefView index defAndResult partDefActiveMaybe =
    let
        def =
            ModuleWithCache.defAndResultGetDef defAndResult

        evalResult =
            ModuleWithCache.defAndResultGetEvalResult defAndResult
    in
    Html.div
        [ subClassList
            [ ( "partDef", True )
            , ( "partDef-active", partDefActiveMaybe == Just ActivePartDefSelf )
            ]
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed
                ( ActivePartDefSelf
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
        , Html.text (evalResult |> Maybe.map String.fromInt |> Maybe.withDefault "評価結果がない")
        ]



{- ================= Name And Type ================= -}
{------------------ Name  ------------------}


partDefViewNameAndType : Name.Name -> Type.Type -> Maybe PartDefActive -> Html.Html PartDefActive
partDefViewNameAndType name type_ partDefActiveMaybe =
    Html.div
        [ subClass "partDef-nameAndType" ]
        [ partDefViewName name
            (case partDefActiveMaybe of
                Just (ActivePartDefName textAreaValueAndIndexMaybe) ->
                    Just textAreaValueAndIndexMaybe

                _ ->
                    Nothing
            )
        , Html.text ":"
        , partDefViewType type_
            (case partDefActiveMaybe of
                Just (ActivePartDefType textAreaValueAndIndexMaybe) ->
                    Just textAreaValueAndIndexMaybe

                _ ->
                    Nothing
            )
        ]


partDefViewName : Name.Name -> Maybe (Maybe ( List ( Char, Bool ), Int )) -> Html.Html PartDefActive
partDefViewName name textAreaValueAndIndexMaybeMaybe =
    case textAreaValueAndIndexMaybeMaybe of
        Just (Just ( textAreaValue, suggestIndex )) ->
            partDefNameEditView name textAreaValue suggestIndex

        Just Nothing ->
            partDefNameNormalView name True

        Nothing ->
            partDefNameNormalView name False


partDefNameNormalView : Name.Name -> Bool -> Html.Html PartDefActive
partDefNameNormalView name isActive =
    case Name.toString name of
        Just nameString ->
            Html.div
                ([ subClassList
                    [ ( "partDef-name", True )
                    , ( "partDef-element-active", isActive )
                    ]
                 ]
                    ++ (if isActive then
                            []

                        else
                            [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ActivePartDefName Nothing, True )) ]
                       )
                )
                [ Html.text nameString ]

        Nothing ->
            Html.div
                ([ subClassList
                    [ ( "partDef-noName", True )
                    , ( "partDef-element-active", isActive )
                    ]
                 ]
                    ++ (if isActive then
                            []

                        else
                            [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ActivePartDefName Nothing, True )) ]
                       )
                )
                [ Html.text "NO NAME" ]


partDefNameEditView : Name.Name -> List ( Char, Bool ) -> Int -> Html.Html PartDefActive
partDefNameEditView name textAreaValue suggestIndex =
    Html.div
        [ subClass "partDef-name-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionName name suggestIndex ]
        )


suggestionName : Name.Name -> Int -> Html.Html msg
suggestionName name index =
    Html.div
        [ subClass "partDef-suggestion" ]
        (([ ( name, enterIcon ) ]
            ++ (nameSuggestList |> List.map (Tuple.mapSecond Html.text))
         )
            |> List.indexedMap
                (\i ( n, subItem ) ->
                    suggestNameItem n subItem (i == index)
                )
        )


suggestNameItem : Name.Name -> Html.Html msg -> Bool -> Html.Html msg
suggestNameItem name subItem isSelect =
    Html.div
        [ subClassList
            [ ( "partDef-suggestion-item", True )
            , ( "partDef-suggestion-item-select", isSelect )
            ]
        ]
        [ Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-text", True )
                , ( "partDef-suggestion-item-text-select", isSelect )
                ]
            ]
            [ Html.text (Name.toString name |> Maybe.withDefault "<NO NAME>") ]
        , Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-subItem", True )
                , ( "partDef-suggestion-item-subItem-select", isSelect )
                ]
            ]
            [ subItem ]
        ]


enterIcon : Html.Html msg
enterIcon =
    NSvg.toHtmlWithClass
        "moduleEditor-partDef-suggestion-keyIcon"
        { x = 0, y = 0, width = 38, height = 32 }
        [ NSvg.polygon [ ( 4, 4 ), ( 34, 4 ), ( 34, 28 ), ( 12, 28 ), ( 12, 16 ), ( 4, 16 ) ] NSvg.strokeNone NSvg.fillNone
        , NSvg.path "M30,8 V20 H16 L18,18 M16,20 L18,22" NSvg.strokeNone NSvg.fillNone
        ]


nameSuggestList : List ( Name.Name, String )
nameSuggestList =
    [ ( Name.fromLabel (L.make L.hg [ L.oa, L.om, L.oe ]), "ゲーム" )
    , ( Name.fromLabel (L.make L.hh [ L.oe, L.or, L.oo ]), "主人公" )
    , ( Name.fromLabel (L.make L.hb [ L.oe, L.oa, L.ou, L.ot, L.oi, L.of_, L.ou, L.ol, L.oG, L.oi, L.or, L.ol ]), "美少女" )
    , ( Name.fromLabel (L.make L.hm [ L.oo, L.on, L.os, L.ot, L.oe, L.or ]), "モンスター" )
    , ( Name.fromLabel (L.make L.hw [ L.oo, L.or, L.ol, L.od ]), "世界" )
    ]



{------------------ Type  ------------------}


partDefViewType : Type.Type -> Maybe (Maybe ( List ( Char, Bool ), Int )) -> Html.Html PartDefActive
partDefViewType type_ textAreaValueAndIndexMaybeMaybe =
    case textAreaValueAndIndexMaybeMaybe of
        Just (Just ( textAreaValue, suggestIndex )) ->
            partDefTypeEditView type_ textAreaValue suggestIndex

        Just Nothing ->
            partDefTypeNormalView type_ True

        Nothing ->
            partDefTypeNormalView type_ False


partDefTypeNormalView : Type.Type -> Bool -> Html.Html PartDefActive
partDefTypeNormalView type_ isActive =
    case Type.toString type_ of
        Just nameString ->
            Html.div
                ([ subClassList
                    [ ( "partDef-type", True )
                    , ( "partDef-element-active", isActive )
                    ]
                 ]
                    ++ (if isActive then
                            []

                        else
                            [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ActivePartDefType Nothing, True )) ]
                       )
                )
                [ Html.text nameString ]

        Nothing ->
            Html.div
                ([ subClassList
                    [ ( "partDef-noType", True )
                    , ( "partDef-element-active", isActive )
                    ]
                 ]
                    ++ (if isActive then
                            []

                        else
                            [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ActivePartDefType Nothing, True )) ]
                       )
                )
                [ Html.text "NO TYPE" ]


partDefTypeEditView : Type.Type -> List ( Char, Bool ) -> Int -> Html.Html PartDefActive
partDefTypeEditView type_ textAreaValue suggestIndex =
    Html.div
        [ subClass "partDef-type-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionType type_ suggestIndex ]
        )


suggestionType : Type.Type -> Int -> Html.Html msg
suggestionType type_ suggestIndex =
    Html.div
        [ subClass "partDef-suggestion" ]
        [ suggestTypeItem
            Type.int
            (Html.text "32bit整数")
            True
        ]


suggestTypeItem : Type.Type -> Html.Html msg -> Bool -> Html.Html msg
suggestTypeItem type_ subItem isSelect =
    Html.div
        [ subClassList
            [ ( "partDef-suggestion-item", True )
            , ( "partDef-suggestion-item-select", isSelect )
            ]
        ]
        [ Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-text", True )
                , ( "partDef-suggestion-item-text-select", isSelect )
                ]
            ]
            [ Html.text (Type.toString type_ |> Maybe.withDefault "<NO TYPE>") ]
        , Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-subItem", True )
                , ( "partDef-suggestion-item-subItem-select", isSelect )
                ]
            ]
            [ subItem ]
        ]



{- ================= Expr ================= -}


partDefViewExpr : Expr.Expr -> Maybe PartDefExprActive -> Html.Html PartDefActive
partDefViewExpr expr partDefExprActiveMaybe =
    Html.div
        ([ subClass "partDef-expr"
         ]
            ++ (case partDefExprActiveMaybe of
                    Just ActivePartDefExprSelf ->
                        [ subClass "partDef-element-active" ]

                    _ ->
                        [ Html.Events.stopPropagationOn "click"
                            (Json.Decode.succeed ( ActivePartDefExpr ActivePartDefExprSelf, True ))
                        ]
               )
        )
        ([ Html.text "=" ]
            ++ (case partDefExprActiveMaybe of
                    Just ActiveExprHead ->
                        [ activeHeadTermLeft ]

                    _ ->
                        []
               )
            ++ [ termViewOutput (Expr.getHead expr)
                    (case partDefExprActiveMaybe of
                        Just (ActiveExprTerm 0 textAreaValueMaybe) ->
                            Just textAreaValueMaybe

                        _ ->
                            Nothing
                    )
                    |> Html.map (always (ActivePartDefExpr (ActiveExprTerm 0 Nothing)))
               ]
            ++ (Expr.getOthers expr
                    |> List.indexedMap
                        (\index ( op, term ) ->
                            [ opViewOutput op
                                (case partDefExprActiveMaybe of
                                    Just (ActiveExprOp i textAreaValueMaybe) ->
                                        if i == index then
                                            Just textAreaValueMaybe

                                        else
                                            Nothing

                                    _ ->
                                        Nothing
                                )
                                |> Html.map (always (ActiveExprOp index Nothing))
                            , termViewOutput term
                                (case partDefExprActiveMaybe of
                                    Just (ActiveExprTerm i textAreaValueMaybe) ->
                                        if i == index + 1 then
                                            Just textAreaValueMaybe

                                        else
                                            Nothing

                                    _ ->
                                        Nothing
                                )
                                |> Html.map (always (ActiveExprTerm (index + 1) Nothing))
                            ]
                        )
                    |> List.concat
                    |> List.map (Html.map ActivePartDefExpr)
               )
        )


{-| 編集していない項の表示
Maybe (Maybe (List (Char, Bool))) の値は
Nothing: 選択されていない
Just Nothing: 選択されている
Just (Just textAreaValue): 編集中
-}
termViewOutput : Term.Term -> Maybe (Maybe (List ( Char, Bool ))) -> Html.Html ()
termViewOutput term textAreaValueMaybeMaybe =
    case textAreaValueMaybeMaybe of
        Just (Just textAreaValue) ->
            termEditView term textAreaValue

        Just Nothing ->
            termNormalView term True

        Nothing ->
            termNormalView term False


termNormalView : Term.Term -> Bool -> Html.Html ()
termNormalView term isActive =
    Html.div
        [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( (), True ))
        , subClassList
            [ ( "partDef-term", True )
            , ( "partDef-element-active", isActive )
            ]
        ]
        [ Html.text (Term.toString term) ]


termEditView : Term.Term -> List ( Char, Bool ) -> Html.Html msg
termEditView term textAreaValue =
    Html.div
        [ subClass "partDef-term-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionTerm term ]
        )


suggestionTerm : Term.Term -> Html.Html msg
suggestionTerm term =
    let
        ( text, subItem ) =
            Term.description term
    in
    Html.div
        [ subClass "partDef-suggestion" ]
        [ Html.div
            [ subClass "partDef-suggestion-item"
            , subClass "partDef-suggestion-item-select"
            ]
            [ Html.div
                [ subClass "partDef-suggestion-item-text"
                , subClass "partDef-suggestion-item-text-select"
                ]
                [ Html.text text ]
            , Html.div
                [ subClass "partDef-suggestion-item-subItem"
                , subClass "partDef-suggestion-item-subItem-select"
                ]
                [ Html.text subItem ]
            ]
        ]


opViewOutput : Op.Operator -> Maybe (Maybe (List ( Char, Bool ))) -> Html.Html ()
opViewOutput op textAreaValueMaybeMaybe =
    case textAreaValueMaybeMaybe of
        Just (Just textAreaValue) ->
            opEditView op textAreaValue

        Just Nothing ->
            opNormalView op True

        Nothing ->
            opNormalView op False


opNormalView : Op.Operator -> Bool -> Html.Html ()
opNormalView op isActive =
    Html.div
        [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( (), True ))
        , subClassList
            [ ( "partDef-op", True )
            , ( "partDef-element-active", isActive )
            ]
        ]
        [ Html.text (Op.toString op |> Maybe.withDefault "?") ]


opEditView : Op.Operator -> List ( Char, Bool ) -> Html.Html msg
opEditView op textAreaValue =
    Html.div
        [ subClass "partDef-op-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionOp op ]
        )


suggestionOp : Op.Operator -> Html.Html msg
suggestionOp op =
    Html.div
        [ subClass "partDef-suggestion" ]
        ([ suggestionOpItem op True ]
            ++ (Op.safeAllOperator
                    |> List.map Op.toNotSafe
                    |> List.filterMap
                        (\o ->
                            if o == op then
                                Nothing

                            else
                                Just (suggestionOpItem o False)
                        )
               )
        )


suggestionOpItem : Op.Operator -> Bool -> Html.Html msg
suggestionOpItem op isSelect =
    let
        ( text, subItem ) =
            Op.toDescriptionString op
    in
    Html.div
        [ subClassList
            [ ( "partDef-suggestion-item", True )
            , ( "partDef-suggestion-item-select", isSelect )
            ]
        ]
        [ Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-text", True )
                , ( "partDef-suggestion-item-text-select", isSelect )
                ]
            ]
            [ Html.text text ]
        , Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-subItem", True )
                , ( "partDef-suggestion-item-subItem", isSelect )
                ]
            ]
            [ Html.text (subItem |> Maybe.withDefault "") ]
        ]


{-| 編集しているものの入力途中の文字の表示
-}
textAreaValueToListHtml : List ( Char, Bool ) -> List (Html.Html msg)
textAreaValueToListHtml =
    List.map
        (\( char, bool ) ->
            Html.div
                [ subClass
                    (if bool then
                        "partDef-okChar"

                     else
                        "partDef-errChar"
                    )
                ]
                [ Html.text (String.fromChar char) ]
        )


{-| 項の先頭を表す
-}
activeHeadTermLeft : Html.Html msg
activeHeadTermLeft =
    Html.div
        [ subClass "partDef-caretBox" ]
        [ Html.div
            [ subClass "partDef-caret" ]
            []
        ]


addDefButton : Html.Html Msg
addDefButton =
    Html.button
        [ Html.Events.onClick AddPartDef
        , subClass "partDef-addPartDef"
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
