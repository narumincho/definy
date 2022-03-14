module VsCodeExtension.Evaluate
  ( EvaluatedItem(..)
  , EvaluatedTree(..)
  , PartialModule(..)
  , PartialPart(..)
  , codeTreeToEvaluatedTreeIContextNormal
  , evaluatedTreeGetItem
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Type.Proxy (Proxy(..))
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range

newtype EvaluatedTree
  = EvaluatedTree
  { item :: EvaluatedItem
  , range :: Range.Range
  , children :: Array EvaluatedTree
  {- 期待した子要素の数 -}
  , expectedChildrenCount :: Maybe UInt.UInt
  , nameRange :: Range.Range
  , name :: NonEmptyString
  }

evaluatedTreeGetItem :: EvaluatedTree -> EvaluatedItem
evaluatedTreeGetItem (EvaluatedTree { item }) = item

data EvaluatedItem
  = Module PartialModule
  | Description String
  | ModuleBody (Array PartialPart)
  | Part PartialPart
  | Expr (Maybe UInt.UInt)
  | UIntLiteral (Maybe UInt.UInt)
  | Unknown

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

data Context
  = ContextNormal
  | ContextDescription
  | ContextUIntLiteral

codeTreeToEvaluatedTree :: Context -> Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTree context codeTree = case context of
  ContextNormal -> codeTreeToEvaluatedTreeIContextNormal codeTree
  ContextDescription -> codeTreeToEvaluatedTreeInContextDescription codeTree
  ContextUIntLiteral -> codeTreeToEvaluatedTreeInContextUIntLiteral codeTree

codeTreeToEvaluatedTreeIContextNormal :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeIContextNormal codeTree@(Parser.CodeTree { name, nameRange, range, children }) = case NonEmptyString.toString name of
  "module" ->
    need2Children
      { firstContext: ContextDescription, secondContext: ContextNormal }
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
              codeTreeToEvaluatedTree
                ContextNormal
                child
          )
          children
    in
      EvaluatedTree
        { item:
            ModuleBody
              ( Array.mapMaybe
                  ( \childTree -> case evaluatedTreeGetItem childTree of
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
      { firstContext: ContextDescription
      , secondContext: ContextDescription
      , thirdContext: ContextNormal
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
      { firstContext: ContextNormal, secondContext: ContextNormal }
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
      ContextUIntLiteral
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
                  ContextNormal
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

-- | 足りないパラメーターを補う `CodeTree` に変換する
fillCodeTree :: Parser.CodeTree -> Parser.CodeTree
fillCodeTree (Parser.CodeTree rec) =
  if eq rec.name (NonEmptyString.nes (Proxy :: Proxy "add")) then
    Parser.CodeTree (rec { children = fillChildren (UInt.fromInt 2) rec.children })
  else
    Parser.CodeTree rec

fillChildren :: UInt.UInt -> Array Parser.CodeTree -> Array Parser.CodeTree
fillChildren size children =
  append
    (map fillCodeTree children)
    ( Array.replicate
        (sub (UInt.toInt size) (Array.length children))
        ( Parser.CodeTree
            { name: NonEmptyString.nes (Proxy :: Proxy "?")
            , nameRange: Range.rangeZero
            , children: []
            , range: Range.rangeZero
            }
        )
    )

need0Children ::
  Parser.CodeTree ->
  EvaluatedItem ->
  EvaluatedTree
need0Children (Parser.CodeTree { name, nameRange, children, range }) item =
  let
    evaluatedChildren =
      map
        ( \child ->
            codeTreeToEvaluatedTree
              ContextNormal
              child
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
  Context ->
  Parser.CodeTree ->
  (Maybe EvaluatedItem -> EvaluatedItem) ->
  EvaluatedTree
need1Children context (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> context
                  _ -> ContextNormal
              )
              child
        )
        children
  in
    EvaluatedTree
      { item: func (map evaluatedTreeGetItem (Array.index evaluatedChildren 0))
      , range: range
      , children: evaluatedChildren
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 1)
      , name
      , nameRange
      }

need2Children ::
  { firstContext :: Context, secondContext :: Context } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem, second :: Maybe EvaluatedItem } -> EvaluatedItem) ->
  EvaluatedTree
need2Children { firstContext, secondContext } (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> firstContext
                  1 -> secondContext
                  _ -> ContextNormal
              )
              child
        )
        children
  in
    EvaluatedTree
      { item:
          func
            { first: map evaluatedTreeGetItem (Array.index evaluatedChildren 0)
            , second: map evaluatedTreeGetItem (Array.index evaluatedChildren 1)
            }
      , range: range
      , children: evaluatedChildren
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 2)
      , name
      , nameRange
      }

need3Children ::
  { firstContext :: Context, secondContext :: Context, thirdContext :: Context } ->
  Parser.CodeTree ->
  ({ first :: Maybe EvaluatedItem, second :: Maybe EvaluatedItem, third :: Maybe EvaluatedItem } -> EvaluatedItem) ->
  EvaluatedTree
need3Children context (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case index of
                  0 -> context.firstContext
                  1 -> context.secondContext
                  2 -> context.thirdContext
                  _ -> ContextNormal
              )
              child
        )
        children
  in
    EvaluatedTree
      { item:
          func
            { first: map evaluatedTreeGetItem (Array.index evaluatedChildren 0)
            , second: map evaluatedTreeGetItem (Array.index evaluatedChildren 1)
            , third: map evaluatedTreeGetItem (Array.index evaluatedChildren 2)
            }
      , range: range
      , children: evaluatedChildren
      {- 期待した子要素の数 -}
      , expectedChildrenCount: Just (UInt.fromInt 3)
      , name
      , nameRange
      }
