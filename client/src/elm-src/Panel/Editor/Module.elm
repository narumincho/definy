module Panel.Editor.Module exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , getTargetModuleIndex
    , initModel
    , isFocusDefaultUi
    , update
    , view
    )

import Array
import Compiler
import Data.Id
import Data.Label as L
import Data.Project
import Data.Project.CompileResult
import Data.Project.Expr as Expr
import Data.Project.Module
import Data.Project.PartDef
import Data.Project.TypeDef
import Html
import Html.Attributes
import Html.Events
import Html.Keyed
import Json.Decode
import Json.Encode
import Panel.DefaultUi
import Parser
import Parser.SimpleChar
import Utility.ArrayExtra
import Utility.ListExtra
import Utility.NSvg as NSvg


type Model
    = Model
        { moduleRef : Data.Id.ModuleId
        , active : Active
        , resultVisible : Array.Array ResultVisible
        }


type ResultVisible
    = ResultVisibleValue
    | ResultVisibleWasmSExpr


type Msg
    = MsgNone
    | MsgActiveTo Active
    | MsgActiveLeft
    | MsgActiveRight
    | MsgActiveUp
    | MsgActiveDown
    | MsgActiveToFirstChild
    | MsgActiveToLastChild
    | MsgActiveToParent
    | MsgSuggestionNext
    | MsgSuggestionPrev
    | MsgSuggestionNextOrSelectDown
    | MsgSuggestionPrevOrSelectUp
    | MsgInput String
    | MsgToEditMode
    | MsgConfirmMultiLineTextField
    | MsgConfirmSingleLineTextField
    | MsgConfirmSingleLineTextFieldOrSelectParent
    | MsgAddPartDef
    | MsgAddTypeDef
    | MsgIncreaseValue
    | MsgDecreaseValue
    | MsgChangeResultVisible Data.Id.PartId ResultVisible
    | MsgFocusThisEditor
    | MsgBlurThisEditor


type Cmd
    = CmdSetTextAreaValue String
    | CmdFocusEditTextAea
    | CmdElementScrollIntoView String
    | None


{-| 選択している要素
-}
type Active
    = ActiveNone
    | ActiveReadMe ReadMeActive
    | ActiveTypeDefList TypeDefListActive
    | ActivePartDefList PartDefListActive


type ReadMeActive
    = ActiveReadMeSelf
    | ActiveReadMeText


type TypeDefListActive
    = ActiveTypeDefListSelf
    | ActiveTypeDef ( Data.Id.TypeId, TypeDefActive )


type TypeDefActive
    = ActiveTypeDefSelf
    | ActiveTypeDefName LabelEdit
    | ActiveTypeDefTagList ( Data.Id.TypeId, TypeDefTagActive )


type TypeDefTagActive
    = ActiveTypeDefTagName LabelEdit
    | ActiveTypeDefTagParameter


type LabelEdit
    = LabelEditSelect
    | LabelEditText
    | LabelEditSuggestion
        { index : Int
        , searchName : L.Label
        }


type PartDefListActive
    = ActivePartDefListSelf
    | ActivePartDef ( Data.Id.PartId, PartDefActive )


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
        , searchName : Maybe L.Label
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


initModel : Data.Id.ModuleId -> Model
initModel moduleId =
    Model
        { moduleRef = moduleId
        , active = ActiveNone
        , resultVisible = Array.fromList []
        }


getTargetModuleIndex : Model -> Data.Id.ModuleId
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


update : Msg -> Data.Project.Project -> Model -> ( Model, List Cmd )
update msg project model =
    let
        targetModule =
            Data.Project.Module.sampleModule

        active =
            model
                |> getActive
    in
    case msg of
        MsgNone ->
            ( model, [] )

        MsgActiveTo toActive ->
            model |> setActive project toActive

        MsgActiveLeft ->
            model |> setActive project (activeLeft targetModule active)

        MsgActiveRight ->
            model |> setActive project (activeRight targetModule active)

        MsgActiveUp ->
            model |> setActive project (activeUp targetModule active)

        MsgActiveDown ->
            model |> setActive project (activeDown targetModule active)

        MsgActiveToFirstChild ->
            model |> setActive project (activeToFirstChild targetModule active)

        MsgActiveToLastChild ->
            model |> setActive project (activeToLastChild targetModule active)

        MsgActiveToParent ->
            model |> setActive project (activeToParent targetModule active)

        MsgSuggestionNext ->
            model |> suggestionNext targetModule project

        MsgSuggestionPrev ->
            model |> suggestionPrev targetModule project

        MsgSuggestionPrevOrSelectUp ->
            model |> suggestionPrevOrSelectUp targetModule project

        MsgSuggestionNextOrSelectDown ->
            model |> suggestionNextOrSelectDown targetModule project

        MsgInput string ->
            model |> input string project targetModule

        MsgToEditMode ->
            ( model
            , []
            )

        MsgConfirmMultiLineTextField ->
            model |> setActive project (confirmMultiLineTextField active)

        MsgConfirmSingleLineTextField ->
            model |> setActive project (confirmSingleLineTextField active)

        MsgConfirmSingleLineTextFieldOrSelectParent ->
            model |> setActive project (confirmSingleLineTextFieldOrSelectParent targetModule active)

        MsgAddPartDef ->
            ( model
            , []
            )

        MsgAddTypeDef ->
            ( model
            , []
            )

        MsgIncreaseValue ->
            model |> increaseValue targetModule

        MsgDecreaseValue ->
            model |> decreaseValue targetModule

        MsgChangeResultVisible partDefIndex resultVisible ->
            model
                |> changeResultVisible
                    (targetModule |> Data.Project.Module.getPartDefinitionIds |> List.length)
                    partDefIndex
                    resultVisible

        MsgFocusThisEditor ->
            ( model
            , []
            )

        MsgBlurThisEditor ->
            model |> update MsgConfirmMultiLineTextField project


{-| アクティブな対象を変更する
-}
setActive : Data.Project.Project -> Active -> Model -> ( Model, List Cmd )
setActive project active (Model rec) =
    let
        targetModule =
            Data.Project.Module.sampleModule
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
                [ CmdElementScrollIntoView readMeId ]

            ActiveReadMe ActiveReadMeText ->
                [ CmdFocusEditTextAea, CmdElementScrollIntoView readMeId ]

            ActiveTypeDefList _ ->
                [ CmdElementScrollIntoView typeDefId ]

            ActivePartDefList partDefListActive ->
                setActivePartDefList partDefListActive

      else
        []
    )


setActivePartDefList : PartDefListActive -> List Cmd
setActivePartDefList partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            [ CmdElementScrollIntoView partDefinitionId ]

        ActivePartDef ( partDefIndex, ActivePartDefSelf ) ->
            [ CmdElementScrollIntoView (partDefElementId partDefIndex)
            ]

        ActivePartDef ( partDefIndex, ActivePartDefName NameEditSelect ) ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            , CmdElementScrollIntoView (partDefElementId partDefIndex)
            ]

        ActivePartDef ( partDefIndex, ActivePartDefName NameEditText ) ->
            [ CmdFocusEditTextAea
            , CmdElementScrollIntoView (partDefElementId partDefIndex)
            ]

        ActivePartDef ( partDefIndex, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) ) ->
            let
                name =
                    suggestionNameList
                        |> Utility.ListExtra.getAt index
                        |> Maybe.map (Tuple.first >> L.toSmallString)
                        |> Maybe.withDefault ""
            in
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue name
            , CmdElementScrollIntoView (partDefElementId partDefIndex)
            ]

        ActivePartDef ( partDefIndex, ActivePartDefType TypeEditSelect ) ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            , CmdElementScrollIntoView (partDefElementId partDefIndex)
            ]

        ActivePartDef ( partDefIndex, ActivePartDefExpr termOpPos ) ->
            [ CmdElementScrollIntoView (partDefElementId partDefIndex) ]
                ++ setActiveTermOpPos termOpPos


setActiveTermOpPos : TermOpPos -> List Cmd
setActiveTermOpPos termOpPos =
    case termOpPos of
        TermOpSelf ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            ]

        TermOpHead ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            ]

        TermOpTerm _ termType ->
            setActiveTermType termType

        TermOpOp _ ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            ]


setActiveTermType : TermType -> List Cmd
setActiveTermType termType =
    case termType of
        TypeNoChildren ExprEditSelect ->
            [ CmdFocusEditTextAea
            , CmdSetTextAreaValue ""
            ]

        TypeNoChildren ExprEditText ->
            [ CmdFocusEditTextAea
            ]

        TypeNoChildren (ExprEditSelectSuggestion _) ->
            [ CmdFocusEditTextAea
            ]

        TypeParentheses termOpPos ->
            setActiveTermOpPos termOpPos

        TypeLambda lambdaPos ->
            setActiveLambdaPos lambdaPos


setActiveLambdaPos : LambdaPos -> List Cmd
setActiveLambdaPos lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            []

        BranchHead ->
            []

        Branch int branchPos ->
            setActiveBranchPos branchPos


setActiveBranchPos : BranchPos -> List Cmd
setActiveBranchPos branchPos =
    case branchPos of
        BranchSelf ->
            []

        Pattern ->
            []

        Guard ->
            []

        Expr termOpPos ->
            setActiveTermOpPos termOpPos



{- =========================================================
          ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
   =========================================================
-}


{-| 左のものを選択する
-}
activeLeft : Data.Project.Module.Module -> Active -> Active
activeLeft targetModule active =
    case active of
        ActiveNone ->
            ActivePartDefList ActivePartDefListSelf

        ActiveReadMe readMeActive ->
            ActiveReadMe (readMeActiveLeft readMeActive)

        ActiveTypeDefList typeDefListActive ->
            ActiveTypeDefList (typeDefListActiveLeft typeDefListActive)

        ActivePartDefList activePartDefList ->
            ActivePartDefList (partDefListActiveLeft activePartDefList)


readMeActiveLeft : ReadMeActive -> ReadMeActive
readMeActiveLeft readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            ActiveReadMeSelf

        ActiveReadMeText ->
            ActiveReadMeSelf


