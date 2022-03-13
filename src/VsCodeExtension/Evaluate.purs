module VsCodeExtension.Evaluate
  ( PartialModule(..)
  , PartialPart(..)
  , evaluateExpr
  , evaluateModule
  , fillCodeTree
  , partialModuleGetPartialPartList
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
import VsCodeExtension.WithError as WithError

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

evaluateModule :: Parser.CodeTree -> WithError.WithError PartialModule
evaluateModule codeTree@(Parser.CodeTree { name, nameRange }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "module")) then
    get2Children
      codeTree
      ( \{ second } ->
          ( case second of
              Just body ->
                WithError.map
                  ( \value ->
                      PartialModule
                        { description: Nothing, value }
                  )
                  (evaluatePartList body)
              Nothing ->
                WithError.createNoError
                  ( PartialModule
                      { description: Nothing
                      , value: []
                      }
                  )
          )
      )
  else
    WithError.create
      (PartialModule { description: Nothing, value: [] })
      [ WithError.ErrorWithRange { error: WithError.NeedTopModule, range: nameRange } ]

evaluatePartList :: Parser.CodeTree -> WithError.WithError (Array PartialPart)
evaluatePartList (Parser.CodeTree { name, nameRange, children }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "body")) then
    ( WithError.toWithErrorArray
        (map evaluatePart children)
    )
  else
    WithError.create
      []
      [ WithError.ErrorWithRange { error: WithError.NeedBody, range: nameRange } ]

evaluatePart :: Parser.CodeTree -> WithError.WithError PartialPart
evaluatePart codeTree@(Parser.CodeTree { name, nameRange, range }) =
  if eq name (NonEmptyString.nes (Proxy :: Proxy "part")) then
    get3Children
      codeTree
      ( \{ third } ->
          WithError.map
            ( \value ->
                PartialPart
                  { name: Nothing
                  , description: Nothing
                  , range
                  , value
                  }
            )
            ( case third of
                Just t -> evaluateExpr t
                Nothing -> WithError.createNoError Nothing
            )
      )
  else
    WithError.create
      ( PartialPart
          { name: Nothing
          , description: Nothing
          , value: Nothing
          , range
          }
      )
      [ WithError.ErrorWithRange { error: WithError.NeedPart, range: nameRange } ]

evaluateExpr :: Parser.CodeTree -> WithError.WithError (Maybe UInt.UInt)
evaluateExpr codeTree@(Parser.CodeTree { name, nameRange }) = case NonEmptyString.toString name of
  "add" ->
    get2Children
      codeTree
      ( case _ of
          { first: Just fist, second: Just second } ->
            addEvaluateResult
              (evaluateExpr fist)
              (evaluateExpr second)
          { first: Nothing, second: Just second } -> evaluateExpr second
          { first: Just first, second: Nothing } -> evaluateExpr first
          { first: Nothing, second: Nothing } -> WithError.createNoError Nothing
      )
  "uint" ->
    get1Children
      codeTree
      ( case _ of
          Just child -> evaluateUInt child
          Nothing -> WithError.createNoError Nothing
      )
  _ ->
    WithError.create
      Nothing
      [ WithError.ErrorWithRange { error: WithError.UnknownName, range: nameRange } ]

evaluateUInt :: Parser.CodeTree -> WithError.WithError (Maybe UInt.UInt)
evaluateUInt (Parser.CodeTree { name, nameRange }) = case UInt.fromString (NonEmptyString.toString name) of
  Just value -> WithError.createNoError (Just value)
  Nothing ->
    WithError.create
      Nothing
      [ WithError.ErrorWithRange { error: WithError.UIntParseError, range: nameRange } ]

addEvaluateResult ::
  WithError.WithError (Maybe UInt.UInt) ->
  WithError.WithError (Maybe UInt.UInt) ->
  WithError.WithError (Maybe UInt.UInt)
addEvaluateResult a b =
  WithError.map
    ( case _ of
        Tuple.Tuple (Just aValue) (Just bValue) -> Just (add aValue bValue)
        Tuple.Tuple _ _ -> Nothing
    )
    (WithError.toWithErrorTuple a b)

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

get1Children ::
  forall a.
  Parser.CodeTree ->
  (Maybe Parser.CodeTree -> WithError.WithError a) ->
  WithError.WithError a
get1Children (Parser.CodeTree { name, nameRange, children, range }) func =
  WithError.addErrorList
    ( case compare (Array.length children) 1 of
        LT ->
          [ WithError.ErrorWithRange
              { error:
                  WithError.NeedParameter
                    { name
                    , nameRange: nameRange
                    , actual: UInt.fromInt (Array.length children)
                    , expect: UInt.fromInt 1
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
                WithError.ErrorWithRange
                  { error:
                      WithError.SuperfluousParameter
                        { name
                        , nameRange: nameRange
                        , expect: UInt.fromInt 1
                        }
                  , range: parameterRange
                  }
            )
            (Array.drop 1 children)
    )
    (func (Array.index children 0))

get2Children ::
  forall a.
  Parser.CodeTree ->
  ({ first :: Maybe Parser.CodeTree, second :: Maybe Parser.CodeTree } -> WithError.WithError a) ->
  WithError.WithError a
get2Children (Parser.CodeTree { name, nameRange, children, range }) func =
  WithError.addErrorList
    ( case compare (Array.length children) 2 of
        LT ->
          [ WithError.ErrorWithRange
              { error:
                  WithError.NeedParameter
                    { name
                    , nameRange: nameRange
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
                WithError.ErrorWithRange
                  { error:
                      WithError.SuperfluousParameter
                        { name
                        , nameRange: nameRange
                        , expect: UInt.fromInt 2
                        }
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
    WithError.WithError a
  ) ->
  WithError.WithError a
get3Children (Parser.CodeTree { name, nameRange, children, range }) func =
  WithError.addErrorList
    ( case compare (Array.length children) 3 of
        LT ->
          [ WithError.ErrorWithRange
              { error:
                  WithError.NeedParameter
                    { name
                    , nameRange
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
                WithError.ErrorWithRange
                  { error:
                      WithError.SuperfluousParameter
                        { name
                        , nameRange
                        , expect: UInt.fromInt 3
                        }
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
