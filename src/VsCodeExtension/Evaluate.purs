module VsCodeExtension.Evaluate
  ( EvaluateExprResult(..)
  , EvaluatedTree(..)
  , EvaluatedTreeChild(..)
  , Value(..)
  , TreeType(..)
  , TypeMisMatch(..)
  , codeTreeToEvaluatedTreeIContextNormal
  , evaluateExpr
  , evaluatedTreeGetItem
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Number as Number
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Type.Proxy (Proxy(..))
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range
import VsCodeExtension.EvaluatedItem as EvaluatedItem

newtype EvaluatedTree
  = EvaluatedTree
  { item :: EvaluatedItem.EvaluatedItem
  , range :: Range.Range
  , children :: Array EvaluatedTreeChild
  {- 期待した子要素の個数と型. Nothing は期待する個数が決まっていない (bodyなど) -}
  , expectedChildrenTypeMaybe :: Maybe (Array TreeType)
  , nameRange :: Range.Range
  , name :: String
  }

newtype EvaluatedTreeChild
  = EvaluatedTreeChild
  { child :: EvaluatedTree
  , typeMisMatchMaybe :: Maybe TypeMisMatch
  }

evaluatedTreeGetItem :: EvaluatedTree -> EvaluatedItem.EvaluatedItem
evaluatedTreeGetItem (EvaluatedTree { item }) = item

evaluatedTreeChildGetItem :: EvaluatedTreeChild -> EvaluatedItem.EvaluatedItem
evaluatedTreeChildGetItem (EvaluatedTreeChild { child }) = evaluatedTreeGetItem child

newtype TypeMisMatch
  = TypeMisMatch { expect :: TreeType, actual :: TreeType }

compareType :: Maybe TreeType -> EvaluatedTree -> Maybe TypeMisMatch
compareType expectMaybe tree = case expectMaybe of
  Nothing -> Nothing
  Just expect -> case (evaluateItemToTreeType (evaluatedTreeGetItem tree)) of
    Nothing -> Nothing
    Just actual ->
      if eq expect actual then
        Nothing
      else
        Just (TypeMisMatch { expect, actual })

evaluateItemToTreeType :: EvaluatedItem.EvaluatedItem -> Maybe TreeType
evaluateItemToTreeType = case _ of
  EvaluatedItem.Module _ -> Just TreeTypeModule
  EvaluatedItem.Description _ -> Just TreeTypeDescription
  EvaluatedItem.ModuleBody _ -> Just TreeTypeModuleBody
  EvaluatedItem.Part _ -> Just TreeTypePart
  EvaluatedItem.Expr _ -> Just TreeTypeExpr
  EvaluatedItem.UIntLiteral _ -> Just TreeTypeUIntLiteral
  EvaluatedItem.Identifier _ -> Just TreeTypeIdentifier
  EvaluatedItem.TextLiteral _ -> Just TreeTypeTextLiteral
  EvaluatedItem.NonEmptyTextLiteral _ -> Just TreeTypeNonEmptyTextLiteral
  EvaluatedItem.Float64Literal _ -> Just TreeTypeFloat64Literal

data TreeType
  = TreeTypeModule
  | TreeTypeDescription
  | TreeTypeModuleBody
  | TreeTypePart
  | TreeTypeExpr
  | TreeTypeUIntLiteral
  | TreeTypeIdentifier
  | TreeTypeTextLiteral
  | TreeTypeNonEmptyTextLiteral
  | TreeTypeFloat64Literal

derive instance eqTreeType :: Eq TreeType

newtype EvaluateExprResult
  = EvaluateExprResult { value :: Value, dummy :: Boolean }

data Value
  = ValueUInt UInt.UInt
  | ValueText String
  | ValueNonEmptyText NonEmptyString
  | ValueFloat64 Number

evaluateExprResultMap2 ::
  { func :: Value -> Value -> EvaluateExprResult
  , a :: EvaluateExprResult
  , b :: EvaluateExprResult
  } ->
  EvaluateExprResult
evaluateExprResultMap2 { func, a: EvaluateExprResult aResult, b: EvaluateExprResult bResult } =
  let
    (EvaluateExprResult { value, dummy }) = func aResult.value bResult.value
  in
    EvaluateExprResult
      { value: value
      , dummy: disj (disj aResult.dummy bResult.dummy) dummy
      }

-- | dummy は式の値を計算できない場合に, テキトーなダミーデータを入れている場合に `true` になる
evaluateExpr :: EvaluatedItem.PartialExpr -> EvaluatedItem.PartialModule -> EvaluateExprResult
evaluateExpr expr partialModule = case expr of
  EvaluatedItem.ExprAdd { a, b } ->
    evaluateExprResultMap2
      { func: valueAdd
      , a: evaluateExprMaybe a partialModule
      , b: evaluateExprMaybe b partialModule
      }
  EvaluatedItem.ExprPartReference { name } ->
    ( case EvaluatedItem.findPart partialModule name of
        Just (EvaluatedItem.PartialPart { expr: partExpr }) -> evaluateExprMaybe partExpr partialModule
        Nothing -> uintDummy
    )
  EvaluatedItem.ExprPartReferenceInvalidName {} -> uintDummy
  EvaluatedItem.ExprUIntLiteral uintMaybe ->
    Maybe.fromMaybe
      uintDummy
      (map (\uintValue -> EvaluateExprResult { value: ValueUInt uintValue, dummy: false }) uintMaybe)
  EvaluatedItem.ExprTextLiteral textMaybe -> EvaluateExprResult { value: ValueText textMaybe, dummy: false }
  EvaluatedItem.ExprNonEmptyTextLiteral textMaybe ->
    Maybe.fromMaybe
      (EvaluateExprResult { value: ValueNonEmptyText (NonEmptyString.nes (Proxy :: Proxy "sample text")), dummy: true })
      ( map
          (\text -> EvaluateExprResult { value: ValueNonEmptyText text, dummy: false })
          textMaybe
      )
  EvaluatedItem.ExprFloat64Literal valueMaybe ->
    Maybe.fromMaybe
      (EvaluateExprResult { value: ValueFloat64 6.28, dummy: true })
      ( map
          (\uintValue -> EvaluateExprResult { value: ValueFloat64 uintValue, dummy: false })
          valueMaybe
      )

valueAdd :: Value -> Value -> EvaluateExprResult
valueAdd a b = case { a, b } of
  { a: ValueUInt aAsUInt, b: ValueUInt bAsUInt } ->
    EvaluateExprResult
      { value: ValueUInt (add aAsUInt bAsUInt)
      , dummy: false
      }
  {} -> uintDummy

evaluateExprMaybe :: Maybe EvaluatedItem.PartialExpr -> EvaluatedItem.PartialModule -> EvaluateExprResult
evaluateExprMaybe exprMaybe partialModule = case exprMaybe of
  Just expr -> evaluateExpr expr partialModule
  Nothing -> uintDummy

uintDummy :: EvaluateExprResult
uintDummy = EvaluateExprResult { value: ValueUInt (UInt.fromInt 28), dummy: true }

codeTreeToEvaluatedTree :: Maybe TreeType -> Parser.CodeTree -> EvaluatedTreeChild
codeTreeToEvaluatedTree treeType codeTree =
  let
    tree = case treeType of
      Just TreeTypeDescription -> codeTreeToEvaluatedTreeInContextDescription codeTree
      Just TreeTypeUIntLiteral -> codeTreeToEvaluatedTreeInContextUIntLiteral codeTree
      Just TreeTypeTextLiteral -> codeTreeToEvaluatedTreeInContextTextLiteral codeTree
      Just TreeTypeNonEmptyTextLiteral -> codeTreeToEvaluatedTreeInContextNonEmptyTextLiteral codeTree
      Just TreeTypeFloat64Literal -> codeTreeToEvaluatedTreeInContextFloat64Literal codeTree
      Just TreeTypeIdentifier -> codeTreeToEvaluatedTreeInContextIdentifier codeTree
      _ -> codeTreeToEvaluatedTreeIContextNormal codeTree
  in
    EvaluatedTreeChild
      { child: tree
      , typeMisMatchMaybe: compareType treeType tree
      }

codeTreeToEvaluatedTreeIContextNormal :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeIContextNormal codeTree@(Parser.CodeTree { name, nameRange, range, children }) =
  if equalName name BuiltIn.moduleBuiltIn then
    need2Children
      { firstContext: TreeTypeDescription, secondContext: TreeTypeModuleBody }
      codeTree
      ( \{ first, second } ->
          EvaluatedItem.Module
            ( EvaluatedItem.PartialModule
                { description:
                    case first of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , partList:
                    case second of
                      Just (EvaluatedItem.ModuleBody partList) -> partList
                      _ -> []
                }
            )
      )
  else if equalName name BuiltIn.bodyBuiltIn then
    let
      evaluatedChildren =
        map
          ( \child ->
              codeTreeToEvaluatedTree (Just TreeTypePart) child
          )
          children
    in
      EvaluatedTree
        { item:
            EvaluatedItem.ModuleBody
              ( Array.mapMaybe
                  ( \childTree -> case evaluatedTreeChildGetItem childTree of
                      (EvaluatedItem.Part part) -> Just part
                      _ -> Nothing
                  )
                  evaluatedChildren
              )
        , range
        , children: evaluatedChildren
        , expectedChildrenTypeMaybe: Nothing
        , nameRange
        , name
        }
  else if equalName name BuiltIn.typeBuiltIn then
    -- ここらへんの処理を改良したいな...
    need3Children
      { firstContext: TreeTypeIdentifier
      , secondContext: TreeTypeDescription
      , thirdContext: TreeTypeExpr
      }
      codeTree
      ( \{ first, second, third } ->
          EvaluatedItem.Part
            ( EvaluatedItem.PartialPart
                { name:
                    case first of
                      Just (EvaluatedItem.Identifier partName) -> partName
                      _ -> Nothing
                , description:
                    case second of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , expr:
                    case third of
                      Just (EvaluatedItem.Expr value) -> Just value
                      _ -> Nothing
                , range
                }
            )
      )
  else if equalName name BuiltIn.partBuiltIn then
    need3Children
      { firstContext: TreeTypeIdentifier
      , secondContext: TreeTypeDescription
      , thirdContext: TreeTypeExpr
      }
      codeTree
      ( \{ first, second, third } ->
          EvaluatedItem.Part
            ( EvaluatedItem.PartialPart
                { name:
                    case first of
                      Just (EvaluatedItem.Identifier partName) -> partName
                      _ -> Nothing
                , description:
                    case second of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , expr:
                    case third of
                      Just (EvaluatedItem.Expr value) -> Just value
                      _ -> Nothing
                , range
                }
            )
      )
  else if equalName name BuiltIn.addBuiltIn then
    need2Children
      { firstContext: TreeTypeExpr, secondContext: TreeTypeExpr }
      codeTree
      ( \{ first, second } ->
          EvaluatedItem.Expr
            ( EvaluatedItem.ExprAdd
                { a: maybeEvaluatedItemToMaybeExpr first
                , b: maybeEvaluatedItemToMaybeExpr second
                }
            )
      )
  else if equalName name BuiltIn.uintBuiltIn then
    need1Children
      TreeTypeUIntLiteral
      codeTree
      ( case _ of
          Just (EvaluatedItem.UIntLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprUIntLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprUIntLiteral Nothing)
      )
  else if equalName name BuiltIn.textBuiltIn then
    need1Children
      TreeTypeTextLiteral
      codeTree
      ( case _ of
          Just (EvaluatedItem.TextLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprTextLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprTextLiteral "")
      )
  else if equalName name BuiltIn.nonEmptyTextBuiltIn then
    need1Children
      TreeTypeNonEmptyTextLiteral
      codeTree
      ( case _ of
          Just (EvaluatedItem.NonEmptyTextLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprNonEmptyTextLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprNonEmptyTextLiteral Nothing)
      )
  else if equalName name BuiltIn.float64BuiltIn then
    need1Children
      TreeTypeFloat64Literal
      codeTree
      ( case _ of
          Just (EvaluatedItem.Float64Literal child) -> EvaluatedItem.Expr (EvaluatedItem.ExprFloat64Literal child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprFloat64Literal Nothing)
      )
  else
    EvaluatedTree
      { item:
          case Identifier.identifierFromString name of
            Just nameIdentifier -> EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name: nameIdentifier })
            Nothing -> EvaluatedItem.Expr (EvaluatedItem.ExprPartReferenceInvalidName { name })
      , range
      , children:
          map
            ( \child ->
                codeTreeToEvaluatedTree
                  Nothing
                  child
            )
            children
      , expectedChildrenTypeMaybe: Nothing
      , nameRange
      , name
      }