typeDefListActiveLeft : TypeDefListActive -> TypeDefListActive
typeDefListActiveLeft typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            ActiveTypeDefListSelf

        ActiveTypeDef ( index, typeDefActive ) ->
            case typeDefActiveLeft typeDefActive of
                Just movedTypeDefActive ->
                    ActiveTypeDef ( index, movedTypeDefActive )

                Nothing ->
                    ActiveTypeDefListSelf


typeDefActiveLeft : TypeDefActive -> Maybe TypeDefActive
typeDefActiveLeft typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            Nothing

        ActiveTypeDefName _ ->
            Just ActiveTypeDefSelf

        ActiveTypeDefTagList ( index, typeDefTagActive ) ->
            case typeDefTagActiveLeft typeDefTagActive of
                Just movedTypeDefTagActive ->
                    Just (ActiveTypeDefTagList ( index, movedTypeDefTagActive ))

                Nothing ->
                    Just ActiveTypeDefSelf


typeDefTagActiveLeft : TypeDefTagActive -> Maybe TypeDefTagActive
typeDefTagActiveLeft typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName _ ->
            Nothing

        ActiveTypeDefTagParameter ->
            Just (ActiveTypeDefTagName LabelEditSelect)


partDefListActiveLeft : PartDefListActive -> PartDefListActive
partDefListActiveLeft partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            ActivePartDefListSelf

        ActivePartDef ( _, ActivePartDefSelf ) ->
            ActivePartDefListSelf

        ActivePartDef ( index, ActivePartDefName _ ) ->
            ActivePartDef ( index, ActivePartDefSelf )

        ActivePartDef ( index, ActivePartDefType _ ) ->
            ActivePartDef ( index, ActivePartDefName NameEditSelect )

        ActivePartDef ( index, ActivePartDefExpr termOpPos ) ->
            ActivePartDef
                ( index
                , case termOpPosLeft termOpPos of
                    Just movedTermOpPos ->
                        ActivePartDefExpr movedTermOpPos

                    Nothing ->
                        ActivePartDefType TypeEditSelect
                )


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



{- =========================================================
            →→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→→
   =========================================================
-}


{-| 右のものを選択する
-}
activeRight : Data.Project.Module.Module -> Active -> Active
activeRight targetModule active =
    case active of
        ActiveNone ->
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe readMeActive ->
            ActiveReadMe (readMeActiveRight readMeActive)

        ActiveTypeDefList typeDefListActive ->
            ActiveTypeDefList (typeDefListActiveRight typeDefListActive)

        ActivePartDefList partDefListActive ->
            ActivePartDefList (partDefListActiveRight targetModule partDefListActive)


readMeActiveRight : ReadMeActive -> ReadMeActive
readMeActiveRight readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            ActiveReadMeText

        ActiveReadMeText ->
            ActiveReadMeText


typeDefListActiveRight : TypeDefListActive -> TypeDefListActive
typeDefListActiveRight typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            ActiveTypeDef
                ( Data.Id.TypeId "moduleFirst"
                , ActiveTypeDefSelf
                )

        ActiveTypeDef ( index, typeDefActive ) ->
            ActiveTypeDef ( index, typeDefActiveRight typeDefActive )


typeDefActiveRight : TypeDefActive -> TypeDefActive
typeDefActiveRight typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            ActiveTypeDefName LabelEditSelect

        ActiveTypeDefName nameEdit ->
            ActiveTypeDefName nameEdit

        ActiveTypeDefTagList ( index, typeDefTagActive ) ->
            ActiveTypeDefTagList
                ( index
                , typeDefTagListActiveRight typeDefTagActive
                )


typeDefTagListActiveRight : TypeDefTagActive -> TypeDefTagActive
typeDefTagListActiveRight typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName _ ->
            ActiveTypeDefTagParameter

        ActiveTypeDefTagParameter ->
            ActiveTypeDefTagParameter


partDefListActiveRight : Data.Project.Module.Module -> PartDefListActive -> PartDefListActive
partDefListActiveRight targetModule partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            ActivePartDef ( Data.Id.PartId "firstPartDefId", ActivePartDefSelf )

        ActivePartDef ( index, ActivePartDefSelf ) ->
            -- 定義から名前へ
            ActivePartDef ( index, ActivePartDefName NameEditSelect )

        ActivePartDef ( index, ActivePartDefName _ ) ->
            -- 名前から型へ
            ActivePartDef ( index, ActivePartDefType TypeEditSelect )

        ActivePartDef ( index, ActivePartDefType _ ) ->
            -- 型から式へ
            ActivePartDef ( index, ActivePartDefExpr TermOpSelf )

        ActivePartDef ( index, ActivePartDefExpr TermOpSelf ) ->
            ActivePartDef ( index, ActivePartDefExpr TermOpHead )

        ActivePartDef ( index, ActivePartDefExpr termOpPos ) ->
            -- 式の中の移動
            let
                exprMaybe =
                    Nothing
            in
            case termOpPosRight exprMaybe termOpPos of
                Just movedTermOpPos ->
                    ActivePartDef ( index, ActivePartDefExpr movedTermOpPos )

                Nothing ->
                    ActivePartDef ( index, ActivePartDefSelf )


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



{- =========================================================
           ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
   =========================================================
-}


{-| ↑ 上のものを選択する
-}
activeUp : Data.Project.Module.Module -> Active -> Active
activeUp module_ active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから定義リストへ
            ActivePartDefList ActivePartDefListSelf

        ActiveReadMe readMeActive ->
            case readMeActiveUp readMeActive of
                Just movedReadMeActive ->
                    ActiveReadMe movedReadMeActive

                Nothing ->
                    ActiveReadMe ActiveReadMeSelf

        ActiveTypeDefList typeDefListActive ->
            case typeDefListActiveUp typeDefListActive of
                Just movedTypeDefListActive ->
                    ActiveTypeDefList movedTypeDefListActive

                Nothing ->
                    ActiveReadMe ActiveReadMeSelf

        ActivePartDefList partDefListActive ->
            case partDefListActiveUp partDefListActive of
                Just movedPartDefListActive ->
                    ActivePartDefList movedPartDefListActive

                Nothing ->
                    ActiveTypeDefList ActiveTypeDefListSelf


readMeActiveUp : ReadMeActive -> Maybe ReadMeActive
readMeActiveUp readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            Nothing

        ActiveReadMeText ->
            Just ActiveReadMeSelf


typeDefListActiveUp : TypeDefListActive -> Maybe TypeDefListActive
typeDefListActiveUp typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            Nothing

        ActiveTypeDef ( typeId, typeDefActive ) ->
            case typeDefActiveUp typeDefActive of
                Just movedTypeDefActive ->
                    Just (ActiveTypeDef ( typeId, movedTypeDefActive ))

                Nothing ->
                    if True then
                        Just ActiveTypeDefListSelf
                        -- 型定義全体を選択

                    else
                        -- ひとつ上を選択
                        Just (ActiveTypeDef ( typeId, ActiveTypeDefSelf ))


typeDefActiveUp : TypeDefActive -> Maybe TypeDefActive
typeDefActiveUp typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            Nothing

        ActiveTypeDefName _ ->
            Just ActiveTypeDefSelf

        ActiveTypeDefTagList ( typeId, tagList ) ->
            case typeDefTagListUp tagList of
                Just movedTagList ->
                    Just
                        (ActiveTypeDefTagList ( typeId, movedTagList ))

                Nothing ->
                    if False then
                        Nothing

                    else
                        -- ひとつ上を選択
                        Just (ActiveTypeDefTagList ( typeId, ActiveTypeDefTagName LabelEditSelect ))


typeDefTagListUp : TypeDefTagActive -> Maybe TypeDefTagActive
typeDefTagListUp typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName _ ->
            Nothing

        ActiveTypeDefTagParameter ->
            Nothing


