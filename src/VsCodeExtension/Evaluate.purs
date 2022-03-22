module VsCodeExtension.Evaluate
  ( EvaluatedItem(..)
  , EvaluatedTree(..)
  , EvaluatedTreeChild(..)
  , PartialModule(..)
  , PartialPart(..)
  , TreeType(..)
  , TypeMisMatch(..)
  , codeTreeToEvaluatedTreeIContextNormal
  , evaluatedTreeGetItem
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range

newtype EvaluatedTree
  = EvaluatedTree
  { item :: EvaluatedItem
  , range :: Range.Range
  , children :: Array EvaluatedTreeChild
  {- 期待した子要素の数 -}
  , expectedChildrenCount :: Maybe UInt.UInt
  , nameRange :: Range.Range
  , name :: NonEmptyString
  }

newtype EvaluatedTreeChild
  = EvaluatedTreeChild
  { child :: EvaluatedTree
  , typeMisMatchMaybe :: Maybe TypeMisMatch
  }

evaluatedTreeGetItem :: EvaluatedTree -> EvaluatedItem
evaluatedTreeGetItem (EvaluatedTree { item }) = item

evaluatedTreeChildGetItem :: EvaluatedTreeChild -> EvaluatedItem
evaluatedTreeChildGetItem (EvaluatedTreeChild { child }) = evaluatedTreeGetItem child

data EvaluatedItem
  = Module PartialModule
  | Description String
  | ModuleBody (Array PartialPart)
  | Part PartialPart
  | Expr (Maybe UInt.UInt)
  | UIntLiteral (Maybe UInt.UInt)
  | Unknown

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

evaluateItemToTreeType :: EvaluatedItem -> Maybe TreeType
evaluateItemToTreeType = case _ of
  Module _ -> Just TreeTypeModule
  Description _ -> Just TreeTypeDescription
  ModuleBody _ -> Just TreeTypeModuleBody
  Part _ -> Just TreeTypePart
  Expr _ -> Just TreeTypeExpr
  UIntLiteral _ -> Just TreeTypeUIntLiteral
  Unknown -> Nothing

data TreeType
  = TreeTypeModule
  | TreeTypeDescription
  | TreeTypeModuleBody
  | TreeTypePart
  | TreeTypeExpr
  | TreeTypeUIntLiteral

derive instance eqTreeType :: Eq TreeType

newtype PartialModule
  = PartialModule
  { description :: String
  , partList :: Array PartialPart
  }

newtype PartialPart
  = PartialPart
  { name :: Maybe NonEmptyString
  , description :: String
  , value :: Maybe UInt.UInt
  }

codeTreeToEvaluatedTree :: Maybe TreeType -> Parser.CodeTree -> EvaluatedTreeChild
codeTreeToEvaluatedTree treeType codeTree =
  let
    tree = case treeType of
      Just TreeTypeDescription -> codeTreeToEvaluatedTreeInContextDescription codeTree
      Just TreeTypeUIntLiteral -> codeTreeToEvaluatedTreeInContextUIntLiteral codeTree
      _ -> codeTreeToEvaluatedTreeIContextNormal codeTree
  in
    EvaluatedTreeChild
      { child: tree
      , typeMisMatchMaybe: compareType treeType tree
      }

codeTreeToEvaluatedTreeIContextNormal :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeIContextNormal codeTree@(Parser.CodeTree { name, nameRange, range, children }) = case NonEmptyString.toString name of
  "module" ->
    need2Children
      { firstContext: TreeTypeDescription, secondContext: TreeTypeModuleBody }
      codeTree
      ( \{ first, second } ->
          Module
            ( PartialModule
                { description:
                    case first of
                      Just (Description description) -> description
                      _ -> ""
                , partList:
                    case second of
                      Just (ModuleBody partList) -> partList
                      _ -> []
                }
            )
      )
  "body" ->
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
            ModuleBody
              ( Array.mapMaybe
                  ( \childTree -> case evaluatedTreeChildGetItem childTree of
                      (Part part) -> Just part
                      _ -> Nothing
                  )
                  evaluatedChildren
              )
        , range
        , children: evaluatedChildren
        , expectedChildrenCount: Nothing
        , nameRange
        , name
        }
  "part" ->
    need3Children
      { firstContext: TreeTypeDescription
      , secondContext: TreeTypeDescription
      , thirdContext: TreeTypeExpr
      }
      codeTree
      ( \{ first, second, third } ->
          Part
            ( PartialPart
                { name:
                    case first of
                      Just (Description partName) -> NonEmptyString.fromString partName
                      _ -> Nothing
                , description:
                    case second of
                      Just (Description description) -> description
                      _ -> ""
                , value:
                    case third of
                      Just (Expr value) -> value
                      _ -> Nothing
                }
            )
      )
  "add" ->
    need2Children
      { firstContext: TreeTypeExpr, secondContext: TreeTypeExpr }
      codeTree
      ( \{ first, second } ->
          Expr
            ( Just
                ( add
                    (maybeEvaluatedItemToUInt first)
                    (maybeEvaluatedItemToUInt second)
                )
            )
      )
  "uint" ->
    need1Children
      TreeTypeUIntLiteral
      codeTree
      ( case _ of
          Just (UIntLiteral child) -> Expr child
          _ -> Expr Nothing
      )
  _ ->
    EvaluatedTree
      { item: Unknown
      , range
      , children:
          map
            ( \child ->
                codeTreeToEvaluatedTree
                  Nothing
                  child
            )
            children
      , expectedChildrenCount: Nothing
      , nameRange
      , name
      }

codeTreeToEvaluatedTreeInContextDescription :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextDescription codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (Description (NonEmptyString.toString name))

codeTreeToEvaluatedTreeInContextUIntLiteral :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeInContextUIntLiteral codeTree@(Parser.CodeTree { name }) =
  need0Children
    codeTree
    (UIntLiteral (UInt.fromString (NonEmptyString.toString name)))

maybeEvaluatedItemToUInt :: Maybe EvaluatedItem -> UInt.UInt
maybeEvaluatedItemToUInt = case _ of
  Just (Expr (Just value)) -> value
  _ -> UInt.fromInt 28

need0Children ::
  Parser.CodeTree ->
  EvaluatedItem ->
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
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 0)
      , name
      , nameRange
      }

need1Children ::
  TreeType ->
  Parser.CodeTree ->
  (Maybe EvaluatedItem -> EvaluatedItem) ->
  EvaluatedTree
need1Children context (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> Just context
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
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 1)
      , name
      , nameRange
      }

need2Children ::
  { firstContext :: TreeType, secondContext :: TreeType } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem, second :: Maybe EvaluatedItem } -> EvaluatedItem) ->
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
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 2)
      , name
      , nameRange
      }

need3Children ::
  { firstContext :: TreeType, secondContext :: TreeType, thirdContext :: TreeType } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem, second :: Maybe EvaluatedItem, third :: Maybe EvaluatedItem } -> EvaluatedItem) ->
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
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 3)
      , name
      , nameRange
      }
