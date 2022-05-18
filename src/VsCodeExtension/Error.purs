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
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range
import VsCodeExtension.ToString as ToString

getErrorList :: Evaluate.EvaluatedTree -> Array ErrorWithRange
getErrorList tree@(Evaluate.EvaluatedTree { item, name, nameRange, children, expectedChildrenTypeMaybe }) =
  Array.concat
    [ case expectedChildrenTypeMaybe of
        Just expectedChildrenType ->
          getParameterError
            tree
            (UInt.fromInt (Array.length expectedChildrenType))
        Nothing -> []
    , case evaluatedItemGetError name item of
        Just error ->
          [ ErrorWithRange { error, range: nameRange }
          ]
        Nothing -> []
    , Prelude.bind children getErrorListFromEvaluatedTreeChild
    ]

evaluatedItemGetError :: String -> Evaluate.EvaluatedItem -> Maybe Error
evaluatedItemGetError name = case _ of
  Evaluate.Expr (Evaluate.ExprPartReferenceInvalidName { name: partName }) ->
    Just
      (InvalidPartName partName)
  Evaluate.UIntLiteral Nothing -> Just (UIntParseError name)
  Evaluate.Identifier Nothing -> Just (InvalidIdentifier name)
  _ -> Nothing

getErrorListFromEvaluatedTreeChild :: Evaluate.EvaluatedTreeChild -> Array ErrorWithRange
getErrorListFromEvaluatedTreeChild (Evaluate.EvaluatedTreeChild { child: child@(Evaluate.EvaluatedTree { range }), typeMisMatchMaybe }) =
  Prelude.append
    ( case typeMisMatchMaybe of
        Just (typeMismatch) ->
          [ ErrorWithRange
              { error: TypeMisMatchError typeMismatch, range }
          ]
        Nothing -> []
    )
    (getErrorList child)

getParameterError :: Evaluate.EvaluatedTree -> UInt.UInt -> Array ErrorWithRange
getParameterError (Evaluate.EvaluatedTree { name, nameRange, range, children }) expectedChildrenCount = case Prelude.compare (Array.length children) (UInt.toInt expectedChildrenCount) of
  Prelude.LT ->
    [ ErrorWithRange
        { error:
            NeedParameter
              { name
              , nameRange
              , actual: UInt.fromInt (Array.length children)
              , expect: UInt.fromInt 1
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
  | TypeMisMatchError Evaluate.TypeMisMatch
  | InvalidIdentifier String

errorToString :: Error -> NonEmptyString
errorToString = case _ of
  InvalidPartName name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "は不正なパーツ名です"
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
  TypeMisMatchError (Evaluate.TypeMisMatch { actual, expect }) ->
    NonEmptyString.appendString
      (treeTypeToString expect)
      ( String.joinWith ""
          [ "を期待したが", NonEmptyString.toString (treeTypeToString actual), "が渡された" ]
      )
  InvalidIdentifier name ->
    NonEmptyString.appendString
      (ToString.escapeName name)
      "は識別子として不正です. 識別子は 正規表現 ^[a-z][a-zA-Z0-9]{0,63}$ を満たさす必要があります"

treeTypeToString :: Evaluate.TreeType -> NonEmptyString
treeTypeToString = case _ of
  Evaluate.TreeTypeModule -> NonEmptyString.nes (Proxy :: Proxy "Module")
  Evaluate.TreeTypeDescription -> NonEmptyString.nes (Proxy :: Proxy "Description")
  Evaluate.TreeTypeModuleBody -> NonEmptyString.nes (Proxy :: Proxy "ModuleBody")
  Evaluate.TreeTypePart -> NonEmptyString.nes (Proxy :: Proxy "Part")
  Evaluate.TreeTypeExpr -> NonEmptyString.nes (Proxy :: Proxy "Expr")
  Evaluate.TreeTypeUIntLiteral -> NonEmptyString.nes (Proxy :: Proxy "UIntLiteral")
  Evaluate.TreeTypeTextLiteral -> NonEmptyString.nes (Proxy :: Proxy "TextLiteral")
  Evaluate.TreeTypeFloat64Literal -> NonEmptyString.nes (Proxy :: Proxy "Float64Literal")
  Evaluate.TreeTypeIdentifier -> NonEmptyString.nes (Proxy :: Proxy "Identifier")
