module Panel.Editor.Module exposing
    ( Emit(..)
    , Model
    , Msg(..)
    , getTargetModuleIndex
    , initModel
    , isFocusDefaultUi
    , update
    , view
    )

import Compiler
import Html
import Html.Attributes
import Html.Events
import Html.Keyed
import Json.Decode
import Json.Encode
import NSvg
import Panel.DefaultUi
import Parser
import Parser.SimpleChar
import Project
import Project.Label as L
import Project.Source as Source
import Project.Source.Module as Module
import Project.Source.Module.PartDef as PartDef
import Project.Source.Module.PartDef.Expr as Expr
import Project.Source.Module.PartDef.Name as Name
import Project.Source.Module.PartDef.Type as Type
import Project.Source.Module.TypeDef as TypeDef
import Project.Source.ModuleIndex as ModuleIndex
import Project.Source.ModuleWithCache as ModuleWithCache
import Project.SourceIndex as SourceIndex
import Utility.ListExtra


type Model
    = Model
        { moduleRef : SourceIndex.ModuleIndex
        , active : Active
        , compileResultVisible : List CompileResultVisible
        }


type CompileResultVisible
    = CompileResultVisibleValue
    | CompileResultVisibleWasmSExpr


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
    | ConfirmSingleLineTextField
    | ConfirmSingleLineTextFieldOrSelectParent
    | AddPartDef
    | FocusThisEditor
    | BlurThisEditor


type Emit
    = EmitMsgToSource Source.Msg
    | EmitSetTextAreaValue String
    | EmitFocusEditTextAea


{-| 選択している要素
-}
type Active
    = ActiveNone
    | ActiveReadMe ReadMeActive
    | ActivePartDefList PartDefListActive


type ReadMeActive
    = ActiveReadMeSelf
    | ActiveReadMeText


type PartDefListActive
    = ActivePartDefListSelf
    | ActivePartDef ( Int, PartDefActive )


type PartDefActive
    = ActivePartDefSelf
    | ActivePartDefName NameEdit
    | ActivePartDefType TypeEdit
    | ActivePartDefExpr TermOpPos


type NameEdit
    = NameEditSelect
    | NameEditText
    | NameEditSuggestionSelect
        { index : Int
        , searchName : Name.Name
        }


type TypeEdit
    = TypeEditSelect


{-| TermとOpが交互にあるの式の中で選択している位置。式の長さを超えるところを指定しているならば、それは式の末尾を表す
-}
type TermOpPos
    = TermOpSelf
    | TermOpHead
    | TermOpTerm Int TermType -- [abc]+ def + 28  Intの範囲は0..255
    | TermOpOp Int --  abc[+]def + 28  Intの範囲は0..254


type ExprEdit
    = ExprEditSelect
    | ExprEditText
    | ExprEditSelectSuggestion Int


type TermType
    = TypeNoChildren ExprEdit
    | TypeParentheses TermOpPos
    | TypeLambda LambdaPos


type LambdaPos
    = LambdaSelf
    | BranchHead
    | Branch Int BranchPos


type BranchPos
    = BranchSelf
    | Pattern
    | Guard
    | Expr TermOpPos


{-| テキストエリアにフォーカスが当たっているか。
当たっていたらKey.ArrowLeftなどのキー入力をpreventDefaultしない。ブラウザの基本機能(訂正など)を阻止しない
-}
isFocusDefaultUi : Model -> Maybe Panel.DefaultUi.DefaultUi
isFocusDefaultUi (Model { active }) =
    case active of
        ActiveReadMe ActiveReadMeText ->
            Just Panel.DefaultUi.MultiLineTextField

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditText )) ->
            Just Panel.DefaultUi.SingleLineTextField

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect _) )) ->
            Just Panel.DefaultUi.SingleLineTextField

        _ ->
            Nothing


initModel : SourceIndex.ModuleIndex -> Model
initModel moduleRef =
    Model
        { moduleRef = moduleRef
        , active = ActiveNone
        , compileResultVisible = []
        }


getTargetModuleIndex : Model -> SourceIndex.ModuleIndex
getTargetModuleIndex (Model { moduleRef }) =
    moduleRef


getActive : Model -> Active
getActive (Model { active }) =
    active



{- ================================================
   ==================================================
                       Update
   ==================================================
   ================================================
-}


update : Msg -> Project.Project -> Model -> ( Model, List Emit )
update msg project model =
    let
        targetModule =
            project
                |> Project.getSource
                |> Source.getModule (getTargetModuleIndex model)

        active =
            model
                |> getActive
    in
    case msg of
        ActiveTo toActive ->
            model |> setActive project toActive

        SelectLeft ->
            model |> setActive project (selectLeft targetModule active)

        SelectRight ->
            model |> setActive project (selectRight targetModule active)

        SelectUp ->
            model |> setActive project (selectUp targetModule active)

        SelectDown ->
            model |> setActive project (selectDown targetModule active)

        SelectFirstChild ->
            model |> setActive project (selectFirstChild targetModule active)

        SelectLastChild ->
            model |> setActive project (selectLastChild targetModule active)

        SelectParent ->
            model |> setActive project (selectParent targetModule active)

        SuggestionPrevOrSelectUp ->
            model |> suggestionPrevOrSelectUp targetModule project

        SuggestionNextOrSelectDown ->
            model |> suggestionNextOrSelectDown targetModule project

        Input string ->
            model |> input string project targetModule

        ToEditMode ->
            ( model
            , []
            )

        ConfirmMultiLineTextField ->
            model |> update (ActiveTo (confirmMultiLineTextField active)) project

        ConfirmSingleLineTextField ->
            model |> update (ActiveTo (confirmSingleLineTextField active)) project

        ConfirmSingleLineTextFieldOrSelectParent ->
            model |> setActive project (confirmSingleLineTextFieldOrSelectParent targetModule active)

        AddPartDef ->
            ( model
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = getTargetModuleIndex model
                        , moduleMsg = ModuleWithCache.MsgAddDef
                        }
                    )
              ]
            )

        FocusThisEditor ->
            ( model
            , []
            )

        BlurThisEditor ->
            model |> update ConfirmMultiLineTextField project


{-| アクティブな対象を変更する
-}
setActive : Project.Project -> Active -> Model -> ( Model, List Emit )
setActive project active (Model rec) =
    let
        targetModule =
            project
                |> Project.getSource
                |> Source.getModule (getTargetModuleIndex (Model rec))
    in
    ( Model
        { rec
            | active = active
        }
    , if rec.active /= active then
        case active of
            ActiveNone ->
                []

            ActiveReadMe ActiveReadMeSelf ->
                []

            ActiveReadMe ActiveReadMeText ->
                [ EmitFocusEditTextAea ]

            ActivePartDefList ActivePartDefListSelf ->
                []

            ActivePartDefList (ActivePartDef ( _, ActivePartDefSelf )) ->
                []

            ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
                let
                    name =
                        targetModule
                            |> ModuleWithCache.getPartDef (ModuleIndex.PartDefIndex index)
                            |> Maybe.map
                                (PartDef.getName
                                    >> (\n ->
                                            case n of
                                                Name.NoName ->
                                                    ""

                                                Name.SafeName safeName ->
                                                    Name.safeNameToString safeName
                                       )
                                )
                            |> Maybe.withDefault "名前の取得失敗"
                in
                [ EmitSetTextAreaValue name, EmitFocusEditTextAea ]

            -- TODO 選択状態なら選択する
            ActivePartDefList (ActivePartDef ( index, _ )) ->
                [ EmitSetTextAreaValue "", EmitFocusEditTextAea ]
        -- TODO テキスト表現を設定する

      else
        []
    )


{-| 選択を左へ移動して、選択する対象を変える
-}
selectLeft : ModuleWithCache.ModuleWithResult -> Active -> Active
selectLeft module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから概要欄へ
            ActiveReadMe ActiveReadMeSelf

        ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf )) ->
            -- 先頭の定義から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から前の定義へ
            ActivePartDefList (ActivePartDef ( index - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
            -- 型から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName NameEditSelect ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr termOpPos )) ->
            -- 式から型へ
            ActivePartDefList
                (ActivePartDef
                    ( index
                    , case termOpPosLeft termOpPos of
                        Just movedTermOpPos ->
                            ActivePartDefExpr movedTermOpPos

                        Nothing ->
                            ActivePartDefType TypeEditSelect
                    )
                )

        _ ->
            active