partDefListActiveUp : PartDefListActive -> Maybe PartDefListActive
partDefListActiveUp partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            Nothing

        ActivePartDef ( Data.Id.PartId "first", ActivePartDefSelf ) ->
            Just ActivePartDefListSelf

        ActivePartDef ( partId, ActivePartDefSelf ) ->
            -- ひとつ上を選択
            Just (ActivePartDef ( partId, ActivePartDefSelf ))

        ActivePartDef ( index, ActivePartDefName _ ) ->
            Just (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDef ( index, ActivePartDefType _ ) ->
            Just (ActivePartDef ( index, ActivePartDefSelf ))

        ActivePartDef ( index, ActivePartDefExpr TermOpSelf ) ->
            Just (ActivePartDef ( index, ActivePartDefType TypeEditSelect ))

        ActivePartDef ( index, ActivePartDefExpr TermOpHead ) ->
            Just (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDef ( index, ActivePartDefExpr (TermOpTerm _ _) ) ->
            Just (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))

        ActivePartDef ( index, ActivePartDefExpr (TermOpOp _) ) ->
            Just (ActivePartDef ( index, ActivePartDefExpr TermOpSelf ))



{- =========================================================
           ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
   =========================================================
-}


{-| 下のものを選択する
-}
activeDown : Data.Project.Module.Module -> Active -> Active
activeDown targetModule active =
    case active of
        ActiveNone ->
            -- 何も選択していないところから概要へ
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe readMeActive ->
            case readMeActiveDown readMeActive of
                Just movedReadMe ->
                    ActiveReadMe movedReadMe

                Nothing ->
                    ActiveTypeDefList ActiveTypeDefListSelf

        ActiveTypeDefList typeDefListActive ->
            case typeDefListActiveDown typeDefListActive of
                Just movedTypeDefListActive ->
                    ActiveTypeDefList movedTypeDefListActive

                Nothing ->
                    ActivePartDefList ActivePartDefListSelf

        ActivePartDefList partDefListActive ->
            case partDefListActiveDown targetModule partDefListActive of
                Just movedPartDefListActive ->
                    ActivePartDefList movedPartDefListActive

                Nothing ->
                    ActivePartDefList ActivePartDefListSelf


readMeActiveDown : ReadMeActive -> Maybe ReadMeActive
readMeActiveDown readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            Nothing

        ActiveReadMeText ->
            Just ActiveReadMeSelf


typeDefListActiveDown : TypeDefListActive -> Maybe TypeDefListActive
typeDefListActiveDown typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            Nothing

        ActiveTypeDef ( typeId, typeDefActive ) ->
            case typeDefActiveDown typeDefActive of
                Just movedTypeDefActive ->
                    Just (ActiveTypeDef ( typeId, movedTypeDefActive ))

                Nothing ->
                    -- ひとつ下を選択する
                    Just (ActiveTypeDef ( typeId, ActiveTypeDefSelf ))


typeDefActiveDown : TypeDefActive -> Maybe TypeDefActive
typeDefActiveDown typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            Nothing

        ActiveTypeDefName _ ->
            Just (ActiveTypeDefTagList ( Data.Id.TypeId "firstTypeId", ActiveTypeDefTagName LabelEditSelect ))

        ActiveTypeDefTagList ( typeId, typeDefTagActive ) ->
            case typeDefTagActiveDown typeDefTagActive of
                Just movedTypeDefTagActive ->
                    Just (ActiveTypeDefTagList ( typeId, movedTypeDefTagActive ))

                Nothing ->
                    -- 次の型定義へ
                    Just (ActiveTypeDefTagList ( typeId, ActiveTypeDefTagName LabelEditSelect ))


typeDefTagActiveDown : TypeDefTagActive -> Maybe TypeDefTagActive
typeDefTagActiveDown typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName _ ->
            Nothing

        ActiveTypeDefTagParameter ->
            Nothing


partDefListActiveDown : Data.Project.Module.Module -> PartDefListActive -> Maybe PartDefListActive
partDefListActiveDown targetModule partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            Nothing

        ActivePartDef ( partId, partDefActive ) ->
            -- ターゲットのモジュールから型定義を取得して
            case partDefActiveDown Data.Project.PartDef.empty partDefActive of
                Just movedPartDefActive ->
                    Just (ActivePartDef ( partId, movedPartDefActive ))

                Nothing ->
                    if False then
                        Just
                            (ActivePartDef ( partId, ActivePartDefSelf ))

                    else
                        Nothing


partDefActiveDown : Data.Project.PartDef.PartDef -> PartDefActive -> Maybe PartDefActive
partDefActiveDown partDef partDefActive =
    case partDefActive of
        ActivePartDefSelf ->
            Nothing

        ActivePartDefName _ ->
            Just (ActivePartDefExpr TermOpSelf)

        ActivePartDefType _ ->
            Just (ActivePartDefExpr TermOpSelf)

        ActivePartDefExpr termOpPos ->
            case termOpPosDown (partDef |> Data.Project.PartDef.getExpr) termOpPos of
                Just movedTermOpPos ->
                    Just (ActivePartDefExpr movedTermOpPos)

                Nothing ->
                    Nothing


termOpPosDown : Expr.Expr -> TermOpPos -> Maybe TermOpPos
termOpPosDown expr termOpPos =
    case termOpPos of
        TermOpSelf ->
            Nothing

        TermOpHead ->
            Just TermOpSelf

        -- TODO term type 式の途中で改行することを考えたら、この処理は画面幅を式の長さに依存する
        TermOpTerm int termType ->
            Just (TermOpTerm int termType)

        TermOpOp _ ->
            Just TermOpSelf



{- =========================================================
                          子の先頭へ
   =========================================================
-}


{-| 選択を最初の子供に移動する。デフォルトでSpaceとCtrl+→の動作
-}
activeToFirstChild : Data.Project.Module.Module -> Active -> Active
activeToFirstChild targetModule active =
    case active of
        ActiveNone ->
            ActiveReadMe ActiveReadMeSelf

        ActiveReadMe readMeActive ->
            ActiveReadMe (readMeActiveToFirstChild readMeActive)

        ActiveTypeDefList typeDefListActive ->
            ActiveTypeDefList (typeDefListActiveToFirstChild typeDefListActive)

        ActivePartDefList partDefListActive ->
            ActivePartDefList (partDefListActiveToFirstChild targetModule partDefListActive)


readMeActiveToFirstChild : ReadMeActive -> ReadMeActive
readMeActiveToFirstChild readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            ActiveReadMeText

        ActiveReadMeText ->
            ActiveReadMeText


typeDefListActiveToFirstChild : TypeDefListActive -> TypeDefListActive
typeDefListActiveToFirstChild typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            ActiveTypeDef ( Data.Id.TypeId "firstTypeId", ActiveTypeDefSelf )

        ActiveTypeDef ( typeDefIndex, typeDefActive ) ->
            ActiveTypeDef ( typeDefIndex, typeDefActiveToFirstChild typeDefActive )


typeDefActiveToFirstChild : TypeDefActive -> TypeDefActive
typeDefActiveToFirstChild typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            ActiveTypeDefName LabelEditSelect

        ActiveTypeDefName labelEdit ->
            ActiveTypeDefName labelEdit

        ActiveTypeDefTagList ( index, typeDefTagActive ) ->
            ActiveTypeDefTagList ( index, typeDefTagListActiveToFirstChild typeDefTagActive )


typeDefTagListActiveToFirstChild : TypeDefTagActive -> TypeDefTagActive
typeDefTagListActiveToFirstChild typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName labelEdit ->
            ActiveTypeDefTagName labelEdit

        ActiveTypeDefTagParameter ->
            ActiveTypeDefTagParameter


partDefListActiveToFirstChild : Data.Project.Module.Module -> PartDefListActive -> PartDefListActive
partDefListActiveToFirstChild targetModule partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            ActivePartDef ( Data.Id.PartId "firstTypeId", ActivePartDefSelf )

        ActivePartDef ( partDefIndex, partDefActive ) ->
            ActivePartDef
                ( partDefIndex
                , partDefActiveToFirstChild
                    -- partDefIndexからpartDefを取得して
                    Data.Project.PartDef.empty
                    partDefActive
                )


partDefActiveToFirstChild : Data.Project.PartDef.PartDef -> PartDefActive -> PartDefActive
partDefActiveToFirstChild partDef partDefActive =
    case partDefActive of
        ActivePartDefSelf ->
            ActivePartDefName NameEditSelect

        ActivePartDefName nameEdit ->
            ActivePartDefName nameEdit

        ActivePartDefType typeEdit ->
            ActivePartDefType typeEdit

        ActivePartDefExpr termOpPos ->
            ActivePartDefExpr (termOpPosToFirstChild (Data.Project.PartDef.getExpr partDef) termOpPos)


termOpPosToFirstChild : Expr.Expr -> TermOpPos -> TermOpPos
termOpPosToFirstChild expr termOpPos =
    case termOpPos of
        TermOpSelf ->
            TermOpTerm 0 (TypeNoChildren ExprEditSelect)

        TermOpHead ->
            TermOpHead

        TermOpTerm termIndex termType ->
            TermOpTerm termIndex
                (termTypeFirstChild
                    (expr
                        |> Expr.getTermFromIndex termIndex
                    )
                    termType
                )

        TermOpOp opIndex ->
            TermOpOp opIndex


termTypeFirstChild : Maybe Expr.Term -> TermType -> TermType
termTypeFirstChild termMaybe termType =
    case ( termMaybe, termType ) of
        ( Just (Expr.Parentheses expr), TypeParentheses termOpPos ) ->
            TypeParentheses (termOpPosToFirstChild expr termOpPos)

        ( Just (Expr.Parentheses expr), _ ) ->
            TypeParentheses (termOpPosToFirstChild expr TermOpSelf)

        ( _, _ ) ->
            termType



{- =========================================================
                          子の末尾へ
   =========================================================
-}


{-| 選択を最後の子供に移動する。デフォルトでCtrl+←を押すとこの動作をする
-}
activeToLastChild : Data.Project.Module.Module -> Active -> Active
activeToLastChild targetModule active =
    case active of
        ActiveNone ->
            ActivePartDefList ActivePartDefListSelf

        ActiveReadMe readMeActive ->
            ActiveReadMe (readMeActiveToLastChild readMeActive)

        ActiveTypeDefList typeDefListActive ->
            ActiveTypeDefList (typeDefListActiveToLastChild targetModule typeDefListActive)

        ActivePartDefList partDefListActive ->
            ActivePartDefList (partDefListActiveToLastChild targetModule partDefListActive)


readMeActiveToLastChild : ReadMeActive -> ReadMeActive
readMeActiveToLastChild readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            ActiveReadMeText

        ActiveReadMeText ->
            ActiveReadMeText


typeDefListActiveToLastChild : Data.Project.Module.Module -> TypeDefListActive -> TypeDefListActive
typeDefListActiveToLastChild targetModule typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            ActiveTypeDef
                ( Data.Id.TypeId "lastTypeId"
                , ActiveTypeDefSelf
                )

        ActiveTypeDef ( typeDefIndex, typeDefActive ) ->
            ActiveTypeDef
                ( typeDefIndex
                  -- typeDefIdから型の情報を得る
                , typeDefActiveToLastChild Nothing typeDefActive
                )


typeDefActiveToLastChild : Maybe Data.Project.TypeDef.TypeDef -> TypeDefActive -> TypeDefActive
typeDefActiveToLastChild typeDefMaybe typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            ActiveTypeDefTagList
                ( Data.Id.TypeId "last"
                , ActiveTypeDefTagName LabelEditSelect
                )

        ActiveTypeDefName labelEdit ->
            ActiveTypeDefName labelEdit

        ActiveTypeDefTagList ( typeDefTagIndex, typeDefTagActive ) ->
            ActiveTypeDefTagList ( typeDefTagIndex, typeDefTagActive )


partDefListActiveToLastChild : Data.Project.Module.Module -> PartDefListActive -> PartDefListActive
partDefListActiveToLastChild targetModule partDefListActive =
    case partDefListActive of
        ActivePartDefListSelf ->
            ActivePartDef ( Data.Id.PartId "lastPartId", ActivePartDefSelf )

        ActivePartDef ( partDefIndex, partDefActive ) ->
            ActivePartDef
                ( partDefIndex
                , partDefActiveToLastChild
                    -- partDefIndexからパートの情報を得る
                    Data.Project.PartDef.empty
                    partDefActive
                )


partDefActiveToLastChild : Data.Project.PartDef.PartDef -> PartDefActive -> PartDefActive
partDefActiveToLastChild partDef partDefActive =
    case partDefActive of
        ActivePartDefSelf ->
            ActivePartDefExpr TermOpSelf

        ActivePartDefName nameEdit ->
            ActivePartDefName nameEdit

        ActivePartDefType typeEdit ->
            ActivePartDefType typeEdit

        ActivePartDefExpr termOpPos ->
            ActivePartDefExpr (termOpPosToLastChild (Data.Project.PartDef.getExpr partDef) termOpPos)


termOpPosToLastChild : Expr.Expr -> TermOpPos -> TermOpPos
termOpPosToLastChild exprMaybe termOpPos =
    let
        lastTermIndex =
            exprMaybe
                |> Expr.getOthers
                |> List.length
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
                        |> Expr.getTermFromIndex termIndex
            in
            TermOpTerm termIndex (termTypeLastChild termMaybe termType)

        TermOpOp opIndex ->
            TermOpOp opIndex


termTypeLastChild : Maybe Expr.Term -> TermType -> TermType
termTypeLastChild termMaybe termType =
    case ( termMaybe, termType ) of
        ( Just (Expr.Parentheses expr), TypeParentheses termOpPos ) ->
            TypeParentheses (termOpPosToLastChild expr termOpPos)

        ( Just (Expr.Parentheses expr), TypeNoChildren _ ) ->
            TypeParentheses (termOpPosToLastChild expr TermOpSelf)

        ( _, _ ) ->
            termType



{- =========================================================
                            親へ
   =========================================================
-}


{-| 選択を親に変更する。デフォルトでEnterキーを押すとこの動作をする
-}
activeToParent : Data.Project.Module.Module -> Active -> Active
activeToParent targetModule active =
    case active of
        ActiveNone ->
            ActiveNone

        ActiveReadMe readMeActive ->
            case readMeActiveToParent readMeActive of
                Just movedReadMeActive ->
                    ActiveReadMe movedReadMeActive

                Nothing ->
                    ActiveReadMe ActiveReadMeSelf

        ActiveTypeDefList typeDefListActive ->
            case typeDefListActiveToParent typeDefListActive of
                Just movedTypeDefListActive ->
                    ActiveTypeDefList movedTypeDefListActive

                Nothing ->
                    ActiveTypeDefList ActiveTypeDefListSelf

        ActivePartDefList partDefListActive ->
            case partDefListActiveToParent partDefListActive of
                Just movedPartDefListActive ->
                    ActivePartDefList movedPartDefListActive

                Nothing ->
                    ActivePartDefList ActivePartDefListSelf


readMeActiveToParent : ReadMeActive -> Maybe ReadMeActive
readMeActiveToParent readMeActive =
    case readMeActive of
        ActiveReadMeSelf ->
            Nothing

        ActiveReadMeText ->
            Just ActiveReadMeSelf


typeDefListActiveToParent : TypeDefListActive -> Maybe TypeDefListActive
typeDefListActiveToParent typeDefListActive =
    case typeDefListActive of
        ActiveTypeDefListSelf ->
            Nothing

        ActiveTypeDef ( typeDefIndex, typeDefActive ) ->
            case typeDefActiveToParent typeDefActive of
                Just movedTypeDefActive ->
                    Just (ActiveTypeDef ( typeDefIndex, movedTypeDefActive ))

                Nothing ->
                    Just ActiveTypeDefListSelf


typeDefActiveToParent : TypeDefActive -> Maybe TypeDefActive
typeDefActiveToParent typeDefActive =
    case typeDefActive of
        ActiveTypeDefSelf ->
            Nothing

        ActiveTypeDefName _ ->
            Just ActiveTypeDefSelf

        ActiveTypeDefTagList ( typeDefTagIndex, typeDefTagActive ) ->
            case typeDefTagToParent typeDefTagActive of
                Just movedTagActive ->
                    Just (ActiveTypeDefTagList ( typeDefTagIndex, movedTagActive ))

                Nothing ->
                    Just ActiveTypeDefSelf


typeDefTagToParent : TypeDefTagActive -> Maybe TypeDefTagActive
typeDefTagToParent typeDefTagActive =
    case typeDefTagActive of
        ActiveTypeDefTagName labelEdit ->
            Nothing

        ActiveTypeDefTagParameter ->
            Nothing


partDefListActiveToParent : PartDefListActive -> Maybe PartDefListActive
partDefListActiveToParent typeDefListActive =
    case typeDefListActive of
        ActivePartDefListSelf ->
            Nothing

        ActivePartDef ( partDefIndex, partDefActive ) ->
            case partDefActiveToParent partDefActive of
                Just moved ->
                    Just (ActivePartDef ( partDefIndex, moved ))

                Nothing ->
                    Just ActivePartDefListSelf


partDefActiveToParent : PartDefActive -> Maybe PartDefActive
partDefActiveToParent partDefActive =
    case partDefActive of
        ActivePartDefSelf ->
            Nothing

        ActivePartDefName _ ->
            Just ActivePartDefSelf

        ActivePartDefType _ ->
            Just ActivePartDefSelf

        ActivePartDefExpr termOpPos ->
            case termOpPosToParent termOpPos of
                Just moved ->
                    Just (ActivePartDefExpr moved)

                Nothing ->
                    Just ActivePartDefSelf


termOpPosToParent : TermOpPos -> Maybe TermOpPos
termOpPosToParent termOpPos =
    case termOpPos of
        TermOpSelf ->
            Nothing

        TermOpHead ->
            Just TermOpSelf

        TermOpTerm termIndex termType ->
            case termTypeToParent termType of
                Just movedTermType ->
                    Just (TermOpTerm termIndex movedTermType)

                Nothing ->
                    Just TermOpSelf

        TermOpOp _ ->
            Just TermOpSelf


termTypeToParent : TermType -> Maybe TermType
termTypeToParent termType =
    case termType of
        TypeNoChildren _ ->
            Nothing

        TypeParentheses termOpPos ->
            termOpPosToParent termOpPos
                |> Maybe.map TypeParentheses

        TypeLambda lambdaPos ->
            lambdaPosToParent lambdaPos
                |> Maybe.map TypeLambda


lambdaPosToParent : LambdaPos -> Maybe LambdaPos
lambdaPosToParent lambdaPos =
    case lambdaPos of
        LambdaSelf ->
            Nothing

        BranchHead ->
            Just LambdaSelf

        Branch index branchPos ->
            branchPosToParent branchPos
                |> Maybe.map (Branch index)


branchPosToParent : BranchPos -> Maybe BranchPos
branchPosToParent branchPos =
    case branchPos of
        BranchSelf ->
            Nothing

        Pattern ->
            Just BranchSelf

        Guard ->
            Just BranchSelf

        Expr termOpPos ->
            case termOpPosToParent termOpPos of
                Just movedTermOpPos ->
                    Just (Expr movedTermOpPos)

                Nothing ->
                    Just BranchSelf



{- =========================================================
                    候補の選択を次に進める
   =========================================================
-}


{-| 候補の選択を次に進める
-}
suggestionNext : Data.Project.Module.Module -> Data.Project.Project -> Model -> ( Model, List Cmd )
suggestionNext targetModule project model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
            if List.length suggestionNameList - 1 < index + 1 then
                nameEditSuggestionToEditText partDefIndex searchName project model

            else
                let
                    ( newModel, cmdList ) =
                        model
                            |> setActive
                                project
                                (ActivePartDefList
                                    (ActivePartDef
                                        ( partDefIndex
                                        , ActivePartDefName
                                            (NameEditSuggestionSelect
                                                { index = min (List.length suggestionNameList - 1) (index + 1)
                                                , searchName = searchName
                                                }
                                            )
                                        )
                                    )
                                )
                in
                ( newModel
                , suggestionSelectChangedThenNameChangeCmd
                    (min (List.length suggestionNameList - 1) (index + 1))
                    partDefIndex
                    (getTargetModuleIndex newModel)
                    ++ cmdList
                )

        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName NameEditText )) ->
            let
                searchName =
                    Nothing

                ( newModel, cmdList ) =
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
            , suggestionSelectChangedThenNameChangeCmd
                0
                partDefIndex
                (getTargetModuleIndex newModel)
                ++ cmdList
            )

        _ ->
            ( model
            , []
            )



