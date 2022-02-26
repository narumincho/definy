module VsCodeExtension.Evaluate
  ( Error(..)
  , ErrorWithRange(..)
  , ParietalModule(..)
  , WithError
  , errorToString
  , evaluateExpr
  , evaluateModule
  , fillCodeTree
  , parietalModuleGetValue
  , withErrorResultGetErrorList
  , withErrorResultGetValue
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
mapWithError func (WithError rec) = WithError { errorList: rec.errorList, value: func rec.value }

newtype ErrorWithRange
  = ErrorWithRange
  { error :: Error, range :: Range.Range }

data Error
  = UnknownName
  | NeedParameter
  | SuperfluousParameter
  | NeedTopModule

errorToString :: Error -> String
errorToString = case _ of
  UnknownName -> "不明な名前です"
  NeedParameter -> "パラメーターが必要です"
  SuperfluousParameter -> "余計なパラメーターです"
  NeedTopModule -> "ファイル直下は module である必要がある"

newtype ParietalModule
  = ParietalModule
  { description :: Maybe String
  , value :: Maybe UInt.UInt
  }

parietalModuleGetValue :: ParietalModule -> Maybe UInt.UInt
parietalModuleGetValue (ParietalModule { value }) = value

evaluateModule :: Parser.CodeTree -> WithError ParietalModule
evaluateModule codeTree@(Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "module")) then
    addErrorList
      (childrenSuperfluousParameterErrorList (UInt.fromInt 2) children)
      ( mapWithError
          ( \value ->
              ParietalModule
                { description: Nothing
                , value
                }
          )
          (codeTreeGetChildEvaluateExpr (UInt.fromInt 1) codeTree)
      )
  else
    WithError
      { value: ParietalModule { description: Nothing, value: Nothing }
      , errorList: [ ErrorWithRange { error: NeedTopModule, range: nameRange } ]
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

codeTreeGetChild :: UInt.UInt -> Parser.CodeTree -> Tuple.Tuple (Array ErrorWithRange) (Maybe Parser.CodeTree)
codeTreeGetChild index (Parser.CodeTree { children, range }) = case Array.index children (UInt.toInt index) of
  Just child -> Tuple.Tuple [] (Just child)
  Nothing ->
    Tuple.Tuple
      [ ErrorWithRange
          { error: NeedParameter
          , range:
              Range.Range
                { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
                , end: Range.rangeEnd range
                }
          }
      ]
      Nothing

codeTreeGetChildEvaluateExpr :: UInt.UInt -> Parser.CodeTree -> WithError (Maybe UInt.UInt)
codeTreeGetChildEvaluateExpr index codeTree =
  let
    Tuple.Tuple errorList exprMaybe = codeTreeGetChild index codeTree
  in
    case exprMaybe of
      Just expr -> evaluateExpr expr
      Nothing ->
        WithError
          { value: Nothing
          , errorList
          }

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