termOpPosLeft : TermOpPos -> Maybe TermOpPos
termOpPosLeft termOpPos =
    case termOpPos of
        TermOpSelf ->
            Nothing

        TermOpHead ->
            Just TermOpSelf

        TermOpTerm 0 termType ->
            case termTypeLeft termType of
                Just movedTermType ->
                    Just (TermOpTerm 0 movedTermType)

                Nothing ->
                    Just TermOpHead

        TermOpTerm termIndex termType ->
            case termTypeLeft termType of
                Just movedTermType ->
                    Just (TermOpTerm termIndex movedTermType)

                Nothing ->
                    Just (TermOpOp (termIndex - 1))

        TermOpOp opIndex ->
            Just (TermOpTerm opIndex (TypeNoChildren ExprEditSelect))


termTypeLeft : TermType -> Maybe TermType
termTypeLeft termType =
    case termType of
        TypeNoChildren _ ->
            Nothing

        TypeParentheses termOpPos ->
            termOpPosLeft termOpPos
                |> Maybe.map TypeParentheses

        TypeLambda lambdaPos ->
            lambdaPosLeft lambdaPos
                |> Maybe.map TypeLambda


lambdaPosLeft : LambdaPos -> Maybe LambdaPos
lambdaPosLeft lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            Nothing

        BranchHead ->
            Just LambdaSelf

        Branch 0 branchPos ->
            case branchPosLeft branchPos of
                Just movedBranchPos ->
                    Just (Branch 0 movedBranchPos)

                Nothing ->
                    Just BranchHead

        Branch branchIndex branchPos ->
            case branchPosLeft branchPos of
                Just movedBranchPos ->
                    Just (Branch branchIndex movedBranchPos)

                Nothing ->
                    Just BranchHead


branchPosLeft : BranchPos -> Maybe BranchPos
branchPosLeft branchPos =
    case branchPos of
        BranchSelf ->
            Nothing

        Pattern ->
            Just BranchSelf

        Guard ->
            Just Pattern

        Expr termOpPos ->
            case termOpPosLeft termOpPos of
                Just movedTermOpPos ->
                    Just (Expr movedTermOpPos)

                Nothing ->
                    Just Guard


{-| 選択を右へ移動して、選択する対象を変える
-}
selectRight : ModuleWithCache.ModuleWithResult -> Active -> Active
selectRight module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要欄へ
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe ActiveReadMeSelf ->
            -- 概要欄から概要欄編集へ
            ActiveReadMe ActiveReadMeText

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから
            ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName NameEditSelect ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
            -- 名前から型へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
            -- 型から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpHead ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr termOpPos )) ->
            -- 式の中の移動
            let
                exprMaybe =
                    module_
                        |> Module.getPartDef (ModuleIndex.PartDefIndex index)
                        |> Maybe.map PartDef.getExpr
            in
            case termOpPosRight exprMaybe termOpPos of
                Just movedTermOpPos ->
                    ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr movedTermOpPos ))

                Nothing ->
                    ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        _ ->
            active


termOpPosRight : Maybe Expr.Expr -> TermOpPos -> Maybe TermOpPos
termOpPosRight exprMaybe termOpPos =
    case exprMaybe of
        Just expr ->
            let
                termCount =
                    expr
                        |> Expr.getOthers
                        |> List.length
            in
            case termOpPos of
                TermOpSelf ->
                    Nothing

                TermOpHead ->
                    Just (TermOpTerm 0 (TypeNoChildren ExprEditSelect))

                TermOpTerm termIndex termType ->
                    if termCount < termIndex then
                        Just TermOpSelf

                    else
                        case termTypeRight (Expr.getTermFromIndex termIndex expr) termType of
                            Just movedTermType ->
                                Just (TermOpTerm termIndex movedTermType)

                            Nothing ->
                                if termCount == termIndex then
                                    Just TermOpSelf

                                else
                                    Just (TermOpOp termIndex)

                TermOpOp opIndex ->
                    if termCount < opIndex then
                        Just TermOpSelf

                    else
                        Just (TermOpTerm (opIndex + 1) (TypeNoChildren ExprEditSelect))

        Nothing ->
            Nothing


termTypeRight : Maybe Expr.Term -> TermType -> Maybe TermType
termTypeRight termMaybe termType =
    case ( termMaybe, termType ) of
        ( _, TypeNoChildren _ ) ->
            Nothing

        ( Just (Expr.Parentheses expr), TypeParentheses termOpPos ) ->
            termOpPosRight (Just expr) termOpPos
                |> Maybe.map TypeParentheses

        ( _, TypeParentheses termOpPos ) ->
            termOpPosRight Nothing termOpPos
                |> Maybe.map TypeParentheses

        ( _, TypeLambda lambdaPos ) ->
            lambdaPosRight lambdaPos
                |> Maybe.map TypeLambda


lambdaPosRight : LambdaPos -> Maybe LambdaPos
lambdaPosRight lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            Nothing

        BranchHead ->
            Just (Branch 0 BranchSelf)

        Branch branchIndex branchPos ->
            case branchPosRight branchPos of
                Just movedBranchPos ->
                    Just (Branch branchIndex movedBranchPos)

                Nothing ->
                    Just (Branch (branchIndex + 1) BranchSelf)


branchPosRight : BranchPos -> Maybe BranchPos
branchPosRight branchPos =
    case branchPos of
        BranchSelf ->
            Nothing

        Pattern ->
            Just BranchSelf

        Guard ->
            Just Pattern

        Expr termOpPos ->
            case termOpPosLeft termOpPos of
                Just movedTermOpPos ->
                    Just (Expr movedTermOpPos)

                Nothing ->
                    Just Guard


{-| 選択を上へ移動して、選択する対象を変える
-}
selectUp : ModuleWithCache.ModuleWithResult -> Active -> Active
selectUp module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActiveReadMe _ ->
            -- 概要欄から概要欄へ
            ActiveReadMe ActiveReadMeSelf

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから概要欄へ
            ActiveReadMe ActiveReadMeSelf

        ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf )) ->
            -- 先頭の定義から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から前の定義へ
            ActivePartDefList (ActivePartDef ( index - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
            -- 名前から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
            -- 型から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf )) ->
            -- 式から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpHead )) ->
            -- 先頭の項の前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (TermOpTerm _ _) )) ->
            -- 項から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (TermOpOp _) )) ->
            -- 演算子から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))


{-| 選択を下へ移動して、選択する対象を変える
-}
selectDown : ModuleWithCache.ModuleWithResult -> Active -> Active
selectDown module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要へ
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe _ ->
            -- 概要欄から定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から次の定義へ
            ActivePartDefList (ActivePartDef ( min (ModuleWithCache.getPartDefNum module_ - 1) (index + 1), ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
            -- 名前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
            -- 型から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf )) ->
            -- 式から定義へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpHead )) ->
            -- 先頭の項の前から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (TermOpTerm _ (TypeNoChildren _)) )) ->
            -- 項から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (TermOpOp _) )) ->
            -- 演算子から式へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        _ ->
            active


{-| 選択を選択していたものからその子供の先頭へ移動する
-}
selectFirstChild : ModuleWithCache.ModuleWithResult -> Active -> Active
selectFirstChild module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要へ
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe ActiveReadMeSelf ->
            -- 概要欄から概要欄のテキスト入力へ
            ActiveReadMe ActiveReadMeText

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから先頭の定義へ
            ActivePartDefList (ActivePartDef ( 0, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から名前へ
            ActivePartDefList (ActivePartDef ( index, ActivePartDefName NameEditSelect ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr termOpPos )) ->
            -- 式から先頭の項へ
            let
                exprMaybe =
                    module_
                        |> ModuleWithCache.getPartDef (ModuleIndex.PartDefIndex index)
                        |> Maybe.map PartDef.getExpr
            in
            ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr (termOpPosFirstChild exprMaybe termOpPos) ))

        _ ->
            active


{-| 選択を最初の子供に移動する。デフォルトでSpaceとCtrl+→の動作
-}
termOpPosFirstChild : Maybe Expr.Expr -> TermOpPos -> TermOpPos
termOpPosFirstChild exprMaybe termOpPos =
    case termOpPos of
        TermOpSelf ->
            TermOpTerm 0 (TypeNoChildren ExprEditSelect)

        TermOpHead ->
            TermOpHead

        TermOpTerm termIndex termType ->
            let
                termMaybe =
                    exprMaybe
                        |> Maybe.andThen (Expr.getTermFromIndex termIndex)
            in
            TermOpTerm termIndex (termTypeFirstChild termMaybe termType)

        TermOpOp opIndex ->
            TermOpOp opIndex