{- =========================================================
                    候補の選択を前に戻す
   =========================================================
-}


{-| 候補の選択を前に戻す
-}
suggestionPrev : Data.Project.Module.Module -> Data.Project.Project -> Model -> ( Model, List Cmd )
suggestionPrev targetModule project model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName NameEditText )) ->
            let
                searchName =
                    Nothing

                ( newModel, cmdList ) =
                    model
                        |> setActive
                            project
                            (ActivePartDefList
                                (ActivePartDef
                                    ( partDefIndex
                                    , ActivePartDefName
                                        (NameEditSuggestionSelect
                                            { index = List.length suggestionNameList - 1
                                            , searchName = searchName
                                            }
                                        )
                                    )
                                )
                            )
            in
            ( newModel
            , suggestionSelectChangedThenNameChangeCmd
                (List.length suggestionNameList - 1)
                partDefIndex
                (getTargetModuleIndex newModel)
                ++ cmdList
            )

        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
            if index - 1 < 0 then
                nameEditSuggestionToEditText partDefIndex searchName project model

            else
                let
                    ( newModel, cmdList ) =
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
                , suggestionSelectChangedThenNameChangeCmd
                    (index - 1)
                    partDefIndex
                    (getTargetModuleIndex newModel)
                    ++ cmdList
                )

        _ ->
            ( model
            , []
            )


{-| 名前の候補選択モードからテキスト編集モードへ
-}
nameEditSuggestionToEditText : Data.Id.PartId -> Maybe L.Label -> Data.Project.Project -> Model -> ( Model, List Cmd )
nameEditSuggestionToEditText partDefIndex searchName project model =
    let
        ( newModel, cmdList ) =
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
    , []
        ++ cmdList
        ++ [ CmdSetTextAreaValue
                (searchName |> Maybe.map L.toSmallString |> Maybe.withDefault "")
           ]
    )


suggestionSelectChangedThenNameChangeCmd : Int -> Data.Id.PartId -> Data.Id.ModuleId -> List Cmd
suggestionSelectChangedThenNameChangeCmd suggestIndex partDefId moduleId =
    case suggestionNameList |> Utility.ListExtra.getAt suggestIndex of
        Just ( suggestName, _ ) ->
            []

        Nothing ->
            []


