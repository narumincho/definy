module Util
  ( class RowTraversable
  , groupBySize
  , jsonFromNonEmptyString
  , listUpdateAtOverAutoCreate
  , numberToString
  , optionRecordToMaybeRecord
  , runParallelRecord
  , stringRepeat
  , toParallel
  , toParallelWithReturn
  , traverseRow
  , tupleListToJson
  ) where

import Prelude
import Control.Applicative as Applicative
import Control.Parallel as Parallel
import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Maybe as Maybe
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Symbol as Symbol
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect.Aff as Aff
import Foreign.Object as Object
import Option as Option
import Prim.Row as Row
import Prim.RowList (RowList)
import Prim.RowList as PrimRowList
import Record as Record
import Type.Data.RowList as RowList
import Type.Proxy as Proxy

listUpdateAtOverAutoCreate :: forall e. Array e -> UInt.UInt -> (Maybe.Maybe e -> e) -> e -> Array e
listUpdateAtOverAutoCreate list index func fillElement = case Array.index list (UInt.toInt index) of
  Maybe.Just element ->
    let
      beforeAndAfter = Array.splitAt (UInt.toInt index) list
    in
      Array.concat
        [ beforeAndAfter.before
        , [ func (Maybe.Just element) ]
        , Maybe.maybe [] identity (Array.tail beforeAndAfter.after)
        ]
  Maybe.Nothing ->
    if Ord.lessThanOrEq (Array.length list) (UInt.toInt index) then
      Array.concat
        [ list
        , Array.replicate (sub (UInt.toInt index) (Array.length list)) fillElement
        , [ func Maybe.Nothing ]
        ]
    else
      list

-- | 配列をグループ分けする
-- | https://qiita.com/nagtkk/items/e1cc3f929b61b1882bd1
-- |
-- | groupIndexFunc: グループ番号(外側の配列のインデックス)を返す関数
-- |
-- | ```purs
-- | scatter(["a", "bb", "c", "ddd"], (text)=>text.length) // [[],["a", "c"], ["bb"], ["ddd"]]
-- | ````
group :: forall t. Array t -> (t -> UInt.UInt -> UInt.UInt) -> Array (Array t)
group list groupIndexFunc =
  Array.foldl
    ( \result (Tuple.Tuple index cur) ->
        listUpdateAtOverAutoCreate
          result
          (groupIndexFunc cur index)
          ( \itemMaybe -> case itemMaybe of
              Maybe.Just item -> Array.concat [ item, [ cur ] ]
              Maybe.Nothing -> [ cur ]
          )
          []
    )
    []
    (Array.mapWithIndex (\i e -> Tuple.Tuple (UInt.fromInt i) e) list)

groupBySize :: forall t. UInt.UInt -> Array t -> Array (Array t)
groupBySize size list = group list (\_ i -> (div i size))

-- | Aff を 並列実行する
toParallel :: Array (Aff.Aff Unit) -> Aff.Aff Unit
toParallel list = map (\_ -> unit) (Parallel.parSequence list)

-- | Aff を 並列実行する. 返ってきた値を使う
toParallelWithReturn :: forall e. Array (Aff.Aff e) -> Aff.Aff (Array e)
toParallelWithReturn list = Parallel.parSequence list

tupleListToJson :: Array (Tuple.Tuple String ArgonautCore.Json) -> ArgonautCore.Json
tupleListToJson list = ArgonautCore.fromObject (Object.fromFoldable list)

jsonFromNonEmptyString :: NonEmptyString.NonEmptyString -> ArgonautCore.Json
jsonFromNonEmptyString nonEmptyString =
  ArgonautCore.fromString
    (NonEmptyString.toString nonEmptyString)

class RowTraversable :: RowList Type -> Row Type -> Row Type -> (Type -> Type) -> (Type -> Type) -> Constraint
class RowTraversable list xs ys m f | list -> ys m where
  traverseRow :: (RowList.RLProxy list) -> (forall v. m v -> f v) -> Record xs -> f (Record ys)

instance rowTraversableNil ::
  Applicative.Applicative f =>
  RowTraversable PrimRowList.Nil xs () m f where
  traverseRow _ _ _ = Applicative.pure {}

instance rowTraversableCons ::
  ( Symbol.IsSymbol key
  , Row.Cons key (m a) xs' xs
  , Row.Cons key a ys' ys
  , Row.Lacks key ys'
  , RowTraversable tail xs ys' m f
  , Applicative.Applicative f
  ) =>
  RowTraversable (PrimRowList.Cons key (m a) tail) xs ys m f where
  traverseRow _ f obj =
    Record.insert (Symbol.SProxy :: _ key)
      <$> f (Record.get (Symbol.SProxy :: _ key) obj)
      <*> traverseRow (RowList.RLProxy :: _ tail) f obj

-- | レコードを並行実行する
runParallelRecord ::
  forall rowList mr r m f.
  PrimRowList.RowToList mr rowList =>
  RowTraversable rowList mr r m f =>
  Parallel.Parallel f m =>
  (Record mr) -> m (Record r)
runParallelRecord = Parallel.sequential <<< traverseRow (RowList.RLProxy :: RowList.RLProxy rowList) Parallel.parallel

optionRecordToMaybeRecord ::
  forall (optionRecord :: Row Type) (maybeRecord :: Row Type) (required :: Row Type) (optional :: Row Type).
  Option.FromRecord optionRecord required optional =>
  Option.ToRecord required optional maybeRecord =>
  Proxy.Proxy required ->
  Proxy.Proxy optional ->
  Record optionRecord ->
  Record maybeRecord
optionRecordToMaybeRecord _ _ optionRecord =
  Option.recordToRecord
    ( Option.recordFromRecord optionRecord ::
        Option.Record required optional
    )

stringRepeat :: UInt.UInt -> String -> String
stringRepeat count str = String.joinWith "" (Array.replicate (UInt.toInt count) str)

-- | ```purs
-- | numberToString 12.0 -- "12"
-- | ```
foreign import numberToString :: Number -> String
