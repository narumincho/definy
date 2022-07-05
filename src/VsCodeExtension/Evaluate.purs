module VsCodeExtension.Evaluate
  ( EvaluateExprResult(..)
  , EvaluatedTree(..)
  , EvaluatedTreeChild(..)
  , Pattern(..)
  , TypeMisMatch(..)
  , Value(..)
  , codeTreeToEvaluatedTreeIContextNormal
  , evaluateExpr
  , evaluatedTreeChildGetItem
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
import VsCodeExtension.EvaluatedItem (PartialExpr(..))
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range

newtype EvaluatedTree
  = EvaluatedTree
  { item :: EvaluatedItem.EvaluatedItem
  , range :: Range.Range
  , children :: Array EvaluatedTreeChild
  , expectedInputType :: BuiltIn.InputType
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
  = TypeMisMatch { expect :: BuiltIn.BuiltInType, actual :: BuiltIn.BuiltInType }

compareType :: Maybe BuiltIn.BuiltInType -> EvaluatedTree -> Maybe TypeMisMatch
compareType expectMaybe tree = case expectMaybe of
  Nothing -> Nothing
  Just expect ->
    let
      actual = EvaluatedItem.toBuiltInType (evaluatedTreeGetItem tree)
    in
      if BuiltIn.builtInTypeMatch expect actual then
        Nothing
      else
        Just (TypeMisMatch { expect, actual })

newtype EvaluateExprResult
  = EvaluateExprResult { value :: Value, dummy :: Boolean }

data Value
  = ValueUInt UInt.UInt
  | ValueText String
  | ValueNonEmptyText NonEmptyString
  | ValueFloat64 Number
  | ValueTypeBody (Array Pattern)
  | ValuePattern Pattern

newtype Pattern
  = Pattern
  { name :: Identifier.Identifier, description :: String }

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
  EvaluatedItem.ExprTypeBodySum patternList ->
    EvaluateExprResult
      { value:
          ValueTypeBody
            ( Array.mapMaybe
                ( case _ of
                    ExprPattern { name: Just name, description } ->
                      Just
                        ( Pattern
                            { name, description }
                        )
                    _ -> Nothing
                )
                patternList
            )
      , dummy: false
      }
  EvaluatedItem.ExprPattern { name, description } -> case name of
    Just nameIdentifier ->
      EvaluateExprResult
        { value: ValuePattern (Pattern { name: nameIdentifier, description })
        , dummy: false
        }
    Nothing ->
      EvaluateExprResult
        { value:
            ValuePattern
              ( Pattern
                  { name: Identifier.fromSymbolProxy (Proxy :: Proxy "tag")
                  , description
                  }
              )
        , dummy: true
        }

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

codeTreeToEvaluatedTree :: Maybe BuiltIn.BuiltInType -> Parser.CodeTree -> EvaluatedTreeChild
codeTreeToEvaluatedTree treeType codeTree =
  let
    tree = case treeType of
      Just BuiltIn.Description -> codeTreeToEvaluatedTreeInContextDescription codeTree
      Just BuiltIn.UIntLiteral -> codeTreeToEvaluatedTreeInContextUIntLiteral codeTree
      Just BuiltIn.TextLiteral -> codeTreeToEvaluatedTreeInContextTextLiteral codeTree
      Just BuiltIn.NonEmptyTextLiteral -> codeTreeToEvaluatedTreeInContextNonEmptyTextLiteral codeTree
      Just BuiltIn.Float64Literal -> codeTreeToEvaluatedTreeInContextFloat64Literal codeTree
      Just BuiltIn.Identifier -> codeTreeToEvaluatedTreeInContextIdentifier codeTree
      _ -> codeTreeToEvaluatedTreeIContextNormal codeTree
  in
    EvaluatedTreeChild
      { child: tree
      , typeMisMatchMaybe: compareType treeType tree
      }

codeTreeToEvaluatedTreeIContextNormal :: Parser.CodeTree -> EvaluatedTree
codeTreeToEvaluatedTreeIContextNormal codeTree@(Parser.CodeTree { name, nameRange, range, children }) =
  if equalName name BuiltIn.moduleBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.moduleBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Module
            ( EvaluatedItem.PartialModule
                { description:
                    case Array.index childrenEvaluatedItem 0 of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , partList:
                    case Array.index childrenEvaluatedItem 1 of
                      Just (EvaluatedItem.ModuleBody partList) -> partList
                      _ -> []
                }
            )
      )
  else if equalName name BuiltIn.bodyBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.bodyBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.ModuleBody
            ( Array.mapMaybe
                ( \child -> case child of
                    (EvaluatedItem.Part part) -> Just part
                    _ -> Nothing
                )
                childrenEvaluatedItem
            )
      )
  else if equalName name BuiltIn.typeBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.typeBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Type
            ( EvaluatedItem.PartialType
                { name:
                    case Array.index childrenEvaluatedItem 0 of
                      Just (EvaluatedItem.Identifier partName) -> partName
                      _ -> Nothing
                , description:
                    case Array.index childrenEvaluatedItem 1 of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , expr:
                    case Array.index childrenEvaluatedItem 2 of
                      Just (EvaluatedItem.Expr value) -> Just value
                      _ -> Nothing
                }
            )
      )
  else if equalName name BuiltIn.partBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.partBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Part
            ( EvaluatedItem.PartialPart
                { name:
                    case Array.index childrenEvaluatedItem 0 of
                      Just (EvaluatedItem.Identifier partName) -> partName
                      _ -> Nothing
                , description:
                    case Array.index childrenEvaluatedItem 1 of
                      Just (EvaluatedItem.Description description) -> description
                      _ -> ""
                , expr:
                    case Array.index childrenEvaluatedItem 2 of
                      Just (EvaluatedItem.Expr value) -> Just value
                      _ -> Nothing
                }
            )
      )
  else if equalName name BuiltIn.addBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.addBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Expr
            ( EvaluatedItem.ExprAdd
                { a: maybeEvaluatedItemToMaybeExpr (Array.index childrenEvaluatedItem 0)
                , b: maybeEvaluatedItemToMaybeExpr (Array.index childrenEvaluatedItem 1)
                }
            )
      )
  else if equalName name BuiltIn.uintBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.uintBuiltIn)
      codeTree
      ( \childrenEvaluatedItem -> case Array.index childrenEvaluatedItem 0 of
          Just (EvaluatedItem.UIntLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprUIntLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprUIntLiteral Nothing)
      )
  else if equalName name BuiltIn.textBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.textBuiltIn)
      codeTree
      ( \childrenEvaluatedItem -> case Array.index childrenEvaluatedItem 0 of
          Just (EvaluatedItem.TextLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprTextLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprTextLiteral "")
      )
  else if equalName name BuiltIn.nonEmptyTextBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.nonEmptyTextBuiltIn)
      codeTree
      ( \childrenEvaluatedItem -> case Array.index childrenEvaluatedItem 0 of
          Just (EvaluatedItem.NonEmptyTextLiteral child) -> EvaluatedItem.Expr (EvaluatedItem.ExprNonEmptyTextLiteral child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprNonEmptyTextLiteral Nothing)
      )
  else if equalName name BuiltIn.float64BuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.float64BuiltIn)
      codeTree
      ( \childrenEvaluatedItem -> case Array.index childrenEvaluatedItem 0 of
          Just (EvaluatedItem.Float64Literal child) -> EvaluatedItem.Expr (EvaluatedItem.ExprFloat64Literal child)
          _ -> EvaluatedItem.Expr (EvaluatedItem.ExprFloat64Literal Nothing)
      )
  else if equalName name BuiltIn.typeBodySumBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.typeBodySumBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Expr
            ( EvaluatedItem.ExprTypeBodySum
                ( Array.mapMaybe
                    ( case _ of
                        EvaluatedItem.Expr expr -> Just expr
                        _ -> Nothing
                    )
                    childrenEvaluatedItem
                )
            )
      )
  else if equalName name BuiltIn.patternBuiltIn then
    needNChildren
      (BuiltIn.buildInGetInputType BuiltIn.patternBuiltIn)
      codeTree
      ( \childrenEvaluatedItem ->
          EvaluatedItem.Expr
            ( EvaluatedItem.ExprPattern
                { name:
                    case Array.index childrenEvaluatedItem 0 of
                      Just (EvaluatedItem.Identifier nameIdentifier) -> nameIdentifier
                      _ -> Nothing
                , description:
                    case Array.index childrenEvaluatedItem 1 of
                      Just (EvaluatedItem.Description value) -> value
                      _ -> ""
                }
            )
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
      , expectedInputType: BuiltIn.InputTypeNormal []
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
      , expectedInputType: BuiltIn.InputTypeNormal []
      , name
      , nameRange
      }

needNChildren ::
  BuiltIn.InputType ->
  Parser.CodeTree ->
  (Array EvaluatedItem.EvaluatedItem -> EvaluatedItem.EvaluatedItem) ->
  EvaluatedTree
needNChildren expectedType (Parser.CodeTree { name, nameRange, children, range }) func =
  let
    evaluatedChildren :: Array EvaluatedTreeChild
    evaluatedChildren =
      Array.mapWithIndex
        ( \index child ->
            codeTreeToEvaluatedTree
              ( case expectedType of
                  BuiltIn.InputTypeNormal typeList -> Array.index typeList index
                  BuiltIn.InputTypeRepeat builtInType -> Just builtInType
              )
              child
        )
        children
  in
    EvaluatedTree
      { item:
          func (map evaluatedTreeChildGetItem evaluatedChildren)
      , range: range
      , children: evaluatedChildren
      , expectedInputType: expectedType
      , name
      , nameRange
      }