suggestionNameList : List ( L.Label, String )
suggestionNameList =
    [ ( L.from L.hg [ L.oa, L.om, L.oe ], "ゲーム" )
    , ( L.from L.hh [ L.oe, L.or, L.oo ], "主人公" )
    , ( L.from L.hb [ L.oe, L.oa, L.ou, L.ot, L.oi, L.of_, L.ou, L.ol, L.oG, L.oi, L.or, L.ol ], "美少女" )
    , ( L.from L.hm [ L.oo, L.on, L.os, L.ot, L.oe, L.or ], "モンスター" )
    , ( L.from L.hw [ L.oo, L.or, L.ol, L.od ], "世界" )
    ]



{- =========================================================
                       複数行入力の確定
   =========================================================
-}


{-| 複数行入力の確定。概要や文字列リテラルでの入力を確定にする。デフォルトでCtrl+Enter
-}
confirmMultiLineTextField : Active -> Active
confirmMultiLineTextField active =
    case active of
        ActiveReadMe ActiveReadMeText ->
            ActiveReadMe ActiveReadMeSelf

        _ ->
            active



{- =========================================================
                       単一行入力の確定
   =========================================================
-}


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



{- =========================================================
                         テキスト入力
   =========================================================
-}


{-| テキストで文字を入力されたら
-}
input : String -> Data.Project.Project -> Data.Project.Module.Module -> Model -> ( Model, List Cmd )
input string project targetModule model =
    case getActive model of
        ActiveNone ->
            ( model
            , []
            )

        ActiveReadMe activeReadMe ->
            model |> inputInReadMe string activeReadMe

        ActiveTypeDefList _ ->
            ( model
            , []
            )

        ActivePartDefList activePartDefList ->
            model |> inputInPartDefList string project targetModule activePartDefList


{-| ReadMeがアクティブな時の入力
-}
inputInReadMe : String -> ReadMeActive -> Model -> ( Model, List Cmd )
inputInReadMe string readMeActive model =
    case readMeActive of
        ActiveReadMeText ->
            ( model
            , []
            )

        ActiveReadMeSelf ->
            ( model
            , []
            )


{-| PartDefListがアクティブな時の入力
-}
inputInPartDefList : String -> Data.Project.Project -> Data.Project.Module.Module -> PartDefListActive -> Model -> ( Model, List Cmd )
inputInPartDefList string project targetModule partDefListActive model =
    let
        ( active, cmdList ) =
            case partDefListActive of
                ActivePartDefListSelf ->
                    ( getActive model
                    , []
                    )

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
                        Expr.empty

                ActivePartDef ( index, ActivePartDefExpr (TermOpOp opIndex) ) ->
                    parserBeginWithOp string
                        index
                        (getTargetModuleIndex model)
                        opIndex
                        Expr.empty

                ActivePartDef ( _, ActivePartDefSelf ) ->
                    ( getActive model
                    , []
                    )

        ( newModel, activeCmdList ) =
            model
                |> setActive project active
    in
    ( newModel
    , cmdList ++ activeCmdList
    )


parserBeginWithName : String -> Data.Id.PartId -> Data.Id.ModuleId -> ( Active, List Cmd )
parserBeginWithName string partDefIndex moduleRef =
    case Parser.beginWithName (Parser.SimpleChar.fromString string) of
        Parser.BeginWithNameEndName { name, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefName NameEditText ))
            , [ cmdSetName moduleRef partDefIndex name ]
            )

        Parser.BeginWithNameEndType { name, type_, textAreaValue } ->
            if Data.Project.PartDef.isEmptyType type_ then
                ( ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefType TypeEditSelect ))
                , [ cmdSetName moduleRef partDefIndex name
                  , CmdSetTextAreaValue ""
                  ]
                )

            else
                ( ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefType TypeEditSelect ))
                , [ cmdSetName moduleRef partDefIndex name
                  , cmdSetType moduleRef partDefIndex type_
                  , textAreaValueToSetTextCmd textAreaValue
                  ]
                )

        Parser.BeginWithNameEndExprTerm { name, type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (if headTerm == Expr.None && opAndTermList == [] then
                            TermOpSelf

                         else
                            TermOpTerm (List.length opAndTermList) (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ cmdSetName moduleRef partDefIndex name
              , CmdSetTextAreaValue (textAreaValue |> List.map Tuple.first |> String.fromList)
              ]
                ++ (if Data.Project.PartDef.isEmptyType type_ then
                        []

                    else
                        [ cmdSetType moduleRef partDefIndex type_ ]
                   )
                ++ [ cmdSetExpr moduleRef partDefIndex (Expr.make headTerm opAndTermList)
                   ]
            )

        Parser.BeginWithNameEndExprOp { name, type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr (TermOpOp (List.length opAndTermList))
                    )
                )
            , [ cmdSetName moduleRef partDefIndex name
              , cmdSetType moduleRef partDefIndex type_
              , cmdSetExpr moduleRef
                    partDefIndex
                    (Expr.make headTerm (opAndTermList ++ [ ( lastOp, Expr.None ) ]))
              , textAreaValueToSetTextCmd textAreaValue
              ]
            )


parserBeginWithType : String -> Data.Id.PartId -> Data.Id.ModuleId -> ( Active, List Cmd )
parserBeginWithType string partDefIndex moduleRef =
    case Parser.beginWithType (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTypeEndType { type_, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefType TypeEditSelect ))
            , [ cmdSetType moduleRef partDefIndex type_ ]
            )

        Parser.BeginWithTypeEndExprTerm { type_, headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (case List.length opAndTermList of
                            0 ->
                                TermOpSelf

                            length ->
                                TermOpTerm length (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ cmdSetType moduleRef partDefIndex type_
              , cmdSetExpr moduleRef
                    partDefIndex
                    (Expr.make headTerm opAndTermList)
              , textAreaValueToSetTextCmd textAreaValue
              ]
            )

        Parser.BeginWithTypeEndExprOp { type_, headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefExpr TermOpSelf ))
            , [ cmdSetType moduleRef partDefIndex type_
              , cmdSetExpr moduleRef
                    partDefIndex
                    (Expr.make headTerm (opAndTermList ++ [ ( lastOp, Expr.None ) ]))
              , textAreaValueToSetTextCmd textAreaValue
              ]
            )


parserInExpr : String -> Data.Id.PartId -> Data.Id.ModuleId -> ( Active, List Cmd )
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
            , [ cmdSetExpr moduleRef
                    index
                    (Expr.make headTerm opAndTermList)
              ]
                ++ (if opAndTermList == [] then
                        []

                    else
                        [ textAreaValueToSetTextCmd textAreaValue ]
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
            , [ cmdSetExpr moduleRef
                    index
                    (Expr.make headTerm opAndTermList)
              , textAreaValueToSetTextCmd textAreaValue
              ]
            )


parserBeginWithTerm : String -> Data.Id.PartId -> Data.Id.ModuleId -> Int -> Expr.Expr -> ( Active, List Cmd )
parserBeginWithTerm string partDefIndex moduleRef termIndex expr =
    case Parser.beginWithExprTerm 0 (Parser.SimpleChar.fromString string) of
        Parser.BeginWithTermEndTerm { headTerm, opAndTermList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (TermOpTerm
                            (termIndex + List.length opAndTermList)
                            (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , []
                ++ (if opAndTermList == [] then
                        []

                    else
                        [ textAreaValueToSetTextCmd textAreaValue ]
                   )
            )

        Parser.BeginWithTermEndOp { headTerm, opAndTermList, lastOp, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (TermOpOp
                            (termIndex + List.length opAndTermList)
                        )
                    )
                )
            , [ textAreaValueToSetTextCmd textAreaValue ]
            )


parserBeginWithOp : String -> Data.Id.PartId -> Data.Id.ModuleId -> Int -> Expr.Expr -> ( Active, List Cmd )
parserBeginWithOp string partDefIndex moduleRef opIndex expr =
    case Parser.beginWithExprOp 0 (Parser.SimpleChar.fromString string) of
        Parser.BeginWithOpEndTerm { headOp, termAndOpList, lastTerm, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (TermOpTerm
                            (opIndex + 1 + List.length termAndOpList)
                            (TypeNoChildren ExprEditSelect)
                        )
                    )
                )
            , [ textAreaValueToSetTextCmd textAreaValue ]
            )

        Parser.BeginWithOpEndOp { headOp, termAndOpList, textAreaValue } ->
            ( ActivePartDefList
                (ActivePartDef
                    ( partDefIndex
                    , ActivePartDefExpr
                        (TermOpOp
                            (opIndex + List.length termAndOpList)
                        )
                    )
                )
            , []
                ++ (if termAndOpList == [] then
                        []

                    else
                        [ textAreaValueToSetTextCmd textAreaValue ]
                   )
            )


textAreaValueToSetTextCmd : List ( Char, Bool ) -> Cmd
textAreaValueToSetTextCmd =
    List.map Tuple.first >> String.fromList >> CmdSetTextAreaValue


{-| 名前を変更させるためのCmd
-}
cmdSetName : Data.Id.ModuleId -> Data.Id.PartId -> Maybe L.Label -> Cmd
cmdSetName moduleIndex partDefIndex name =
    None


{-| 型を変更させるためのCmd
-}
cmdSetType : Data.Id.ModuleId -> Data.Id.PartId -> Data.Project.PartDef.Type -> Cmd
cmdSetType moduleIndex partDefIndex type_ =
    None


{-| 式を変更させるためのCmd
-}
cmdSetExpr : Data.Id.ModuleId -> Data.Id.PartId -> Expr.Expr -> Cmd
cmdSetExpr moduleIndex partDefIndex expr =
    None



{- =========================================================
                        値を増やす
   =========================================================
-}


increaseValue : Data.Project.Module.Module -> Model -> ( Model, List Cmd )
increaseValue targetModule model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefExpr termOpPos )) ->
            ( model
            , []
            )

        _ ->
            ( model
            , []
            )


termOpPosIncreaseValue : TermOpPos -> Expr.Expr -> Expr.Expr
termOpPosIncreaseValue termOpPos expr =
    case termOpPos of
        TermOpSelf ->
            expr

        TermOpHead ->
            expr

        TermOpTerm index termType ->
            expr
                |> Expr.mapTermAt index (termTypeIncreaseValue termType)

        TermOpOp int ->
            expr


