module VsCodeExtension.Evaluate
  ( Error(..)
  , ErrorWithRange(..)
  , EvaluateResult(..)
  , errorToString
  , evaluate
  , evaluateResultGetValue
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Type.Proxy (Proxy(..))
import VsCodeExtension.Parser as Parser
import VsCodeExtension.Range as Range

newtype EvaluateResult
  = EvaluateResult
  { value :: Maybe UInt.UInt
  , errorList :: Array ErrorWithRange
  }

evaluateResultGetValue :: EvaluateResult -> Maybe UInt.UInt
evaluateResultGetValue (EvaluateResult { value }) = value

newtype ErrorWithRange
  = ErrorWithRange
  { error :: Error, range :: Range.Range }

data Error
  = UnknownName
  | NeedParameter
  | SuperfluousParameter

errorToString :: Error -> String
errorToString = case _ of
  UnknownName -> "不明な名前です"
  NeedParameter -> "パラメーターが必要です"
  SuperfluousParameter -> "余計なパラメーターです"

evaluate :: Parser.CodeTree -> EvaluateResult
evaluate codeTree@(Parser.CodeTree { name, nameRange }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "add")) then
    addEvaluateResult
      (codeTreeGetChildEvaluateResult (UInt.fromInt 0) codeTree)
      (codeTreeGetChildEvaluateResult (UInt.fromInt 1) codeTree)
  else case UInt.fromString (NonEmptyString.toString name) of
    Just value -> EvaluateResult { value: Just value, errorList: [] }
    Nothing ->
      EvaluateResult
        { value: Nothing
        , errorList:
            [ ErrorWithRange { error: UnknownName, range: nameRange } ]
        }

codeTreeGetChildEvaluateResult :: UInt.UInt -> Parser.CodeTree -> EvaluateResult
codeTreeGetChildEvaluateResult index (Parser.CodeTree { children, range }) = case Array.index children (UInt.toInt index) of
  Just child -> evaluate child
  Nothing ->
    EvaluateResult
      { value: Nothing
      , errorList:
          [ ErrorWithRange
              { error: NeedParameter
              , range:
                  Range.Range
                    { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
                    , end: Range.rangeEnd range
                    }
              }
          ]
      }

addEvaluateResult :: EvaluateResult -> EvaluateResult -> EvaluateResult
addEvaluateResult (EvaluateResult a) (EvaluateResult b) =
  EvaluateResult
    { value:
        case Tuple.Tuple a.value b.value of
          Tuple.Tuple (Just aValue) (Just bValue) -> Just (add aValue bValue)
          Tuple.Tuple _ _ -> Nothing
    , errorList: append a.errorList b.errorList
    }