termTypeFirstChild : Maybe Expr.Term -> TermType -> TermType
termTypeFirstChild termMaybe termType =
    case ( termMaybe, termType ) of
        ( Just (Expr.Parentheses expr), TypeParentheses termOpPos ) ->
            TypeParentheses (termOpPosFirstChild (Just expr) termOpPos)

        ( Just (Expr.Parentheses expr), _ ) ->
            TypeParentheses (termOpPosFirstChild (Just expr) TermOpSelf)

        ( _, _ ) ->
            termType


{-| 選択を最後の子供に移動する。デフォルトでCtrl+←を押すとこの動作をする
-}
selectLastChild : ModuleWithCache.ModuleWithResult -> Active -> Active
selectLastChild module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActiveReadMe ActiveReadMeSelf ->
            -- 概要欄から概要欄のテキスト入力へ
            ActiveReadMe ActiveReadMeText

        ActivePartDefList ActivePartDefListSelf ->
            -- 定義リストから最後の定義リストへ
            ActivePartDefList
                (ActivePartDef ( ModuleWithCache.getPartDefNum module_ - 1, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf )) ->
            -- 定義から式へ
            ActivePartDefList
                (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr termOpPos )) ->
            let
                exprMaybe =
                    module_
                        |> ModuleWithCache.getPartDef (ModuleIndex.PartDefIndex index)
                        |> Maybe.map PartDef.getExpr
            in
            -- 式の中身
            ActivePartDefList
                (ActivePartDef ( index, ActivePartDefExpr (termOpPosLastChild exprMaybe termOpPos) ))

        _ ->
            active


termOpPosLastChild : Maybe Expr.Expr -> TermOpPos -> TermOpPos
termOpPosLastChild exprMaybe termOpPos =
    let
        lastTermIndex =
            exprMaybe
                |> Maybe.map (Expr.getOthers >> List.length)
                |> Maybe.withDefault 0
    in
    case termOpPos of
        TermOpSelf ->
            TermOpTerm lastTermIndex (TypeNoChildren ExprEditSelect)

        TermOpHead ->
            TermOpHead

        TermOpTerm termIndex termType ->
            let
                termMaybe =
                    exprMaybe
                        |> Maybe.andThen (Expr.getTermFromIndex termIndex)
            in
            TermOpTerm termIndex (termTypeLastChild termMaybe termType)

        TermOpOp opIndex ->
            TermOpOp opIndex


termTypeLastChild : Maybe Expr.Term -> TermType -> TermType
termTypeLastChild termMaybe termType =
    case ( termMaybe, termType ) of
        ( Just (Expr.Parentheses expr), TypeParentheses termOpPos ) ->
            TypeParentheses (termOpPosLastChild (Just expr) termOpPos)

        ( Just (Expr.Parentheses expr), TypeNoChildren _ ) ->
            TypeParentheses (termOpPosLastChild (Just expr) TermOpSelf)

        ( _, _ ) ->
            termType


{-| 選択を親に変更する。デフォルトでEnterキーを押すとこの動作をする
-}
selectParent : ModuleWithCache.ModuleWithResult -> Active -> Active
selectParent module_ active =
    case active of
        ActiveReadMe ActiveReadMeText ->
            ActiveReadMe ActiveReadMeSelf

        ActivePartDefList (ActivePartDef ( _, ActivePartDefSelf )) ->
            ActivePartDefList ActivePartDefListSelf

        ActivePartDefList (ActivePartDef ( index, ActivePartDefName _ )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefType _ )) ->
            ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr termOpPos )) ->
            case termOpPosParent termOpPos of
                Just movedTermOpPos ->
                    ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr movedTermOpPos ))

                Nothing ->
                    ActivePartDefList (ActivePartDef ( index, ActivePartDefSelf ))

        _ ->
            active


termOpPosParent : TermOpPos -> Maybe TermOpPos
termOpPosParent termOpPos =
    case termOpPos of
        TermOpSelf ->
            Nothing

        TermOpHead ->
            Just TermOpSelf

        TermOpTerm termIndex termType ->
            case termTypeParent termType of
                Just movedTermType ->
                    Just (TermOpTerm termIndex movedTermType)

                Nothing ->
                    Just TermOpSelf

        TermOpOp _ ->
            Just TermOpSelf


termTypeParent : TermType -> Maybe TermType
termTypeParent termType =
    case termType of
        TypeNoChildren _ ->
            Nothing

        TypeParentheses termOpPos ->
            termOpPosParent termOpPos
                |> Maybe.map TypeParentheses

        TypeLambda lambdaPos ->
            lambdaPosParent lambdaPos
                |> Maybe.map TypeLambda


lambdaPosParent : LambdaPos -> Maybe LambdaPos
lambdaPosParent lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            Nothing

        BranchHead ->
            Just LambdaSelf

        Branch index branchPos ->
            branchPosParent branchPos
                |> Maybe.map (Branch index)


branchPosParent : BranchPos -> Maybe BranchPos
branchPosParent branchPos =
    case branchPos of
        BranchSelf ->
            Nothing

        Pattern ->
            Just BranchSelf

        Guard ->
            Just BranchSelf

        Expr termOpPos ->
            case termOpPosParent termOpPos of
                Just movedTermOpPos ->
                    Just (Expr movedTermOpPos)

                Nothing ->
                    Just BranchSelf


{-| 候補の選択を前にもどるか、候補が表示されていない状態なら上の要素を選択する
-}
suggestionPrevOrSelectUp : ModuleWithCache.ModuleWithResult -> Project.Project -> Model -> ( Model, List Emit )
suggestionPrevOrSelectUp module_ project model =
    model
        |> (case getActive model of
                ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect _) )) ->
                    suggestionPrev project

                _ ->
                    update SelectUp project
           )


{-| 候補の選択を次にもどる
-}
suggestionPrev : Project.Project -> Model -> ( Model, List Emit )
suggestionPrev project model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
            if index - 1 < 0 then
                let
                    ( newModel, emitList ) =
                        model
                            |> setActive
                                project
                                (ActivePartDefList
                                    (ActivePartDef
                                        ( partDefIndex
                                        , ActivePartDefName NameEditText
                                        )
                                    )
                                )
                in
                ( newModel
                , [ EmitMsgToSource
                        (Source.MsgModule
                            { moduleIndex =
                                getTargetModuleIndex newModel
                            , moduleMsg =
                                ModuleWithCache.MsgSetName (ModuleIndex.PartDefIndex index) searchName
                            }
                        )
                  ]
                    ++ emitList
                )

            else
                let
                    ( newModel, emitList ) =
                        model
                            |> setActive
                                project
                                (ActivePartDefList
                                    (ActivePartDef
                                        ( partDefIndex
                                        , ActivePartDefName
                                            (NameEditSuggestionSelect
                                                { index = index - 1
                                                , searchName = searchName
                                                }
                                            )
                                        )
                                    )
                                )
                in
                ( newModel
                , suggestionSelectChangedThenNameChangeEmit
                    (index - 1)
                    (ModuleIndex.PartDefIndex partDefIndex)
                    (getTargetModuleIndex newModel)
                    ++ emitList
                )

        _ ->
            ( model
            , []
            )


{-| 候補の選択を次に進めるか、候補が表示されていない状態なら下の要素を選択する
-}
suggestionNextOrSelectDown : ModuleWithCache.ModuleWithResult -> Project.Project -> Model -> ( Model, List Emit )
suggestionNextOrSelectDown module_ project model =
    model
        |> (case getActive model of
                ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
                    suggestionNext module_ project

                ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditText )) ->
                    suggestionNext module_ project

                _ ->
                    update SelectDown project
           )


{-| 候補の選択を次に進める
-}
suggestionNext : ModuleWithCache.ModuleWithResult -> Project.Project -> Model -> ( Model, List Emit )
suggestionNext module_ project model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
            let
                ( newModel, emitList ) =
                    model
                        |> setActive
                            project
                            (ActivePartDefList
                                (ActivePartDef
                                    ( partDefIndex
                                    , ActivePartDefName
                                        (NameEditSuggestionSelect
                                            { index = index + 1
                                            , searchName = searchName
                                            }
                                        )
                                    )
                                )
                            )
            in
            ( newModel
            , suggestionSelectChangedThenNameChangeEmit
                (index + 1)
                (ModuleIndex.PartDefIndex partDefIndex)
                (getTargetModuleIndex newModel)
                ++ emitList
            )

        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName NameEditText )) ->
            let
                searchName =
                    module_
                        |> ModuleWithCache.getPartDef (ModuleIndex.PartDefIndex partDefIndex)
                        |> Maybe.map PartDef.getName
                        |> Maybe.withDefault Name.NoName

                ( newModel, emitList ) =
                    model
                        |> setActive
                            project
                            (ActivePartDefList
                                (ActivePartDef
                                    ( partDefIndex
                                    , ActivePartDefName
                                        (NameEditSuggestionSelect
                                            { index = 0
                                            , searchName = searchName
                                            }
                                        )
                                    )
                                )
                            )
            in
            ( newModel
            , suggestionSelectChangedThenNameChangeEmit
                0
                (ModuleIndex.PartDefIndex partDefIndex)
                (getTargetModuleIndex newModel)
                ++ emitList
            )

        _ ->
            ( model
            , []
            )