equalName :: String -> BuiltIn.BuiltIn -> Boolean
equalName name builtIn =
  eq
    name
    (NonEmptyString.toString (BuiltIn.builtInGetName builtIn))

maybeEvaluatedItemToMaybeExpr :: Maybe EvaluatedItem.EvaluatedItem -> Maybe EvaluatedItem.PartialExpr
maybeEvaluatedItemToMaybeExpr = case _ of
  Just (EvaluatedItem.Expr expr) -> Just expr
  _ -> Nothing

codeTreeToEvaluatedTreeInContextDescription :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextDescription codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.Description name)

codeTreeToEvaluatedTreeInContextUIntLiteral :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextUIntLiteral codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.UIntLiteral (UInt.fromString name))

codeTreeToEvaluatedTreeInContextTextLiteral :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextTextLiteral codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.TextLiteral name)

codeTreeToEvaluatedTreeInContextNonEmptyTextLiteral :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextNonEmptyTextLiteral codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.NonEmptyTextLiteral (NonEmptyString.fromString name))

codeTreeToEvaluatedTreeInContextFloat64Literal :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextFloat64Literal codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.Float64Literal (Number.fromString name))

codeTreeToEvaluatedTreeInContextIdentifier :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextIdentifier codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (EvaluatedItem.Identifier (Identifier.identifierFromString name))

