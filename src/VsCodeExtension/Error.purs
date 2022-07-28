module VsCodeExtension.Error
  ( Error(..)
  , ErrorWithRange(..)
  , errorToString
  , getErrorList
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.Range as Range
import VsCodeExtension.ToString as ToString

getErrorList :: Evaluate.EvaluatedTree -> Array ErrorWithRange
getErrorList tree@(Evaluate.EvaluatedTree { item, range }) = case item of
  EvaluatedItem.Module partialModule -> getErrorListLoop partialModule tree
  _ -> [ ErrorWithRange { error: RootNotModule, range } ]

getErrorListLoop :: EvaluatedItem.PartialModule -> Evaluate.EvaluatedTree -> Array ErrorWithRange
getErrorListLoop partialModule tree@(Evaluate.EvaluatedTree { item, name, nameRange, children, expectedInputType }) =
  Array.concat
    [ case expectedInputType of
        BuiltIn.InputTypeNormal expectedChildrenType ->
          getParameterError
            tree
            (UInt.fromInt (Array.length expectedChildrenType))
        BuiltIn.InputTypeRepeat _ -> []
    , case evaluatedItemGetError name partialModule item of
        Just error -> [ ErrorWithRange { error, range: nameRange } ]
        Nothing -> []
    , Prelude.bind children (getErrorListFromEvaluatedTreeChild partialModule)
    ]

evaluatedItemGetError ::
  String ->
  EvaluatedItem.PartialModule ->
  EvaluatedItem.EvaluatedItem ->
  Maybe Error
evaluatedItemGetError rawName partialModule = case _ of
  EvaluatedItem.Expr (EvaluatedItem.ExprPartReferenceInvalidName { name: partName }) ->
    Just
      (InvalidPartName partName)
  EvaluatedItem.Expr (EvaluatedItem.ExprPartReference { name }) -> case EvaluatedItem.findPart partialModule name of
    Just _ -> Nothing
    Nothing ->
      Just
        (UnknownPartName name)
  EvaluatedItem.UIntLiteral Nothing -> Just (UIntParseError rawName)
  EvaluatedItem.Float64Literal Nothing -> Just (Float64ParseError rawName)
  EvaluatedItem.NonEmptyTextLiteral Nothing -> Just NonEmptyStringEmptyError
  EvaluatedItem.Identifier Nothing -> Just (InvalidIdentifier rawName)
  _ -> Nothing

getErrorListFromEvaluatedTreeChild :: EvaluatedItem.PartialModule -> Evaluate.EvaluatedTreeChild -> Array ErrorWithRange
getErrorListFromEvaluatedTreeChild partialModule (Evaluate.EvaluatedTreeChild { child: child@(Evaluate.EvaluatedTree { range }), typeMisMatchMaybe }) =
  Prelude.append
    ( case typeMisMatchMaybe of
        Just (typeMismatch) ->
          [ ErrorWithRange
              { error: TypeMisMatchError typeMismatch, range }
          ]
        Nothing -> []
    )
    (getErrorListLoop partialModule child)

getParameterError :: Evaluate.EvaluatedTree -> UInt.UInt -> Array ErrorWithRange
getParameterError (Evaluate.EvaluatedTree { name, nameRange, range, children }) expectedChildrenCount = case Prelude.compare (Array.length children) (UInt.toInt expectedChildrenCount) of
  Prelude.LT ->
    [ ErrorWithRange
        { error:
            NeedParameter
              { name
              , nameRange
              , actual: UInt.fromInt (Array.length children)
              , expect: expectedChildrenCount
              }
        , range:
            Range.Range
              { start: Range.positionSub1Character (Range.rangeEnd range)
              , end: Range.rangeEnd range
              }
        }
    ]
  Prelude.EQ -> []
  Prelude.GT ->
    Prelude.map
      ( \(Evaluate.EvaluatedTreeChild { child: Evaluate.EvaluatedTree { range: parameterRange } }) ->
          ErrorWithRange
            { error:
                SuperfluousParameter
                  { name
                  , nameRange: nameRange
                  , expect: expectedChildrenCount
                  }
            , range: parameterRange
            }
      )
      (Array.drop (UInt.toInt expectedChildrenCount) children)

newtype ErrorWithRange
  = ErrorWithRange
  { error :: Error, range :: Range.Range }

data Error
  = InvalidPartName String
  | UnknownPartName Identifier.Identifier
  | NeedParameter
    { name :: String
    , nameRange :: Range.Range
    , expect :: UInt.UInt
    , actual :: UInt.UInt
    }
  | SuperfluousParameter
    { name :: String
    , nameRange :: Range.Range
    , expect :: UInt.UInt
    }
  | UIntParseError String
  | Float64ParseError String
  | NonEmptyStringEmptyError
  | TypeMisMatchError Evaluate.TypeMisMatch
  | InvalidIdentifier String
  | RootNotModule

errorToString :: Error -> NonEmptyString
errorToString = case _ of
  InvalidPartName name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "は不正なパーツ名です"
  UnknownPartName name ->
    NonEmptyString.appendString
      (Identifier.identifierToNonEmptyString false name)
      "が見つかりませんでした"
  NeedParameter rec ->
    NonEmptyString.appendString
      (ToString.escapeName rec.name)
      ( String.joinWith
          ""
          [ "には"
          , UInt.toString rec.expect
          , "個のパラメーターが必要ですが"
          , UInt.toString rec.actual
          , "個のパラメーターしか渡されませんでした. あと残り"
          , UInt.toString (Prelude.sub rec.expect rec.actual)
          , "個のパラメーターが必要です"
          ]
      )
  SuperfluousParameter rec ->
    NonEmptyString.appendString
      (NonEmptyString.nes (Proxy :: Proxy "このパラメーターは余計です. "))
      ( String.joinWith
          ""
          [ ""
          , NonEmptyString.toString (ToString.escapeName rec.name)
          , "には"
          , UInt.toString rec.expect
          , "個のパラメーターがあれば充分です"
          ]
      )
  UIntParseError name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "はUInt としてパースできませんでした"
  Float64ParseError name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "Float64 としてパースできませんでした"
  NonEmptyStringEmptyError -> NonEmptyString.nes (Proxy :: Proxy "nonEmptyText には 空ではない文字列を指定する必要があります")
  TypeMisMatchError (Evaluate.TypeMisMatch { actual, expect }) ->
    NonEmptyString.prependString
      ( String.joinWith ""
          [ ToString.noPositionTreeToString (BuiltIn.builtInTypeToNoPositionTree expect)
          , "を期待したが"
          , ToString.noPositionTreeToString (BuiltIn.builtInTypeToNoPositionTree actual)
          ]
      )
      (NonEmptyString.nes (Proxy :: Proxy "が渡された"))
  InvalidIdentifier name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "は識別子として不正です. 識別子は 正規表現 ^[a-z][a-zA-Z0-9]{0,63}$ を満たさす必要があります"
  RootNotModule -> (NonEmptyString.nes (Proxy :: Proxy "直下がモジュールではありません"))