suggestionSelectChangedThenNameChangeEmit : Int -> ModuleIndex.PartDefIndex -> SourceIndex.ModuleIndex -> List Emit
suggestionSelectChangedThenNameChangeEmit suggestIndex partDefIndex moduleRef =
    case nameSuggestList |> Utility.ListExtra.getAt suggestIndex of
        Just ( suggestName, _ ) ->
            [ EmitMsgToSource
                (Source.MsgModule
                    { moduleIndex = moduleRef
                    , moduleMsg =
                        ModuleWithCache.MsgSetName partDefIndex (Name.SafeName suggestName)
                    }
                )
            ]

        Nothing ->
            []


{-| 複数行入力の確定。概要や文字列リテラルでの入力を確定にする
-}
confirmMultiLineTextField : Active -> Active
confirmMultiLineTextField active =
    case active of
        ActiveReadMe ActiveReadMeText ->
            ActiveReadMe ActiveReadMeSelf

        _ ->
            active


{-| 単一行入力の確定。名前や型、式の入力を確定にする
-}
confirmSingleLineTextField : Active -> Active
confirmSingleLineTextField active =
    case active of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName _ )) ->
            ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName NameEditSelect ))

        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefType _ )) ->
            ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefType TypeEditSelect ))

        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefExpr termOpPos )) ->
            ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefExpr (confirmTermOpPos termOpPos) ))

        _ ->
            active


confirmTermOpPos : TermOpPos -> TermOpPos
confirmTermOpPos termOpPos =
    case termOpPos of
        TermOpSelf ->
            TermOpSelf

        TermOpHead ->
            TermOpHead

        TermOpOp opIndex ->
            TermOpOp opIndex

        TermOpTerm termIndex termType ->
            TermOpTerm termIndex (confirmTermType termType)


confirmTermType : TermType -> TermType
confirmTermType termType =
    case termType of
        TypeNoChildren _ ->
            TypeNoChildren ExprEditSelect

        TypeParentheses termOpPos ->
            TypeParentheses (confirmTermOpPos termOpPos)

        TypeLambda lambdaPos ->
            TypeLambda lambdaPos


{-| デフォルトではEnterキーを押した時の動作。テキスト編集中なら確定にして、それ以外なら親に移動する
-}
confirmSingleLineTextFieldOrSelectParent : ModuleWithCache.ModuleWithResult -> Active -> Active
confirmSingleLineTextFieldOrSelectParent targetModule active =
    if isNeedConfirmSingleLineTextField active then
        confirmSingleLineTextField active

    else
        selectParent targetModule active


isNeedConfirmSingleLineTextField : Active -> Bool
isNeedConfirmSingleLineTextField active =
    case active of
        ActiveNone ->
            False

        ActiveReadMe _ ->
            False

        ActivePartDefList ActivePartDefListSelf ->
            False

        ActivePartDefList (ActivePartDef ( _, ActivePartDefSelf )) ->
            False

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditText )) ->
            True

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect _) )) ->
            True

        ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditSelect )) ->
            False

        ActivePartDefList (ActivePartDef ( _, ActivePartDefType TypeEditSelect )) ->
            False

        ActivePartDefList (ActivePartDef ( _, ActivePartDefExpr termOpPos )) ->
            isNeedConfirmSingleLineTextFieldTermOp termOpPos


{-| TODO
-}
isNeedConfirmSingleLineTextFieldTermOp : TermOpPos -> Bool
isNeedConfirmSingleLineTextFieldTermOp termOpPos =
    case termOpPos of
        TermOpSelf ->
            False

        TermOpHead ->
            False

        TermOpTerm _ termType ->
            isNeedConfirmSingleLineTextFieldTermType termType

        TermOpOp _ ->
            False


isNeedConfirmSingleLineTextFieldTermType : TermType -> Bool
isNeedConfirmSingleLineTextFieldTermType termType =
    case termType of
        TypeNoChildren ExprEditSelect ->
            False

        TypeNoChildren ExprEditText ->
            True

        TypeNoChildren (ExprEditSelectSuggestion _) ->
            True

        TypeParentheses termOpPos ->
            isNeedConfirmSingleLineTextFieldTermOp termOpPos

        TypeLambda _ ->
            False



{- =================== Input ==================== -}


input : String -> Project.Project -> ModuleWithCache.ModuleWithResult -> Model -> ( Model, List Emit )
input string project targetModule model =
    case getActive model of
        ActiveReadMe activeReadMe ->
            model |> inputInReadMe string activeReadMe

        ActivePartDefList activePartDefList ->
            model |> inputInPartDefList string project targetModule activePartDefList

        ActiveNone ->
            ( model
            , []
            )


{-| ReadMeがアクティブな時の入力
-}
inputInReadMe : String -> ReadMeActive -> Model -> ( Model, List Emit )
inputInReadMe string readMeActive model =
    case readMeActive of
        ActiveReadMeText ->
            ( model
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = getTargetModuleIndex model
                        , moduleMsg =
                            ModuleWithCache.MsgSetReadMe string
                        }
                    )
              ]
            )

        ActiveReadMeSelf ->
            ( model
            , []
            )


{-| PartDefListがアクティブな時の入力
-}
inputInPartDefList : String -> Project.Project -> ModuleWithCache.ModuleWithResult -> PartDefListActive -> Model -> ( Model, List Emit )
inputInPartDefList string project targetModule partDefListActive model =
    let
        ( active, emitList ) =
            case partDefListActive of
                ActivePartDef ( index, ActivePartDefName _ ) ->
                    parserBeginWithName string index (getTargetModuleIndex model)

                ActivePartDef ( index, ActivePartDefType _ ) ->
                    parserBeginWithType string index (getTargetModuleIndex model)

                ActivePartDef ( index, ActivePartDefExpr TermOpSelf ) ->
                    parserInExpr string index (getTargetModuleIndex model)

                ActivePartDef ( _, ActivePartDefExpr TermOpHead ) ->
                    ( getActive model
                    , []
                    )

                ActivePartDef ( index, ActivePartDefExpr (TermOpTerm termIndex _) ) ->
                    parserBeginWithTerm string
                        index
                        (getTargetModuleIndex model)
                        termIndex
                        (ModuleWithCache.getPartDef (ModuleIndex.PartDefIndex index)
                            targetModule
                            |> Maybe.withDefault PartDef.empty
                            |> PartDef.getExpr
                        )

                ActivePartDef ( index, ActivePartDefExpr (TermOpOp opIndex) ) ->
                    parserBeginWithOp string
                        index
                        (getTargetModuleIndex model)
                        opIndex
                        (ModuleWithCache.getPartDef
                            (ModuleIndex.PartDefIndex index)
                            targetModule
                            |> Maybe.withDefault PartDef.empty
                            |> PartDef.getExpr
                        )

                ActivePartDef ( _, ActivePartDefSelf ) ->
                    ( getActive model
                    , []
                    )

                ActivePartDefListSelf ->
                    ( getActive model
                    , []
                    )

        ( newModel, activeEmitList ) =
            model
                |> setActive project active
    in
    ( newModel
    , emitList ++ activeEmitList
    )