termTypeIncreaseValue : TermType -> Expr.Term -> Expr.Term
termTypeIncreaseValue termType term =
    case term of
        Expr.Int32Literal int ->
            Expr.Int32Literal (int + 1)

        Expr.Part _ ->
            term

        Expr.Parentheses expr ->
            case termType of
                TypeNoChildren _ ->
                    term

                TypeParentheses termOpPos ->
                    Expr.Parentheses
                        (termOpPosIncreaseValue termOpPos expr)

                TypeLambda _ ->
                    term

        Expr.None ->
            term



{- =========================================================
                        値を減らす
   =========================================================
-}


decreaseValue : Data.Project.Module.Module -> Model -> ( Model, List Cmd )
decreaseValue targetModule model =
    case getActive model of
        ActivePartDefList (ActivePartDef ( partDefIndex, ActivePartDefExpr termOpPos )) ->
            ( model
            , []
            )

        _ ->
            ( model
            , []
            )


termOpPosDecreaseValue : TermOpPos -> Expr.Expr -> Expr.Expr
termOpPosDecreaseValue termOpPos expr =
    case termOpPos of
        TermOpSelf ->
            expr

        TermOpHead ->
            expr

        TermOpTerm index termType ->
            expr
                |> Expr.mapTermAt index (termTypeDecreaseValue termType)

        TermOpOp int ->
            expr


termTypeDecreaseValue : TermType -> Expr.Term -> Expr.Term
termTypeDecreaseValue termType term =
    case term of
        Expr.Int32Literal int ->
            Expr.Int32Literal (int - 1)

        Expr.Part _ ->
            term

        Expr.Parentheses expr ->
            case termType of
                TypeNoChildren _ ->
                    term

                TypeParentheses termOpPos ->
                    Expr.Parentheses
                        (termOpPosDecreaseValue termOpPos expr)

                TypeLambda _ ->
                    term

        Expr.None ->
            term



{- =========================================================
                   結果の表示を切り替える
   =========================================================
-}


changeResultVisible : Int -> Data.Id.PartId -> ResultVisible -> Model -> ( Model, List Cmd )
changeResultVisible partDefNum (Data.Id.PartId index) resultVisivle (Model rec) =
    ( Model
        { rec
            | resultVisible =
                rec.resultVisible
                    |> Utility.ArrayExtra.setLength partDefNum ResultVisibleValue
        }
    , []
    )



{- =========================================================
                         複合した動作
   =========================================================
-}


{-| 候補の選択を前にもどるか、候補が表示されていない状態なら上の要素を選択する
-}
suggestionPrevOrSelectUp : Data.Project.Module.Module -> Data.Project.Project -> Model -> ( Model, List Cmd )
suggestionPrevOrSelectUp targetModule project model =
    model
        |> (case getActive model of
                ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditText )) ->
                    suggestionPrev targetModule project

                ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect _) )) ->
                    suggestionPrev targetModule project

                _ ->
                    update MsgActiveUp project
           )


{-| 候補の選択を次に進めるか、候補が表示されていない状態なら下の要素を選択する
-}
suggestionNextOrSelectDown : Data.Project.Module.Module -> Data.Project.Project -> Model -> ( Model, List Cmd )
suggestionNextOrSelectDown targetModule project model =
    model
        |> (case getActive model of
                ActivePartDefList (ActivePartDef ( _, ActivePartDefName NameEditText )) ->
                    suggestionNext targetModule project

                ActivePartDefList (ActivePartDef ( _, ActivePartDefName (NameEditSuggestionSelect { index, searchName }) )) ->
                    suggestionNext targetModule project

                _ ->
                    update MsgActiveDown project
           )


{-| デフォルトではEnterキーを押した時の動作。テキスト編集中なら確定にして、それ以外なら親に移動する
-}
confirmSingleLineTextFieldOrSelectParent : Data.Project.Module.Module -> Active -> Active
confirmSingleLineTextFieldOrSelectParent targetModule active =
    if isNeedConfirmSingleLineTextField active then
        confirmSingleLineTextField active

    else
        activeToParent targetModule active


isNeedConfirmSingleLineTextField : Active -> Bool
isNeedConfirmSingleLineTextField active =
    case active of
        ActiveNone ->
            False

        ActiveReadMe _ ->
            False

        ActiveTypeDefList _ ->
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
view : Int -> Data.Project.Project -> Bool -> Model -> { title : String, body : List (Html.Html Msg) }
view width project isFocus (Model { moduleRef, active, resultVisible }) =
    let
        targetModule =
            Data.Project.Module.sampleModule
    in
    { title =
        Data.Project.Module.getName targetModule
            |> List.map L.toCapitalString
            |> String.join "/"
    , body =
        [ Html.div [] [ Html.text (activeToString active) ]
        , readMeView
            isFocus
            (case active of
                ActiveReadMe readMeActive ->
                    Just readMeActive

                _ ->
                    Nothing
            )
            (Data.Project.Module.getDescription targetModule)
        , importModuleView
        , operatorSettingView
        , typeDefinitionsView
            isFocus
            (case active of
                ActiveTypeDefList typeDefListActive ->
                    Just typeDefListActive

                _ ->
                    Nothing
            )
            []
        , partDefinitionsView
            width
            resultVisible
            isFocus
            (case active of
                ActivePartDefList partDefListActive ->
                    Just partDefListActive

                _ ->
                    Nothing
            )
            []
        ]
    }


activeToString : Active -> String
activeToString active =
    case active of
        ActivePartDefList (ActivePartDef ( Data.Id.PartId id, partDefActive )) ->
            id
                ++ "の定義"
                ++ (partDefActive |> partDefActiveToString)

        _ ->
            ""


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



{- ==================================================
                readMe 説明文 View
   ==================================================
-}


readMeView : Bool -> Maybe ReadMeActive -> String -> Html.Html Msg
readMeView isFocus readMeActiveMaybe readMe =
    let
        editHere =
            case readMeActiveMaybe of
                Just ActiveReadMeText ->
                    isFocus

                _ ->
                    False
    in
    Html.div
        ([ subClass "section" ]
            ++ (case readMeActiveMaybe of
                    Just ActiveReadMeSelf ->
                        [ subClass "section-active" ]

                    _ ->
                        [ Html.Events.onClick (MsgActiveTo (ActiveReadMe ActiveReadMeSelf)) ]
               )
            ++ (if isFocus then
                    [ Html.Attributes.id readMeId ]

                else
                    []
               )
        )
        [ readMeViewTitle
        , readMeViewInputArea readMe isFocus (readMeActiveMaybe == Just ActiveReadMeText)
        ]


readMeId : String
readMeId =
    "moduleEditor-readme"


readMeViewTitle : Html.Html Msg
readMeViewTitle =
    Html.h2
        [ subClass "section-title" ]
        [ Html.text "ReadMe" ]


readMeViewInputArea : String -> Bool -> Bool -> Html.Html Msg
readMeViewInputArea readMe isFocus isActive =
    Html.div
        [ subClassList
            [ ( "readMe-inputArea", True )
            , ( "readMe-inputArea-active", isActive )
            ]
        ]
        [ readMeViewMeasure readMe
        , readMeViewTextArea readMe isFocus isActive
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


readMeViewTextArea : String -> Bool -> Bool -> Html.Html Msg
readMeViewTextArea readMe isFocus isActive =
    Html.textarea
        ([ subClass "readMe-textarea" ]
            ++ (if isActive then
                    [ Html.Events.onInput MsgInput
                    , subClass "readMe-textarea-focus"
                    , Html.Attributes.property "value" (Json.Encode.string readMe)
                    , Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( MsgNone, True ))
                    ]
                        ++ (if isFocus then
                                [ Html.Attributes.id "edit" ]

                            else
                                []
                           )

                else
                    [ Html.Attributes.property "value" (Json.Encode.string readMe)
                    , readMeTextClickEvent
                    ]
               )
        )
        []


readMeTextClickEvent : Html.Attribute Msg
readMeTextClickEvent =
    Html.Events.stopPropagationOn "click"
        (Json.Decode.succeed
            ( MsgActiveTo (ActiveReadMe ActiveReadMeText), True )
        )



{- ==================================================
            Module Import 参照するモジュールの一覧
   ==================================================
-}


importModuleView : Html.Html msg
importModuleView =
    Html.div
        [ subClass "section" ]
        [ importModuleViewTitle
        , importModuleViewBody
        ]


importModuleViewTitle : Html.Html msg
importModuleViewTitle =
    Html.div
        [ subClass "section-title" ]
        [ Html.text "Module Import" ]


importModuleViewBody : Html.Html msg
importModuleViewBody =
    Html.div
        []
        []



{- ==================================================
         Operator Setting
   ==================================================
-}


operatorSettingView : Html.Html msg
operatorSettingView =
    Html.div
        [ subClass "section" ]
        [ Html.div [ subClass "section-title" ] [ Html.text "Operator Setting" ]
        ]



{- ==================================================
            Type Definitions 型の定義
   ==================================================
-}


typeDefinitionsView : Bool -> Maybe TypeDefListActive -> List Data.Project.TypeDef.TypeDef -> Html.Html Msg
typeDefinitionsView isFocus typeDefListActiveMaybe typeDefList =
    Html.div
        ([ subClass "section" ]
            ++ (case typeDefListActiveMaybe of
                    Just ActiveTypeDefListSelf ->
                        [ subClass "section-active" ]

                    _ ->
                        [ Html.Events.onClick
                            (MsgActiveTo (ActiveTypeDefList ActiveTypeDefListSelf))
                        ]
               )
            ++ (if isFocus then
                    [ Html.Attributes.id typeDefId ]

                else
                    []
               )
        )
        [ typeDefinitionsViewTitle
        , typeDefListView
            (case typeDefListActiveMaybe of
                Just (ActiveTypeDef typeDefIndexAndActive) ->
                    Just typeDefIndexAndActive

                _ ->
                    Nothing
            )
            []
        ]


typeDefId : String
typeDefId =
    "moduleEditor-typeDef"


typeDefinitionsViewTitle : Html.Html Msg
typeDefinitionsViewTitle =
    Html.div
        [ subClass "section-title" ]
        [ Html.text "Type Definitions" ]


typeDefListView : Maybe ( Data.Id.TypeId, TypeDefActive ) -> List Data.Id.TypeId -> Html.Html Msg
typeDefListView typeDefIndexAndActive typeDefList =
    Html.div
        [ subClass "defList" ]
        [ addTypeDefButton ]


