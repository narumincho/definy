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
  , withErrorAndThen
  , withErrorResultGetErrorList
  , withErrorResultGetValue
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
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

withErrorMap :: forall a b. (a -> b) -> WithError a -> WithError b
withErrorMap func (WithError rec) =
  WithError
    { errorList: rec.errorList, value: func rec.value }

flatWithError :: forall a. Array (WithError a) -> WithError (Array a)
flatWithError withErrorList =
  WithError
    { errorList: bind withErrorList withErrorResultGetErrorList
    , value: map withErrorResultGetValue withErrorList
    }

withErrorAndThen :: forall a b. (a -> WithError b) -> WithError a -> WithError b
withErrorAndThen func (WithError rec) =
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
  | NeedParameter { name :: NonEmptyString, expect :: UInt.UInt, actual :: UInt.UInt }
  | SuperfluousParameter { name :: NonEmptyString, expect :: UInt.UInt }
  | NeedTopModule
  | NeedBody
  | NeedPart

errorToString :: Error -> String
errorToString = case _ of
  UnknownName -> "不明な名前です"
  NeedParameter rec ->
    String.joinWith
      ""
      [ NonEmptyString.toString rec.name
      , "には"
      , UInt.toString rec.expect
      , "個のパラメーターが必要ですが"
      , UInt.toString rec.actual
      , "個のパラメーターしか渡されませんでした. あと残り"
      , UInt.toString (rec.expect - rec.actual)
      , "個のパラメーターが必要です"
      ]
  SuperfluousParameter rec ->
    String.joinWith ""
      [ "このパラメーターは余計です. "
      , NonEmptyString.toString rec.name
      , "には"
      , UInt.toString rec.expect
      , "個のパラメーターがあれば充分です"
      ]
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
evaluateModule codeTree@(Parser.CodeTree { name, nameRange }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "module")) then
    get2Children
      codeTree
      ( \{ second } ->
          ( case second of
              Just body ->
                withErrorMap
                  ( \value ->
                      PartialModule
                        { description: Nothing, value }
                  )
                  (evaluatePartList body)
              Nothing ->
                WithError
                  { value:
                      PartialModule
                        { description: Nothing
                        , value: []
                        }
                  , errorList: []
                  }
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
evaluatePart codeTree@(Parser.CodeTree { name, nameRange, range }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "part")) then
    get3Children
      codeTree
      ( \{ third } ->
          let
            valueAndError = case third of
              Just t -> evaluateExpr t
              Nothing -> WithError { errorList: [], value: Nothing }
          in
            WithError
              { errorList: withErrorResultGetErrorList valueAndError
              , value:
                  PartialPart
                    { name: Nothing
                    , description: Nothing
                    , range
                    , value: withErrorResultGetValue valueAndError
                    }
              }
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
evaluateExpr codeTree@(Parser.CodeTree { name, nameRange }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "add")) then
    get2Children
      codeTree
      ( case _ of
          { first: Just fist, second: Just second } -> addEvaluateResult (evaluateExpr fist) (evaluateExpr second)
          { first: Nothing, second: Just second } -> evaluateExpr second
          { first: Just first, second: Nothing } -> evaluateExpr first
          { first: Nothing, second: Nothing } -> WithError { value: Nothing, errorList: [] }
      )
  else case UInt.fromString (NonEmptyString.toString name) of
    Just value -> WithError { value: Just value, errorList: [] }
    Nothing ->
      WithError
        { value: Nothing
        , errorList:
            [ ErrorWithRange { error: UnknownName, range: nameRange } ]
        }

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

get2Children ::
  forall a.
  Parser.CodeTree ->
  ({ first :: Maybe Parser.CodeTree, second :: Maybe Parser.CodeTree } -> WithError a) ->
  WithError a
get2Children (Parser.CodeTree { name, children, range }) func =
  addErrorList
    ( case compare (Array.length children) 2 of
        LT ->
          [ ErrorWithRange
              { error:
                  NeedParameter
                    { name
                    , actual: UInt.fromInt (Array.length children)
                    , expect: UInt.fromInt 2
                    }
              , range:
                  Range.Range
                    { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
                    , end: Range.rangeEnd range
                    }
              }
          ]
        EQ -> []
        GT ->
          map
            ( \(Parser.CodeTree { range: parameterRange }) ->
                ErrorWithRange
                  { error: SuperfluousParameter { name, expect: UInt.fromInt 2 }
                  , range: parameterRange
                  }
            )
            (Array.drop 2 children)
    )
    (func { first: Array.index children 0, second: Array.index children 1 })

get3Children ::
  forall a.
  Parser.CodeTree ->
  ( { first :: Maybe Parser.CodeTree
    , second :: Maybe Parser.CodeTree
    , third :: Maybe Parser.CodeTree
    } ->
    WithError a
  ) ->
  WithError a
get3Children (Parser.CodeTree { name, children, range }) func =
  addErrorList
    ( case compare (Array.length children) 3 of
        LT ->
          [ ErrorWithRange
              { error:
                  NeedParameter
                    { name
                    , actual: UInt.fromInt (Array.length children)
                    , expect: UInt.fromInt 3
                    }
              , range:
                  Range.Range
                    { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
                    , end: Range.rangeEnd range
                    }
              }
          ]
        EQ -> []
        GT ->
          map
            ( \(Parser.CodeTree { range: parameterRange }) ->
                ErrorWithRange
                  { error: SuperfluousParameter { name, expect: UInt.fromInt 3 }
                  , range: parameterRange
                  }
            )
            (Array.drop 3 children)
    )
    ( func
        { first: Array.index children 0
        , second: Array.index children 1
        , third: Array.index children 2
        }
    )
