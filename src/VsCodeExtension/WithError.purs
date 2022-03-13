module VsCodeExtension.WithError
  ( Error(..)
  , ErrorWithRange(..)
  , WithError
  , addErrorList
  , create
  , createNoError
  , errorToString
  , toWithErrorArray
  , map
  , toWithErrorTuple
  , withErrorAndThen
  , getErrorList
  , getValue
  ) where

import Prelude as Prelude
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import VsCodeExtension.Range as Range

create :: forall v. v -> Array ErrorWithRange -> WithError v
create value errorList = WithError { value, errorList }

createNoError :: forall v. v -> WithError v
createNoError value = WithError { value, errorList: [] }

getValue :: forall v. WithError v -> v
getValue (WithError { value }) = value

getErrorList :: forall v. WithError v -> Array ErrorWithRange
getErrorList (WithError { errorList }) = errorList

addErrorList :: forall t. Array ErrorWithRange -> WithError t -> WithError t
addErrorList newErrorList (WithError rec) =
  WithError
    (rec { errorList = Prelude.append newErrorList rec.errorList })

newtype WithError v
  = WithError { errorList :: Array ErrorWithRange, value :: v }

map :: forall a b. (a -> b) -> WithError a -> WithError b
map func (WithError rec) =
  WithError
    { errorList: rec.errorList, value: func rec.value }

toWithErrorArray :: forall a. Array (WithError a) -> WithError (Array a)
toWithErrorArray withErrorList =
  WithError
    { errorList: Prelude.bind withErrorList getErrorList
    , value: Prelude.map getValue withErrorList
    }

toWithErrorTuple ::
  forall a b.
  (WithError a) ->
  (WithError b) ->
  WithError (Tuple.Tuple a b)
toWithErrorTuple a b =
  WithError
    { value: Tuple.Tuple (getValue a) (getValue b)
    , errorList:
        Prelude.append
          (getErrorList a)
          (getErrorList b)
    }

withErrorAndThen :: forall a b. (a -> WithError b) -> WithError a -> WithError b
withErrorAndThen func (WithError rec) =
  let
    result = func rec.value
  in
    WithError
      { errorList: Prelude.append rec.errorList (getErrorList result)
      , value: getValue result
      }

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
