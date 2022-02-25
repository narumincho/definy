module VsCodeExtension.Evaluate
  ( Error(..)
  , ErrorWithRange(..)
  , EvaluateResult(..)
  , errorToString
  , evaluate
  , evaluateResultGetValue
  , fillCodeTree
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

addErrorList :: Array ErrorWithRange -> EvaluateResult -> EvaluateResult
addErrorList newErrorList (EvaluateResult { value, errorList }) =
  EvaluateResult
    { value, errorList: append errorList newErrorList }

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
evaluate codeTree@(Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "add")) then
    addErrorList
      (childrenSuperfluousParameterErrorList (UInt.fromInt 2) children)
      ( addEvaluateResult
          (codeTreeGetChildEvaluateResult (UInt.fromInt 0) codeTree)
          (codeTreeGetChildEvaluateResult (UInt.fromInt 1) codeTree)
      )
  else case UInt.fromString (NonEmptyString.toString name) of
    Just value ->
      addErrorList
        (childrenSuperfluousParameterErrorList (UInt.fromInt 0) children)
        (EvaluateResult { value: Just value, errorList: [] })
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

childrenSuperfluousParameterErrorList :: UInt.UInt -> Array Parser.CodeTree -> Array ErrorWithRange
childrenSuperfluousParameterErrorList size children =
  map
    ( \(Parser.CodeTree { range }) ->
        ErrorWithRange
          { error: SuperfluousParameter, range }
    )
    (Array.drop (UInt.toInt size) children)

addEvaluateResult :: EvaluateResult -> EvaluateResult -> EvaluateResult
addEvaluateResult (EvaluateResult a) (EvaluateResult b) =
  EvaluateResult
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