need0Children ::
  Parser.CodeTree ->
  EvaluatedItem.EvaluatedItem ->
  EvaluatedTree
need0Children (Parser.CodeTree { name, nameRange, children, range }) item =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      map
        ( \child ->
            EvaluatedTreeChild
              { child: codeTreeToEvaluatedTreeIContextNormal child
              , typeMisMatchMaybe: Nothing
              }
        )
        children
  in
    EvaluatedTree
      { item: item
      , range: range
      , children: evaluatedChildren
      , expectedChildrenTypeMaybe: Just []
      , name
      , nameRange
      }

need1Children ::
  TreeType ->
  Parser.CodeTree ->
  (Maybe EvaluatedItem.EvaluatedItem -> EvaluatedItem.EvaluatedItem) ->
  EvaluatedTree
need1Children treeType (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> Just treeType
                  _ -> Nothing
              )
              child
        )
        children
  in
    EvaluatedTree
      { item: func (map evaluatedTreeChildGetItem (Array.index evaluatedChildren 0))
      , range: range
      , children: evaluatedChildren
      , expectedChildrenTypeMaybe: Just [ treeType ]
      , name
      , nameRange
      }

need2Children ::
  { firstContext :: TreeType, secondContext :: TreeType } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem.EvaluatedItem, second :: Maybe EvaluatedItem.EvaluatedItem } -> EvaluatedItem.EvaluatedItem) ->
  EvaluatedTree
