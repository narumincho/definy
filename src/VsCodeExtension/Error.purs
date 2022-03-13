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
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range

getErrorList :: Evaluate.EvaluatedTree -> Array ErrorWithRange
getErrorList tree@(Evaluate.EvaluatedTree { children, expectedChildrenCount: expectedChildrenCountMaybe }) =
  Prelude.append
    ( case expectedChildrenCountMaybe of
        Just expectedChildrenCount -> getParameterError tree expectedChildrenCount
        Nothing -> []
    )
    (Prelude.bind children getErrorList)

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
              { start: Range.positionOneCharacterLeft (Range.rangeEnd range)
              , end: Range.rangeEnd range
              }
        }
    ]
  Prelude.EQ -> []
  Prelude.GT ->
    Prelude.map
      ( \(Evaluate.EvaluatedTree { range: parameterRange }) ->
          ErrorWithRange
            { error:
                SuperfluousParameter
                  { name
                  , nameRange: nameRange
                  , expect: UInt.fromInt 1
                  }
            , range: parameterRange
            }
      )
      (Array.drop (UInt.toInt expectedChildrenCount) children)

newtype ErrorWithRange
  = ErrorWithRange
  { error :: Error, range :: Range.Range }

data Error
  = UnknownName
  | NeedParameter
    { name :: NonEmptyString
    , nameRange :: Range.Range
    , expect :: UInt.UInt
    , actual :: UInt.UInt
    }
  | SuperfluousParameter
    { name :: NonEmptyString
    , nameRange :: Range.Range
    , expect :: UInt.UInt
    }
  | NeedTopModule
  | NeedBody
  | NeedPart
  | UIntParseError

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
      , UInt.toString (Prelude.sub rec.expect rec.actual)
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
  UIntParseError -> "UInt としてパースできませんでした"