parserBeginWithName : String -> Int -> SourceIndex.ModuleIndex -> ( Active, List Emit )
parserBeginWithName string index moduleRef =
    case Parser.beginWithName (Parser.SimpleChar.fromString string) of
        Parser.BeginWithNameEndName { name, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefName NameEditText ))
            , [ emitSetName moduleRef (ModuleIndex.PartDefIndex index) name ]
            )

        Parser.BeginWithNameEndType { name, type_, textAreaValue } ->
            if Type.isEmpty type_ then
                ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))
                , [ emitSetName moduleRef (ModuleIndex.PartDefIndex index) name
                  , EmitSetTextAreaValue ""
                  ]
                )

            else
                ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))
                , [ emitSetName moduleRef (ModuleIndex.PartDefIndex index) name
                  , emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_
                  , textAreaValueToSetTextEmit textAreaValue
                  ]
                )

        Parser.BeginWithNameEndExprTerm { name, type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (if headTerm == Expr.None && opAndTermList == [] then
                            TermOpSelf

                         else
                            TermOpTerm (List.length opAndTermList) (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ emitSetName moduleRef (ModuleIndex.PartDefIndex index) name
              , EmitSetTextAreaValue (textAreaValue |> List.map Tuple.first |> String.fromList)
              ]
                ++ (if Type.isEmpty type_ then
                        []

                    else
                        [ emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_ ]
                   )
                ++ [ emitSetExpr moduleRef (ModuleIndex.PartDefIndex index) (Expr.make headTerm opAndTermList)
                   ]
            )

        Parser.BeginWithNameEndExprOp { name, type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr (TermOpOp (List.length opAndTermList))
                    )
                )
            , [ emitSetName moduleRef (ModuleIndex.PartDefIndex index) name
              , emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_
              , emitSetExpr moduleRef
                    (ModuleIndex.PartDefIndex index)
                    (Expr.make headTerm (opAndTermList ++ [ ( lastOp, Expr.None ) ]))
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithType : String -> Int -> SourceIndex.ModuleIndex -> ( Active, List Emit )
parserBeginWithType string index moduleRef =
    case Parser.beginWithType (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTypeEndType { type_, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))
            , [ emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_ ]
            )

        Parser.BeginWithTypeEndExprTerm { type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (case List.length opAndTermList of
                            0 ->
                                TermOpSelf

                            length ->
                                TermOpTerm length (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_
              , emitSetExpr moduleRef
                    (ModuleIndex.PartDefIndex index)
                    (Expr.make headTerm opAndTermList)
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )

        Parser.BeginWithTypeEndExprOp { type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))
            , [ emitSetType moduleRef (ModuleIndex.PartDefIndex index) type_
              , emitSetExpr moduleRef
                    (ModuleIndex.PartDefIndex index)
                    (Expr.make headTerm (opAndTermList ++ [ ( lastOp, Expr.None ) ]))
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserInExpr : String -> Int -> SourceIndex.ModuleIndex -> ( Active, List Emit )
parserInExpr string index moduleRef =
    case Parser.beginWithExprHead (Parser.SimpleChar.fromString string) of
        Parser.BeginWithExprHeadEndTerm { headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (TermOpTerm
                            (List.length opAndTermList)
                            (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ emitSetExpr moduleRef
                    (ModuleIndex.PartDefIndex index)
                    (Expr.make headTerm opAndTermList)
              ]
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
                        (TermOpOp
                            (List.length opAndTermList)
                        )
                    )
                )
            , [ emitSetExpr moduleRef
                    (ModuleIndex.PartDefIndex index)
                    (Expr.make headTerm opAndTermList)
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithTerm : String -> Int -> SourceIndex.ModuleIndex -> Int -> Expr.Expr -> ( Active, List Emit )
parserBeginWithTerm string index moduleRef termIndex expr =
    case Parser.beginWithExprTerm 0 (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTermEndTerm { headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (TermOpTerm
                            (termIndex + List.length opAndTermList)
                            (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = moduleRef
                        , moduleMsg =
                            ModuleWithCache.MsgSetExpr
                                (ModuleIndex.PartDefIndex index)
                                (expr
                                    |> (if termIndex == 0 then
                                            Expr.replaceAndInsertHeadLastTerm headTerm opAndTermList

                                        else
                                            Expr.replaceAndInsertTermLastTerm (termIndex - 1) headTerm opAndTermList
                                       )
                                )
                        }
                    )
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
                        (TermOpOp
                            (termIndex + List.length opAndTermList)
                        )
                    )
                )
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = moduleRef
                        , moduleMsg =
                            ModuleWithCache.MsgSetExpr
                                (ModuleIndex.PartDefIndex index)
                                (expr
                                    |> (if termIndex == 0 then
                                            Expr.replaceAndInsertHeadLastOp headTerm opAndTermList lastOp

                                        else
                                            Expr.replaceAndInsertTermLastOp termIndex headTerm opAndTermList lastOp
                                       )
                                )
                        }
                    )
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )


parserBeginWithOp : String -> Int -> SourceIndex.ModuleIndex -> Int -> Expr.Expr -> ( Active, List Emit )
parserBeginWithOp string index moduleRef opIndex expr =
    case Parser.beginWithExprOp 0 (Parser.SimpleChar.fromString string) of
        Parser.BeginWithOpEndTerm { headOp, termAndOpList, lastTerm, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (TermOpTerm
                            (opIndex + 1 + List.length termAndOpList)
                            (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = moduleRef
                        , moduleMsg =
                            ModuleWithCache.MsgSetExpr
                                (ModuleIndex.PartDefIndex index)
                                (expr |> Expr.replaceAndInsertOpLastOp opIndex headOp termAndOpList)
                        }
                    )
              , textAreaValueToSetTextEmit textAreaValue
              ]
            )

        Parser.BeginWithOpEndOp { headOp, termAndOpList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( index
                    , ActivePartDefExpr
                        (TermOpOp
                            (opIndex + List.length termAndOpList)
                        )
                    )
                )
            , [ EmitMsgToSource
                    (Source.MsgModule
                        { moduleIndex = moduleRef
                        , moduleMsg =
                            ModuleWithCache.MsgSetExpr
                                (ModuleIndex.PartDefIndex index)
                                (expr |> Expr.replaceAndInsertOpLastOp opIndex headOp termAndOpList)
                        }
                    )
              ]
                ++ (if termAndOpList == [] then
                        []

                    else
                        [ textAreaValueToSetTextEmit textAreaValue ]
                   )
            )


getLastTerm : Expr.Term -> List ( Expr.Operator, Expr.Term ) -> Expr.Term
getLastTerm headTerm opAndTermList =
    Utility.ListExtra.last opAndTermList
        |> Maybe.map Tuple.second
        |> Maybe.withDefault headTerm


getLastOp : Expr.Operator -> List ( Expr.Term, Expr.Operator ) -> Expr.Operator
getLastOp headOp termAndOpList =
    Utility.ListExtra.last termAndOpList
        |> Maybe.map Tuple.second
        |> Maybe.withDefault headOp


textAreaValueToSetTextEmit : List ( Char, Bool ) -> Emit
textAreaValueToSetTextEmit =
    List.map Tuple.first >> String.fromList >> EmitSetTextAreaValue


{-| 名前を変更させるためのEmit
-}
emitSetName : SourceIndex.ModuleIndex -> ModuleIndex.PartDefIndex -> Name.Name -> Emit
emitSetName moduleIndex partDefIndex name =
    EmitMsgToSource
        (Source.MsgModule
            { moduleIndex = moduleIndex
            , moduleMsg =
                ModuleWithCache.MsgSetName partDefIndex name
            }
        )


{-| 型を変更させるためのEmit
-}
emitSetType : SourceIndex.ModuleIndex -> ModuleIndex.PartDefIndex -> Type.Type -> Emit
emitSetType moduleIndex partDefIndex type_ =
    EmitMsgToSource
        (Source.MsgModule
            { moduleIndex = moduleIndex
            , moduleMsg =
                ModuleWithCache.MsgSetType partDefIndex type_
            }
        )