typeDefView : Maybe TypeDefActive -> Data.Project.TypeDef.TypeDef -> Html.Html TypeDefActive
typeDefView typeDefActive typeDef =
    Html.div
        ([ subClass "typeDef"
         ]
            ++ (case typeDefActive of
                    Just ActiveTypeDefSelf ->
                        [ subClass "typeDef-active" ]

                    _ ->
                        [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ActiveTypeDefSelf, True )) ]
               )
        )
        [ Html.text (Data.Project.TypeDef.toString typeDef) ]


{-| 定義を末尾に1つ追加するボタン
-}
addTypeDefButton : Html.Html Msg
addTypeDefButton =
    Html.button
        [ Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( MsgAddTypeDef, True ))
        , subClass "defList-addButton"
        ]
        [ Html.text "+ 新しい型定義" ]



{- ==================================================
            Part Definitions パーツの定義
   ==================================================
-}


{-| パーツエディタの表示
-}
partDefinitionsView :
    Int
    -> Array.Array ResultVisible
    -> Bool
    -> Maybe PartDefListActive
    -> List ( Data.Project.PartDef.PartDef, Data.Project.CompileResult.CompileResult )
    -> Html.Html Msg
partDefinitionsView width resultVisibleList isFocus partDefListActiveMaybe partDefAndResultList =
    Html.div
        ([ subClass "section"
         ]
            ++ (case partDefListActiveMaybe of
                    Just ActivePartDefListSelf ->
                        [ subClass "section-active" ]

                    _ ->
                        [ Html.Events.onClick
                            (MsgActiveTo (ActivePartDefList ActivePartDefListSelf))
                        ]
               )
            ++ (if isFocus then
                    [ Html.Attributes.id partDefinitionId ]

                else
                    []
               )
        )
        [ partDefinitionsViewTitle
        , partDefListView
            width
            resultVisibleList
            isFocus
            []
            (case partDefListActiveMaybe of
                Just (ActivePartDef partDefActiveWithIndex) ->
                    Just partDefActiveWithIndex

                _ ->
                    Nothing
            )
        ]


partDefinitionId : String
partDefinitionId =
    "moduleEditor-partDef"


partDefinitionsViewTitle : Html.Html Msg
partDefinitionsViewTitle =
    Html.div
        [ subClass "section-title" ]
        [ Html.text "Part Definitions" ]


partDefListView :
    Int
    -> Array.Array ResultVisible
    -> Bool
    -> List ( Data.Id.PartId, Data.Project.CompileResult.CompileResult )
    -> Maybe ( Data.Id.PartId, PartDefActive )
    -> Html.Html Msg
partDefListView width resultVisibleList isFocus defAndResultList partDefActiveWithIndexMaybe =
    Html.div
        [ subClass "defList" ]
        ((defAndResultList
            |> List.map
                (\( partId, result ) ->
                    partDefView
                        (width - 16)
                        ResultVisibleValue
                        isFocus
                        partId
                        Data.Project.PartDef.empty
                        result
                        (case partDefActiveWithIndexMaybe of
                            Just ( i, partDefActive ) ->
                                if i == partId then
                                    Just partDefActive

                                else
                                    Nothing

                            _ ->
                                Nothing
                        )
                        |> Html.map
                            (\m ->
                                case m of
                                    PartDefActiveTo ref ->
                                        MsgActiveTo (ActivePartDefList (ActivePartDef ( partId, ref )))

                                    PartDefChangeResultVisible resultVisible ->
                                        MsgChangeResultVisible partId resultVisible

                                    PartDefInput string ->
                                        MsgInput string

                                    PartDefNone ->
                                        MsgNone
                            )
                )
         )
            ++ [ addPartDefButton ]
        )


partDefElementId : Data.Id.PartId -> String
partDefElementId (Data.Id.PartId id) =
    "moduleEditor-partDef-" ++ id


partDefView :
    Int
    -> ResultVisible
    -> Bool
    -> Data.Id.PartId
    -> Data.Project.PartDef.PartDef
    -> Data.Project.CompileResult.CompileResult
    -> Maybe PartDefActive
    -> Html.Html PartDefViewMsg
partDefView width resultVisible isFocus index partDef compileAndRunResult partDefActiveMaybe =
    Html.div
        ([ subClassList
            [ ( "partDef", width < 700 )
            , ( "partDef-wide", 700 <= width )
            , ( "partDef-active", partDefActiveMaybe == Just ActivePartDefSelf )
            ]
         , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed
                ( PartDefActiveTo ActivePartDefSelf
                , isFocus
                )
            )
         ]
            ++ (if isFocus then
                    [ Html.Attributes.id (partDefElementId index) ]

                else
                    []
               )
        )
        [ Html.div
            [ subClass "partDef-defArea" ]
            [ partDefViewNameAndType (Data.Project.PartDef.getName partDef) (Data.Project.PartDef.getType partDef) partDefActiveMaybe
            , partDefViewExprArea
                (width - 16 - 260)
                (Data.Project.PartDef.getExpr partDef)
                (case partDefActiveMaybe of
                    Just (ActivePartDefExpr partDefExprActive) ->
                        Just partDefExprActive

                    _ ->
                        Nothing
                )
            ]
        , partDefResultView resultVisible compileAndRunResult
            |> Html.map PartDefChangeResultVisible
        ]


type PartDefViewMsg
    = PartDefActiveTo PartDefActive
    | PartDefChangeResultVisible ResultVisible
    | PartDefInput String
    | PartDefNone



{- ================= Result ================= -}


partDefResultView : ResultVisible -> Data.Project.CompileResult.CompileResult -> Html.Html ResultVisible
partDefResultView resultVisible compileAndRunResult =
    Html.div
        [ subClass "partDef-resultArea" ]
        ([ Html.div
            [ Html.Attributes.class "editor-tab"
            , Html.Attributes.style "grid-template-columns" "1fr 1fr"
            ]
            [ Html.div
                (case resultVisible of
                    ResultVisibleValue ->
                        [ Html.Attributes.class "editor-tab-item-select" ]

                    ResultVisibleWasmSExpr ->
                        [ Html.Attributes.class "editor-tab-item"
                        , Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ResultVisibleValue, True ))
                        ]
                )
                [ Html.text "評価結果" ]
            , Html.div
                (case resultVisible of
                    ResultVisibleValue ->
                        [ Html.Attributes.class "editor-tab-item"
                        , Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( ResultVisibleWasmSExpr, False ))
                        ]

                    ResultVisibleWasmSExpr ->
                        [ Html.Attributes.class "editor-tab-item-select" ]
                )
                [ Html.text "wasmのS式" ]
            ]
         ]
            ++ (case resultVisible of
                    ResultVisibleValue ->
                        [ Html.div
                            [ subClass "partDef-resultArea-resultValue" ]
                            [ Html.text
                                (Data.Project.CompileResult.getRunResult compileAndRunResult
                                    |> Maybe.map String.fromInt
                                    |> Maybe.withDefault "評価結果がない"
                                )
                            ]
                        ]

                    ResultVisibleWasmSExpr ->
                        [ Html.div
                            []
                            [ Html.text
                                (Data.Project.CompileResult.getCompileResult compileAndRunResult
                                    |> Maybe.map Compiler.compileResultToString
                                    |> Maybe.withDefault "コンパイル中……"
                                )
                            ]
                        ]
               )
        )



{- ================= Name And Type ================= -}


partDefViewNameAndType : Maybe L.Label -> Data.Project.PartDef.Type -> Maybe PartDefActive -> Html.Html PartDefViewMsg
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


partDefViewName : Maybe L.Label -> Maybe NameEdit -> Html.Html PartDefViewMsg
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


partDefNameNormalView : Maybe L.Label -> Html.Html PartDefViewMsg
partDefNameNormalView name =
    Html.div
        [ subClass "partDef-nameContainer"
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( PartDefActiveTo (ActivePartDefName NameEditSelect), True ))
        ]
        [ case name of
            Just safeName ->
                Html.div
                    [ subClass "partDef-nameText" ]
                    [ Html.text (L.toSmallString safeName) ]

            Nothing ->
                Html.div
                    [ subClass "partDef-nameTextNone" ]
                    [ Html.text "NO NAME" ]
        ]


partDefNameSelectView : Maybe L.Label -> Html.Html PartDefViewMsg
partDefNameSelectView name =
    Html.Keyed.node "div"
        [ subClass "partDef-nameContainer"
        , subClass "partDef-element-active"
        ]
        [ ( "view"
          , case name of
                Just safeName ->
                    Html.div
                        [ subClass "partDef-nameText" ]
                        [ Html.text (L.toSmallString safeName) ]

                Nothing ->
                    Html.div
                        [ subClass "partDef-nameTextNone" ]
                        [ Html.text "NO NAME" ]
          )
        , ( "input", hideInputElement )
        ]


partDefNameEditView : Maybe L.Label -> Maybe { index : Int, searchName : Maybe L.Label } -> Html.Html PartDefViewMsg
partDefNameEditView name suggestSelectDataMaybe =
    Html.Keyed.node "div"
        [ subClass "partDef-nameContainer" ]
        [ ( "input"
          , Html.input
                [ subClass "partDef-nameTextArea"
                , Html.Attributes.id "edit"
                , Html.Events.onInput PartDefInput
                , Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( PartDefNone, True ))
                ]
                []
          )
        , ( "suggest"
          , suggestionName name suggestSelectDataMaybe
          )
        ]


suggestionName : Maybe L.Label -> Maybe { index : Int, searchName : Maybe L.Label } -> Html.Html msg
suggestionName name suggestSelectDataMaybe =
    Html.div
        [ subClass "partDef-suggestion" ]
        (case suggestSelectDataMaybe of
            Just { index, searchName } ->
                [ suggestNameItem (nameToEditorStyleString searchName) "" False ]
                    ++ (suggestionNameList
                            |> List.indexedMap
                                (\i ( safeName, subText ) ->
                                    suggestNameItem (L.toSmallString safeName) subText (i == index)
                                )
                       )

            Nothing ->
                [ suggestNameItem
                    (nameToEditorStyleString name)
                    ""
                    True
                ]
                    ++ (suggestionNameList
                            |> List.map
                                (\( safeName, subText ) ->
                                    suggestNameItem (L.toSmallString safeName) subText False
                                )
                       )
        )