need2Children { firstContext, secondContext } (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> Just firstContext
                  1 -> Just secondContext
                  _ -> Nothing
              )
              child
        )
        children
  in
    EvaluatedTree
      { item:
          func
            { first: map evaluatedTreeChildGetItem (Array.index evaluatedChildren 0)
            , second: map evaluatedTreeChildGetItem (Array.index evaluatedChildren 1)
            }
      , range: range
      , children: evaluatedChildren
      , expectedChildrenTypeMaybe: Just [ firstContext, secondContext ]
      , name
      , nameRange
      }

need3Children ::
  { firstContext :: TreeType, secondContext :: TreeType, thirdContext :: TreeType } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem.EvaluatedItem, second :: Maybe EvaluatedItem.EvaluatedItem, third :: Maybe EvaluatedItem.EvaluatedItem } -> EvaluatedItem.EvaluatedItem) ->
  EvaluatedTree
need3Children context (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> Just context.firstContext
                  1 -> Just context.secondContext
                  2 -> Just context.thirdContext
                  _ -> Nothing
              )
              child
        )
        children
  in
    EvaluatedTree
      { item:
          func
            { first: map evaluatedTreeChildGetItem (Array.index evaluatedChildren 0)
            , second: map evaluatedTreeChildGetItem (Array.index evaluatedChildren 1)
            , third: map evaluatedTreeChildGetItem (Array.index evaluatedChildren 2)
            }
      , range: range
      , children: evaluatedChildren
      , expectedChildrenTypeMaybe:
          Just
            [ context.firstContext
            , context.secondContext
            , context.thirdContext
            ]
      , name
      , nameRange
      }
