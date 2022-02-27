module VsCodeExtension.Evaluate
  ( Error(..)
  , ErrorWithRange(..)
  , PartialModule(..)
  , PartialPart(..)
  , WithError
  , errorToString
  , evaluateExpr
  , evaluateModule
  , fillCodeTree
  , partialModuleGetPartialPartList
  , withErrorResultGetErrorList
  , withErrorResultGetValue
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Type.Proxy (Proxy(..))
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range

withErrorResultGetValue :: forall v. WithError v -> v
withErrorResultGetValue (WithError { value }) = value

withErrorResultGetErrorList :: forall v. WithError v -> Array ErrorWithRange
withErrorResultGetErrorList (WithError { errorList }) = errorList

addErrorList :: forall t. Array ErrorWithRange -> WithError t -> WithError t
addErrorList newErrorList (WithError rec) =
  WithError
    (rec { errorList = append newErrorList rec.errorList })

newtype WithError v
  = WithError { errorList :: Array ErrorWithRange, value :: v }

mapWithError :: forall a b. (a -> b) -> WithError a -> WithError b
mapWithError func (WithError rec) =
  WithError
    { errorList: rec.errorList, value: func rec.value }

flatWithError :: forall a. Array (WithError a) -> WithError (Array a)
flatWithError withErrorList =
  WithError
    { errorList: bind withErrorList withErrorResultGetErrorList
    , value: map withErrorResultGetValue withErrorList
    }

andThenWithError :: forall a b. (a -> WithError b) -> WithError a -> WithError b
andThenWithError func (WithError rec) =
  let
    result = func rec.value
  in
    WithError
      { errorList: append rec.errorList (withErrorResultGetErrorList result)
      , value: withErrorResultGetValue result
      }

newtype ErrorWithRange
  = ErrorWithRange
  { error :: Error, range :: Range.Range }

data Error
  = UnknownName
  | NeedParameter
  | SuperfluousParameter
  | NeedTopModule
  | NeedBody
  | NeedPart

errorToString :: Error -> String
errorToString = case _ of
  UnknownName -> "不明な名前です"
  NeedParameter -> "パラメーターが必要です"
  SuperfluousParameter -> "余計なパラメーターです"
  NeedTopModule -> "ファイル直下は module である必要がある"
  NeedBody -> "module(説明文 body()) の body でない"
  NeedPart -> "module(説明文 body(part())) の part でない"

newtype PartialModule
  = PartialModule
  { description :: Maybe String
  , value :: Array PartialPart
  }

newtype PartialPart
  = PartialPart
  { name :: Maybe NonEmptyString
  , description :: Maybe String
  , value :: Maybe UInt.UInt
  , range :: Range.Range
  }

partialModuleGetPartialPartList :: PartialModule -> Array PartialPart
partialModuleGetPartialPartList (PartialModule { value }) = value

evaluateModule :: Parser.CodeTree -> WithError PartialModule
evaluateModule codeTree@(Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "module")) then
    addErrorList
      (childrenSuperfluousParameterErrorList (UInt.fromInt 2) children)
      ( mapWithError
          ( \value ->
              PartialModule
                { description: Nothing
                , value
                }
          )
          ( andThenWithError
              ( case _ of
                  Just body -> evaluatePartList body
                  Nothing -> WithError { value: [], errorList: [] }
              )
              (codeTreeGetChild (UInt.fromInt 1) codeTree)
          )
      )
  else
    WithError
      { value: PartialModule { description: Nothing, value: [] }
      , errorList: [ ErrorWithRange { error: NeedTopModule, range: nameRange } ]
      }

evaluatePartList :: Parser.CodeTree -> WithError (Array PartialPart)
evaluatePartList (Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "body")) then
    ( flatWithError
        (map evaluatePart children)
    )
  else
    WithError
      { value: []
      , errorList: [ ErrorWithRange { error: NeedBody, range: nameRange } ]
      }

evaluatePart :: Parser.CodeTree -> WithError PartialPart
evaluatePart codeTree@(Parser.CodeTree { name, nameRange, children, range }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "part")) then
    addErrorList
      (childrenSuperfluousParameterErrorList (UInt.fromInt 3) children)
      ( mapWithError
          ( \value ->
              PartialPart
                { name: Nothing
                , description: Nothing
                , range
                , value
                }
          )
          (codeTreeGetChildEvaluateExpr (UInt.fromInt 2) codeTree)
      )
  else
    WithError
      { value:
          PartialPart
            { name: Nothing
            , description: Nothing
            , value: Nothing
            , range
            }
      , errorList: [ ErrorWithRange { error: NeedBody, range: nameRange } ]
      }

evaluateExpr :: Parser.CodeTree -> WithError (Maybe UInt.UInt)
evaluateExpr codeTree@(Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "add")) then
    addErrorList
      (childrenSuperfluousParameterErrorList (UInt.fromInt 2) children)
      ( addEvaluateResult
          (codeTreeGetChildEvaluateExpr (UInt.fromInt 0) codeTree)
          (codeTreeGetChildEvaluateExpr (UInt.fromInt 1) codeTree)
      )
  else case UInt.fromString (NonEmptyString.toString name) of
    Just value ->
      addErrorList
        (childrenSuperfluousParameterErrorList (UInt.fromInt 0) children)
        (WithError { value: Just value, errorList: [] })
    Nothing ->
      WithError
        { value: Nothing
        , errorList:
            [ ErrorWithRange { error: UnknownName, range: nameRange } ]
        }

codeTreeGetChild :: UInt.UInt -> Parser.CodeTree -> WithError (Maybe Parser.CodeTree)
codeTreeGetChild index (Parser.CodeTree { children, range }) = case Array.index children (UInt.toInt index) of
  Just child -> WithError { errorList: [], value: Just child }
  Nothing ->
    WithError
      { errorList:
          [ ErrorWithRange
              { error: NeedParameter
              , range:
                  Range.Range
                    { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
                    , end: Range.rangeEnd range
                    }
              }
          ]
      , value: Nothing
      }

codeTreeGetChildEvaluateExpr :: UInt.UInt -> Parser.CodeTree -> WithError (Maybe UInt.UInt)
codeTreeGetChildEvaluateExpr index codeTree =
  andThenWithError
    ( case _ of
        Just expr -> evaluateExpr expr
        Nothing ->
          WithError
            { value: Nothing
            , errorList: []
            }
    )
    (codeTreeGetChild index codeTree)

childrenSuperfluousParameterErrorList :: UInt.UInt -> Array Parser.CodeTree -> Array ErrorWithRange
childrenSuperfluousParameterErrorList size children =
  map
    ( \(Parser.CodeTree { range }) ->
        ErrorWithRange
          { error: SuperfluousParameter, range }
    )
    (Array.drop (UInt.toInt size) children)

addEvaluateResult :: WithError (Maybe UInt.UInt) -> WithError (Maybe UInt.UInt) -> WithError (Maybe UInt.UInt)
addEvaluateResult (WithError a) (WithError b) =
  WithError
    { value:
        case Tuple.Tuple a.value b.value of
          Tuple.Tuple (Just aValue) (Just bValue) -> Just (add aValue bValue)
          Tuple.Tuple _ _ -> Nothing
    , errorList: append a.errorList b.errorList
    }

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