{-| 式を変更させるためのEmit
-}
emitSetExpr : SourceIndex.ModuleIndex -> ModuleIndex.PartDefIndex -> Expr.Expr -> Emit
emitSetExpr moduleIndex partDefIndex expr =
    EmitMsgToSource
        (Source.MsgModule
            { moduleIndex = moduleIndex
            , moduleMsg =
                ModuleWithCache.MsgSetExpr partDefIndex expr
            }
        )



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
                |> Source.getModule moduleRef
    in
    { title = L.toCapitalString (ModuleWithCache.getName targetModule)
    , body =
        [ Html.div [] [ Html.text (activeToString active) ]
        , readMeView (ModuleWithCache.getReadMe targetModule)
            isFocus
            (case active of
                ActiveReadMe readMeActive ->
                    Just readMeActive

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
            (ModuleWithCache.getPartDefAndResultList targetModule)
        ]
    }


activeToString : Active -> String
activeToString active =
    case active of
        ActiveNone ->
            "アクティブなし"

        ActiveReadMe ActiveReadMeSelf ->
            "概要欄"

        ActiveReadMe ActiveReadMeText ->
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

        ActivePartDefName edit ->
            "の名前"
                ++ (case edit of
                        NameEditSelect ->
                            "選択"

                        NameEditText ->
                            "テキスト編集"

                        NameEditSuggestionSelect _ ->
                            "候補選択"
                   )

        ActivePartDefType TypeEditSelect ->
            "の型"

        ActivePartDefExpr termOpPos ->
            "の式" ++ termOpPosToString termOpPos


termOpPosToString : TermOpPos -> String
termOpPosToString termOpPos =
    case termOpPos of
        TermOpSelf ->
            "自体"

        TermOpHead ->
            "の中の先頭"

        TermOpTerm index childTermOp ->
            "の中の" ++ String.fromInt index ++ "番目の項" ++ termTypeToString childTermOp

        TermOpOp index ->
            "の中の" ++ String.fromInt index ++ "番目の演算子"


termTypeToString : TermType -> String
termTypeToString termType =
    case termType of
        TypeNoChildren edit ->
            "自体(項)"
                ++ (case edit of
                        ExprEditSelect ->
                            "選択"

                        ExprEditText ->
                            "テキスト編集"

                        ExprEditSelectSuggestion _ ->
                            "候補選択"
                   )

        TypeParentheses termOpPos ->
            termOpPosToString termOpPos

        TypeLambda lambdaPos ->
            "ラムダ" ++ lambdaPosToString lambdaPos


lambdaPosToString : LambdaPos -> String
lambdaPosToString lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            "自体(ラ)"

        BranchHead ->
            "のBranchの先頭"

        Branch index branchPos ->
            "の" ++ String.fromInt index ++ "番目のBranch" ++ branchPosToString branchPos


branchPosToString : BranchPos -> String
branchPosToString branchPos =
    case branchPos of
        BranchSelf ->
            "自体(ブ)"

        Pattern ->
            "のパターン"

        Guard ->
            "のガード"

        Expr termOpPos ->
            "の式" ++ termOpPosToString termOpPos



{- ===== readMe View ===== -}


readMeView : String -> Bool -> Maybe ReadMeActive -> Html.Html Msg
readMeView readMe isFocus readMeActiveMaybe =
    let
        editHere =
            case readMeActiveMaybe of
                Just ActiveReadMeText ->
                    isFocus

                _ ->
                    False
    in
    Html.div
        ([ subClassList
            [ ( "readMe", True )
            , ( "readMe-active", readMeActiveMaybe == Just ActiveReadMeSelf )
            ]
         ]
            ++ (case readMeActiveMaybe of
                    Just ActiveReadMeSelf ->
                        []

                    _ ->
                        [ Html.Events.onClick (ActiveTo (ActiveReadMe ActiveReadMeSelf)) ]
               )
        )
        [ readMeViewTitle
        , readMeViewInputArea readMe isFocus readMeActiveMaybe
        ]


readMeViewTitle : Html.Html Msg
readMeViewTitle =
    Html.h2
        [ subClass "readMe-title" ]
        [ Html.text "ReadMe" ]


readMeViewInputArea : String -> Bool -> Maybe ReadMeActive -> Html.Html Msg
readMeViewInputArea readMe isFocus readMeActiveMaybe =
    Html.div [ subClass "readMe-inputArea" ]
        [ Html.div
            [ subClassList
                [ ( "readMe-container", True )
                , ( "readMe-container-active", readMeActiveMaybe == Just ActiveReadMeText )
                ]
            ]
            [ readMeViewMeasure readMe
            , readMeViewTextArea readMe isFocus readMeActiveMaybe
            ]
        ]


readMeViewMeasure : String -> Html.Html Msg
readMeViewMeasure readMe =
    let
        lineList =
            readMe |> String.lines
    in
    Html.div
        [ subClass "readMe-measure" ]
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


readMeViewTextArea : String -> Bool -> Maybe ReadMeActive -> Html.Html Msg
readMeViewTextArea readMe isFocus readMeActiveMaybe =
    Html.textarea
        ([ subClass "readMe-textarea"
         ]
            ++ (case readMeActiveMaybe of
                    Just ActiveReadMeSelf ->
                        [ Html.Attributes.property "value" (Json.Encode.string readMe)
                        ]
                            ++ (if isFocus then
                                    [ Html.Events.stopPropagationOn "click" focusEventJsonDecoder ]

                                else
                                    [ Html.Events.onClick (ActiveTo (ActiveReadMe ActiveReadMeText)) ]
                               )

                    Just ActiveReadMeText ->
                        [ Html.Events.onInput Input
                        , Html.Attributes.property "value" (Json.Encode.string readMe)
                        , Html.Events.stopPropagationOn "click" focusEventJsonDecoder
                        , subClass "readMe-textarea-focus"
                        ]
                            ++ (if isFocus then
                                    [ Html.Attributes.id "edit" ]

                                else
                                    []
                               )

                    Nothing ->
                        if isFocus then
                            [ Html.Events.stopPropagationOn "click" focusEventJsonDecoder
                            , Html.Attributes.property "value" (Json.Encode.string readMe)
                            ]

                        else
                            [ Html.Events.onClick (ActiveTo (ActiveReadMe ActiveReadMeText))
                            , Html.Attributes.property "value" (Json.Encode.string readMe)
                            ]
               )
        )
        []


focusEventJsonDecoder : Json.Decode.Decoder ( Msg, Bool )
focusEventJsonDecoder =
    Json.Decode.succeed
        ( ActiveTo (ActiveReadMe ActiveReadMeText), True )



{- ==================================================
            part definitions パーツの定義
   ==================================================
-}


{-| モジュールエディタのメインの要素であるパーツエディタを表示する
-}
partDefinitionsView : Bool -> Maybe PartDefListActive -> List ( PartDef.PartDef, ModuleWithCache.CompileAndRunResult ) -> Html.Html Msg
partDefinitionsView isFocus partDefListActiveMaybe partDefAndResultList =
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
        [ partDefinitionsViewTitle
        , partDefListView
            isFocus
            partDefAndResultList
            (case partDefListActiveMaybe of
                Just (ActivePartDef partDefActiveWithIndex) ->
                    Just partDefActiveWithIndex

                _ ->
                    Nothing
            )
        ]


partDefinitionsViewTitle : Html.Html Msg
partDefinitionsViewTitle =
    Html.div
        [ subClass "partDefinitions-title" ]
        [ Html.text "Part Definitions" ]


partDefListView : Bool -> List ( PartDef.PartDef, ModuleWithCache.CompileAndRunResult ) -> Maybe ( Int, PartDefActive ) -> Html.Html Msg
partDefListView isFocus defAndResultList partDefActiveWithIndexMaybe =
    Html.div
        [ subClass "partDefList"
        ]
        ((defAndResultList
            |> List.indexedMap
                (\index ( partDef, result ) ->
                    partDefView
                        isFocus
                        partDef
                        result
                        (case partDefActiveWithIndexMaybe of
                            Just ( i, partDefActive ) ->
                                if i == index then
                                    Just partDefActive

                                else
                                    Nothing

                            _ ->
                                Nothing
                        )
                        |> Html.map
                            (\m ->
                                case m of
                                    DefActiveTo ref ->
                                        ActiveTo (ActivePartDefList (ActivePartDef ( index, ref )))

                                    DefInput string ->
                                        Input string
                            )
                )
         )
            ++ [ addDefButton ]
        )


partDefView : Bool -> PartDef.PartDef -> ModuleWithCache.CompileAndRunResult -> Maybe PartDefActive -> Html.Html DefViewMsg
partDefView isFocus partDef compileAndRunResult partDefActiveMaybe =
    Html.div
        [ subClassList
            [ ( "partDef", True )
            , ( "partDef-active", partDefActiveMaybe == Just ActivePartDefSelf )
            ]
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed
                ( DefActiveTo ActivePartDefSelf
                , isFocus
                )
            )
        ]
        [ Html.div
            [ subClass "partDef-defArea" ]
            [ partDefViewNameAndType (PartDef.getName partDef) (PartDef.getType partDef) partDefActiveMaybe
            , partDefViewExpr
                (PartDef.getExpr partDef)
                (case partDefActiveMaybe of
                    Just (ActivePartDefExpr partDefExprActive) ->
                        Just partDefExprActive

                    _ ->
                        Nothing
                )
            ]
        , resultArea compileAndRunResult
        ]


type DefViewMsg
    = DefActiveTo PartDefActive
    | DefInput String



{- ================= Result ================= -}