nameToEditorStyleString : Maybe L.Label -> String
nameToEditorStyleString name =
    case name of
        Just n ->
            L.toSmallString n

        Nothing ->
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



{------------------ Type  ------------------}


partDefViewType : Data.Project.PartDef.Type -> Maybe TypeEdit -> Html.Html PartDefViewMsg
partDefViewType type_ typeEditMaybe =
    case typeEditMaybe of
        Just TypeEditSelect ->
            partDefTypeSelectView type_

        Nothing ->
            partDefTypeNormalView type_


partDefTypeNormalView : Data.Project.PartDef.Type -> Html.Html PartDefViewMsg
partDefTypeNormalView type_ =
    Html.div
        [ subClass "partDef-typeContainer"
        , Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( PartDefActiveTo (ActivePartDefType TypeEditSelect), True ))
        ]
        [ Html.div
            [ subClass "partDef-typeText" ]
            [ Html.text (Data.Project.PartDef.typeToString type_) ]
        ]


partDefTypeSelectView : Data.Project.PartDef.Type -> Html.Html PartDefViewMsg
partDefTypeSelectView type_ =
    Html.Keyed.node "div"
        [ subClass "partDef-typeContainer"
        , subClass "partDef-element-active"
        ]
        [ ( "view"
          , Html.div
                [ subClass "partDef-typeText" ]
                [ Html.text (Data.Project.PartDef.typeToString type_) ]
          )
        , ( "input"
          , hideInputElement
          )
        ]


partDefTypeEditView : Data.Project.PartDef.Type -> Int -> Html.Html PartDefViewMsg
partDefTypeEditView type_ suggestIndex =
    Html.Keyed.node "div"
        [ subClass "partDef-typeContainer" ]
        [ ( "input"
          , Html.input
                [ subClass "partDef-typeTextArea"
                , Html.Attributes.id "edit"
                , Html.Events.onInput PartDefInput
                ]
                []
          )
        , ( "suggest"
          , suggestionType type_ suggestIndex
          )
        ]


suggestionType : Data.Project.PartDef.Type -> Int -> Html.Html msg
suggestionType type_ suggestIndex =
    Html.div
        [ subClass "partDef-suggestion" ]
        []



--        [ suggestTypeItem
--            (Type.Valid
--                (SourceIndex.TypeIndex
--                    { moduleIndex = SourceIndex.CoreInt32
--                    , typeIndex = ModuleIndex.TypeDefIndex 0
--                    }
--                )
--            )
--            (Html.text "32bit整数")
--            True
--        ]


suggestTypeItem : Data.Project.PartDef.Type -> Html.Html msg -> Bool -> Html.Html msg
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
            [ Html.text (Data.Project.PartDef.typeToString type_) ]
        , Html.div
            [ subClassList
                [ ( "partDef-suggestion-item-subItem", True )
                , ( "partDef-suggestion-item-subItem-select", isSelect )
                ]
            ]
            [ subItem ]
        ]



{- ================= Expr ================= -}


partDefViewExprArea : Int -> Expr.Expr -> Maybe TermOpPos -> Html.Html PartDefViewMsg
partDefViewExprArea width expr termOpPosMaybe =
    Html.div
        ([ subClass "partDef-exprArea" ]
            ++ (case termOpPosMaybe of
                    Just TermOpSelf ->
                        []

                    _ ->
                        [ Html.Events.stopPropagationOn "click"
                            (Json.Decode.succeed ( PartDefActiveTo (ActivePartDefExpr TermOpSelf), True ))
                        ]
               )
        )
        [ exprEqualSign
        , partDefViewExpr (width - 20) expr termOpPosMaybe
        ]


exprEqualSign : Html.Html msg
exprEqualSign =
    Html.div
        [ subClass "partDef-equalSign" ]
        [ Html.text "=" ]


partDefViewExpr : Int -> Expr.Expr -> Maybe TermOpPos -> Html.Html PartDefViewMsg
partDefViewExpr width expr termOpPosMaybe =
    Html.div
        [ subClassList
            [ ( "partDef-expr", True ), ( "partDef-element-active", termOpPosMaybe == Just TermOpSelf ) ]
        ]
        ([ Html.div
            [ subClass "partDef-expr-line" ]
            (newTermOpView termOpPosMaybe expr
                |> List.map (Html.map (\m -> PartDefActiveTo (ActivePartDefExpr m)))
            )
         , exprLengthView expr width
         ]
            ++ (case termOpPosMaybe of
                    Just _ ->
                        [ hideInputElement ]

                    Nothing ->
                        []
               )
        )


exprLengthView : Expr.Expr -> Int -> Html.Html msg
exprLengthView expr areaWidth =
    let
        exprWidth =
            exprLength expr
    in
    Html.div
        [ subClass "partDef-exprArea-width" ]
        [ Html.text
            ((String.fromInt exprWidth ++ "/" ++ String.fromInt areaWidth)
                ++ (if exprWidth < areaWidth then
                        "(OK)"

                    else
                        "(NG)"
                   )
            )
        ]


exprLength : Expr.Expr -> Int
exprLength expr =
    (expr |> Expr.getHead |> termLength)
        + (expr
            |> Expr.getOthers
            |> List.map
                (\( op, term ) ->
                    opLength op + termLength term
                )
            |> List.sum
          )


termLength : Expr.Term -> Int
termLength term =
    case term of
        Expr.Int32Literal int ->
            (if int == 0 then
                1

             else if int < 0 then
                floor (logBase 10 (toFloat -int)) + 2

             else
                floor (logBase 10 (toFloat int)) + 1
            )
                * 10

        Expr.Part _ ->
            18

        Expr.Parentheses expr ->
            exprLength expr + parenthesisWidth * 2

        Expr.None ->
            36


parenthesisWidth : Int
parenthesisWidth =
    9


opLength : Expr.Operator -> Int
opLength op =
    opPaddingLength op
        * 2
        + ((case op of
                Expr.Pipe ->
                    1

                Expr.Or ->
                    1

                Expr.And ->
                    1

                Expr.Equal ->
                    1

                Expr.NotEqual ->
                    2

                Expr.LessThan ->
                    1

                Expr.LessThanOrEqual ->
                    2

                Expr.Concat ->
                    2

                Expr.Add ->
                    1

                Expr.Sub ->
                    1

                Expr.Mul ->
                    1

                Expr.Div ->
                    1

                Expr.Factorial ->
                    1

                Expr.Compose ->
                    2

                Expr.App ->
                    0

                Expr.Blank ->
                    2
           )
            * 9
          )


opPaddingLength : Expr.Operator -> Int
opPaddingLength op =
    (case Expr.toBindingOrder op of
        Expr.O0 ->
            7

        Expr.O1 ->
            8

        Expr.O2 ->
            6

        Expr.O3 ->
            5

        Expr.O4 ->
            4

        Expr.O5 ->
            3

        Expr.O6 ->
            2

        Expr.O7 ->
            1
    )
        * 2


newTermOpView : Maybe TermOpPos -> Expr.Expr -> List (Html.Html TermOpPos)
newTermOpView termOpPosMaybe expr =
    (case termOpPosMaybe of
        Just TermOpHead ->
            [ activeHeadTermLeft ]

        _ ->
            []
    )
        ++ newTermOpHeadView (Expr.getHead expr)
        ++ newTermOpOthersView (Expr.getOthers expr)


newTermOpHeadView : Expr.Term -> List (Html.Html TermOpPos)
newTermOpHeadView term =
    newTermView
        term
        |> List.map (Html.map (\m -> TermOpTerm 0 m))


newTermOpOthersView : List ( Expr.Operator, Expr.Term ) -> List (Html.Html TermOpPos)
newTermOpOthersView others =
    others
        |> List.indexedMap
            (\index ( op, term ) ->
                [ newOpView op
                    |> List.map (Html.map (always (TermOpOp index)))
                , newTermView term
                    |> List.map (Html.map (\m -> TermOpTerm (index + 1) m))
                ]
            )
        |> List.concat
        |> List.concat


newTermView : Expr.Term -> List (Html.Html TermType)
newTermView term =
    case term of
        Expr.Int32Literal int ->
            [ Html.div
                [ subClass "partDef-newTerm"
                , Html.Attributes.style "width" (String.fromInt (termLength term) ++ "px")
                ]
                [ Html.text (Expr.termToString term) ]
            ]

        Expr.Part partIndex ->
            []

        Expr.Parentheses expr ->
            [ parenthesesLeftView ]
                ++ (newTermOpView Nothing expr
                        |> List.map (Html.map TypeParentheses)
                   )
                ++ [ parenthesesRightView ]

        Expr.None ->
            []


parenthesesLeftView : Html.Html msg
parenthesesLeftView =
    Html.div
        [ Html.Attributes.style "width" (String.fromInt parenthesisWidth ++ "px") ]
        [ Html.text "(" ]


parenthesesRightView : Html.Html msg
parenthesesRightView =
    Html.div
        [ Html.Attributes.style "width" (String.fromInt parenthesisWidth ++ "px") ]
        [ Html.text ")" ]


newOpView : Expr.Operator -> List (Html.Html ())
newOpView op =
    [ Html.div
        [ Html.Events.stopPropagationOn "click" (Json.Decode.succeed ( (), True ))
        , Html.Attributes.style "width" (String.fromInt (opLength op) ++ "px")
        , Html.Attributes.style "padding" ("0 " ++ String.fromInt (opPaddingLength op) ++ "px")
        ]
        [ Html.text (Expr.opToString op) ]
    ]


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
hideInputElement : Html.Html PartDefViewMsg
hideInputElement =
    Html.input
        [ subClass "partDef-hideTextArea"
        , Html.Attributes.id "edit"
        , Html.Events.onInput PartDefInput
        ]
        []


{-| 定義を末尾に1つ追加するボタン
-}
addPartDefButton : Html.Html Msg
addPartDefButton =
    Html.button
        [ Html.Events.stopPropagationOn "click"
            (Json.Decode.succeed ( MsgAddPartDef, True ))
        , subClass "defList-addButton"
        ]
        [ Html.text "+ 新しいパーツ定義" ]


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