resultArea : ModuleWithCache.CompileAndRunResult -> Html.Html msg
resultArea compileAndRunResult =
    Html.div
        [ subClass "partDef-resultArea" ]
        [ Html.div
            []
            [ Html.text
                (ModuleWithCache.compileAndRunResultGetCompileResult compileAndRunResult
                    |> Maybe.map Compiler.compileResultToString
                    |> Maybe.withDefault "コンパイル中……"
                )
            ]
        , Html.div
            []
            [ Html.text
                (ModuleWithCache.compileAndRunResultGetRunResult compileAndRunResult
                    |> Maybe.map String.fromInt
                    |> Maybe.withDefault "評価結果がない"
                )
            ]
        ]



{- ================= Name And Type ================= -}


partDefViewNameAndType : Name.Name -> Type.Type -> Maybe PartDefActive -> Html.Html DefViewMsg
partDefViewNameAndType name type_ partDefActiveMaybe =
    Html.div
        [ subClass "partDef-nameAndType" ]
        [ partDefViewName name
            (case partDefActiveMaybe of
                Just (ActivePartDefName nameEdit) ->
                    Just nameEdit

                _ ->
                    Nothing
            )
        , Html.text ":"
        , partDefViewType type_
            (case partDefActiveMaybe of
                Just (ActivePartDefType typeEdit) ->
                    Just typeEdit

                _ ->
                    Nothing
            )
        ]



{------------------ Name  ------------------}


partDefViewName : Name.Name -> Maybe NameEdit -> Html.Html DefViewMsg
partDefViewName name nameEditMaybe =
    case nameEditMaybe of
        Just NameEditText ->
            partDefNameEditView name Nothing

        Just (NameEditSuggestionSelect suggestSelectData) ->
            partDefNameEditView name (Just suggestSelectData)

        Just NameEditSelect ->
            partDefNameSelectView name

        Nothing ->
            partDefNameNormalView name


partDefNameNormalView : Name.Name -> Html.Html DefViewMsg
partDefNameNormalView name =
    Html.div
        [ subClass "partDef-nameContainer"
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( DefActiveTo (ActivePartDefName NameEditSelect), True ))
        ]
        [ case name of
            Name.SafeName safeName ->
                Html.div
                    [ subClass "partDef-nameText" ]
                    [ Html.text (Name.safeNameToString safeName) ]

            Name.NoName ->
                Html.div
                    [ subClass "partDef-nameTextNone" ]
                    [ Html.text "NO NAME" ]
        ]


partDefNameSelectView : Name.Name -> Html.Html DefViewMsg
partDefNameSelectView name =
    Html.Keyed.node "div"
        [ subClass "partDef-nameContainer"
        , subClass "partDef-element-active"
        ]
        [ ( "view"
          , case name of
                Name.SafeName safeName ->
                    Html.div
                        [ subClass "partDef-nameText" ]
                        [ Html.text (Name.safeNameToString safeName) ]

                Name.NoName ->
                    Html.div
                        [ subClass "partDef-nameTextNone" ]
                        [ Html.text "NO NAME" ]
          )
        , ( "input"
          , hideTextArea
          )
        ]


partDefNameEditView : Name.Name -> Maybe { index : Int, searchName : Name.Name } -> Html.Html DefViewMsg
partDefNameEditView name suggestSelectDataMaybe =
    Html.Keyed.node "div"
        [ subClass "partDef-nameContainer" ]
        [ ( "input"
          , Html.textarea
                [ subClass "partDef-nameTextArea"
                , Html.Attributes.id "edit"
                , Html.Events.onInput DefInput
                ]
                []
          )
        , ( "suggest"
          , suggestionName name suggestSelectDataMaybe
          )
        ]


suggestionName : Name.Name -> Maybe { index : Int, searchName : Name.Name } -> Html.Html msg
suggestionName name suggestSelectDataMaybe =
    Html.div
        [ subClass "partDef-suggestion" ]
        (case suggestSelectDataMaybe of
            Just { index, searchName } ->
                [ suggestNameItem (nameToEditorStyleString searchName) "" False ]
                    ++ (nameSuggestList
                            |> List.indexedMap
                                (\i ( safeName, subText ) ->
                                    suggestNameItem (Name.safeNameToString safeName) subText (i == index)
                                )
                       )

            Nothing ->
                [ suggestNameItem
                    (nameToEditorStyleString name)
                    ""
                    True
                ]
                    ++ (nameSuggestList
                            |> List.map
                                (\( safeName, subText ) ->
                                    suggestNameItem (Name.safeNameToString safeName) subText False
                                )
                       )
        )


nameToEditorStyleString : Name.Name -> String
nameToEditorStyleString name =
    case name of
        Name.SafeName n ->
            Name.safeNameToString n

        Name.NoName ->
            "名前を決めない"


suggestNameItem : String -> String -> Bool -> Html.Html msg
suggestNameItem mainText subText isSelect =
    Html.div
        [ subClassList
            [ ( "partDef-suggestion-item", True )
            , ( "partDef-suggestion-item-select", isSelect )
            ]
        ]
        ([ Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-text", True )
                , ( "partDef-suggestion-item-text-select", isSelect )
                ]
            ]
            [ Html.text mainText ]
         ]
            ++ (if subText == "" then
                    []

                else
                    [ Html.div
                        [ subClassList
                            [ ( "partDef-suggestion-item-subText", True )
                            , ( "partDef-suggestion-item-subText-select", isSelect )
                            ]
                        ]
                        [ Html.text subText ]
                    ]
               )
            ++ (if isSelect then
                    [ enterIcon ]

                else
                    []
               )
        )


enterIcon : Html.Html msg
enterIcon =
    NSvg.toHtmlWithClass
        "moduleEditor-partDef-suggestion-item-enterIcon"
        { x = 0, y = 0, width = 38, height = 32 }
        [ NSvg.polygon [ ( 4, 4 ), ( 34, 4 ), ( 34, 28 ), ( 12, 28 ), ( 12, 16 ), ( 4, 16 ) ] NSvg.strokeNone NSvg.fillNone
        , NSvg.path "M30,8 V20 H16 L18,18 M16,20 L18,22" NSvg.strokeNone NSvg.fillNone
        ]


nameSuggestList : List ( Name.SafeName, String )
nameSuggestList =
    [ ( L.make L.hg [ L.oa, L.om, L.oe ], "ゲーム" )
    , ( L.make L.hh [ L.oe, L.or, L.oo ], "主人公" )
    , ( L.make L.hb [ L.oe, L.oa, L.ou, L.ot, L.oi, L.of_, L.ou, L.ol, L.oG, L.oi, L.or, L.ol ], "美少女" )
    , ( L.make L.hm [ L.oo, L.on, L.os, L.ot, L.oe, L.or ], "モンスター" )
    , ( L.make L.hw [ L.oo, L.or, L.ol, L.od ], "世界" )
    ]
        |> List.map (Tuple.mapFirst Name.safeNameFromLabel)



{------------------ Type  ------------------}


partDefViewType : Type.Type -> Maybe TypeEdit -> Html.Html DefViewMsg
partDefViewType type_ typeEditMaybe =
    case typeEditMaybe of
        Just TypeEditSelect ->
            partDefTypeSelectView type_

        Nothing ->
            partDefTypeNormalView type_


partDefTypeNormalView : Type.Type -> Html.Html DefViewMsg
partDefTypeNormalView type_ =
    Html.div
        [ subClass "partDef-typeContainer"
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( DefActiveTo (ActivePartDefType TypeEditSelect), True ))
        ]
        [ case Type.toString type_ of
            Just typeString ->
                Html.div
                    [ subClass "partDef-typeText" ]
                    [ Html.text typeString ]

            Nothing ->
                Html.div
                    [ subClass "partDef-typeTextNone" ]
                    [ Html.text "NO TYPE" ]
        ]


partDefTypeSelectView : Type.Type -> Html.Html DefViewMsg
partDefTypeSelectView type_ =
    Html.Keyed.node "div"
        [ subClass "partDef-typeContainer"
        , subClass "partDef-element-active"
        ]
        [ ( "view"
          , case Type.toString type_ of
                Just typeString ->
                    Html.div
                        [ subClass "partDef-typeText" ]
                        [ Html.text typeString ]

                Nothing ->
                    Html.div
                        [ subClass "partDef-typeTextNone" ]
                        [ Html.text "NO TYPE" ]
          )
        , ( "input"
          , hideTextArea
          )
        ]


partDefTypeEditView : Type.Type -> Int -> Html.Html DefViewMsg
partDefTypeEditView type_ suggestIndex =
    Html.Keyed.node "div"
        [ subClass "partDef-typeContainer" ]
        [ ( "input"
          , Html.textarea
                [ subClass "partDef-typeTextArea"
                , Html.Attributes.id "edit"
                , Html.Events.onInput DefInput
                ]
                []
          )
        , ( "suggest"
          , suggestionType type_ suggestIndex
          )
        ]


suggestionType : Type.Type -> Int -> Html.Html msg
suggestionType type_ suggestIndex =
    Html.div
        [ subClass "partDef-suggestion" ]
        [ suggestTypeItem
            (Type.Valid
                (SourceIndex.TypeIndex
                    { moduleIndex = SourceIndex.CoreInt32
                    , typeIndex = ModuleIndex.TypeDefIndex 0
                    }
                )
            )
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


partDefViewExpr : Expr.Expr -> Maybe TermOpPos -> Html.Html DefViewMsg
partDefViewExpr expr termOpPosMaybe =
    Html.div
        ([ subClass "partDef-expr" ]
            ++ (case termOpPosMaybe of
                    Just TermOpSelf ->
                        [ subClass "partDef-element-active" ]

                    _ ->
                        [ Html.Events.stopPropagationOn "click"
                            (Json.Decode.succeed ( DefActiveTo (ActivePartDefExpr TermOpSelf), True ))
                        ]
               )
        )
        ([ Html.text "="
         , termOpView termOpPosMaybe expr
            |> Html.map (\m -> DefActiveTo (ActivePartDefExpr m))
         ]
            ++ (case termOpPosMaybe of
                    Just _ ->
                        [ hideTextArea ]

                    Nothing ->
                        []
               )
        )


termOpView : Maybe TermOpPos -> Expr.Expr -> Html.Html TermOpPos
termOpView termOpPosMaybe expr =
    Html.div
        [ subClass "partDef-termOp" ]
        ((case termOpPosMaybe of
            Just TermOpHead ->
                [ activeHeadTermLeft ]

            _ ->
                []
         )
            ++ [ (case termOpPosMaybe of
                    Just (TermOpTerm 0 termPos) ->
                        termViewOutput (Expr.getHead expr)
                            (Just termPos)

                    _ ->
                        termViewOutput (Expr.getHead expr)
                            Nothing
                 )
                    |> Html.map (always (TermOpTerm 0 (TypeNoChildren ExprEditSelect)))
               ]
            ++ partDefViewTermOpList (Expr.getOthers expr) termOpPosMaybe
        )


partDefViewTermOpList : List ( Expr.Operator, Expr.Term ) -> Maybe TermOpPos -> List (Html.Html TermOpPos)
partDefViewTermOpList termOpList termOpPosMaybe =
    termOpList
        |> List.indexedMap
            (\index ( op, term ) ->
                [ opViewOutput op
                    (termOpPosMaybe == Just (TermOpOp index))
                    |> Html.map (always (TermOpOp index))
                , (case termOpPosMaybe of
                    Just (TermOpTerm i termOpPos) ->
                        if i == index + 1 then
                            termViewOutput term
                                (Just termOpPos)

                        else if index == List.length termOpList - 1 && index < i then
                            termViewOutput term
                                (Just termOpPos)

                        else
                            termViewOutput term
                                Nothing

                    _ ->
                        termViewOutput term
                            Nothing
                  )
                    |> Html.map (\m -> TermOpTerm (index + 1) m)
                ]
            )
        |> List.concat



{------------------ Term  ------------------}


{-| 項の表示
-}
termViewOutput : Expr.Term -> Maybe TermType -> Html.Html TermType
termViewOutput term termTypeMaybe =
    let
        isSelect =
            (termTypeMaybe |> Maybe.map (termTypeIsSelectSelf term)) == Just True
    in
    case term of
        Expr.Int32Literal _ ->
            Html.div
                [ Html.Events.stopPropagationOn
                    "click"
                    (Json.Decode.succeed ( TypeNoChildren ExprEditSelect, True ))
                , subClassList
                    [ ( "partDef-term", True )
                    , ( "partDef-term-active", isSelect )
                    ]
                ]
                [ Html.text (Expr.termToString term) ]

        Expr.Part _ ->
            Html.div
                [ Html.Events.stopPropagationOn "click"
                    (Json.Decode.succeed ( TypeNoChildren ExprEditSelect, True ))
                , subClassList
                    [ ( "partDef-term", True )
                    , ( "partDef-term-active", isSelect )
                    ]
                ]
                [ Html.text (Expr.termToString term) ]

        Expr.Parentheses expr ->
            Html.div
                [ Html.Events.stopPropagationOn "click"
                    (Json.Decode.succeed ( TypeNoChildren ExprEditSelect, True ))
                , subClassList
                    [ ( "partDef-term", True )
                    , ( "partDef-term-active", isSelect )
                    ]
                ]
                [ Html.text "("
                , termOpView
                    (case termTypeMaybe of
                        Just (TypeParentheses termOpPos) ->
                            Just termOpPos

                        _ ->
                            Nothing
                    )
                    expr
                    |> Html.map TypeParentheses
                , Html.text ")"
                ]

        Expr.None ->
            Html.div
                [ Html.Events.stopPropagationOn "click"
                    (Json.Decode.succeed ( TypeNoChildren ExprEditSelect, True ))
                , subClassList
                    [ ( "partDef-term-none", True )
                    , ( "partDef-term-active", isSelect )
                    ]
                ]
                []


termTypeIsSelectSelf : Expr.Term -> TermType -> Bool
termTypeIsSelectSelf term termType =
    case ( term, termType ) of
        ( _, TypeNoChildren _ ) ->
            True

        ( _, TypeParentheses TermOpSelf ) ->
            True

        ( _, TypeLambda LambdaSelf ) ->
            True

        ( Expr.Int32Literal _, TypeParentheses _ ) ->
            True

        ( Expr.Int32Literal _, TypeLambda _ ) ->
            True

        ( Expr.Part _, TypeParentheses _ ) ->
            True

        ( Expr.Part _, TypeLambda _ ) ->
            True

        _ ->
            False


termEditView : Expr.Term -> List ( Char, Bool ) -> Html.Html msg
termEditView term textAreaValue =
    Html.div
        [ subClass "partDef-term-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionTerm term ]
        )


suggestionTerm : Expr.Term -> Html.Html msg
suggestionTerm term =
    let
        ( text, subItem ) =
            Expr.termToDescription term
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



{------------------ Operator  ------------------}


opViewOutput : Expr.Operator -> Bool -> Html.Html ()
opViewOutput op isSelected =
    opNormalView op isSelected


opNormalView : Expr.Operator -> Bool -> Html.Html ()
opNormalView op isActive =
    Html.div
        [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( (), True ))
        , subClassList
            [ ( "partDef-op", True )
            , ( "partDef-op-active", isActive )
            ]
        ]
        [ Html.text (Expr.opToString op) ]


opEditView : Expr.Operator -> List ( Char, Bool ) -> Html.Html msg
opEditView op textAreaValue =
    Html.div
        [ subClass "partDef-op-edit" ]
        (textAreaValueToListHtml textAreaValue
            ++ [ suggestionOp op ]
        )


suggestionOp : Expr.Operator -> Html.Html msg
suggestionOp op =
    Html.div
        [ subClass "partDef-suggestion" ]
        ([ suggestionOpItem op True ]
            ++ (Expr.allOperator
                    |> List.filterMap
                        (\o ->
                            if o == op then
                                Nothing

                            else
                                Just (suggestionOpItem o False)
                        )
               )
        )


suggestionOpItem : Expr.Operator -> Bool -> Html.Html msg
suggestionOpItem op isSelect =
    let
        ( text, subItem ) =
            Expr.opToDescription op
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
                , ( "partDef-suggestion-item-subItem-select", isSelect )
                ]
            ]
            [ Html.text subItem ]
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


{-|

    Hide Text Area
    ユーザーからテキストの入力を受け取る隠れた<input type="text">

-}
hideTextArea : Html.Html DefViewMsg
hideTextArea =
    Html.input
        [ subClass "partDef-hideTextArea"
        , Html.Attributes.id "edit"
        , Html.Events.onInput DefInput
        , Html.Attributes.type_ "text"
        ]
        []


{-| 定義を末尾に1つ追加するボタン
-}
addDefButton : Html.Html Msg
addDefButton =
    Html.button
        [ Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( AddPartDef, True ))
        , subClass "partDefList-addPartDef"
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
