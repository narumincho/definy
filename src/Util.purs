module Util
  ( append3
  , class RowTraversable
  , encloseParenthesis
  , firstUppercase
  , firstUppercaseNonEmpty
  , groupBySize
  , isFirstUppercase
  , joinWithComma
  , joinWithCommaAndEncloseParenthesis
  , listUpdateAtOverAutoCreate
  , nonEmptyArrayGetAtLoop
  , numberToString
  , runParallelRecord
  , stringRepeat
  , toParallel
  , toParallelWithReturn
  , traverseRow
  , tupleListToJson
  , unknownValueToString
  ) where

import Prelude
import Control.Applicative as Applicative
import Control.Parallel as Parallel
import Data.Argonaut as Argonaut
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Int as Int
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Symbol as Symbol
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect.Aff as Aff
import Foreign.Object as Object
import Math as Math
import Prim.Row as Row
import Prim.RowList (RowList)
import Prim.RowList as PrimRowList
import Record as Record
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

class RowTraversable :: RowList Type -> Row Type -> Row Type -> (Type -> Type) -> (Type -> Type) -> Constraint
class RowTraversable list xs ys m f | list -> ys m where
  traverseRow :: (Proxy.Proxy list) -> (forall v. m v -> f v) -> Record xs -> f (Record ys)

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
    Record.insert (Proxy.Proxy :: _ key)
      <$> f (Record.get (Proxy.Proxy :: _ key) obj)
      <*> traverseRow (Proxy.Proxy :: _ tail) f obj

-- | レコードを並行実行する
runParallelRecord ::
  forall rowList mr r m f.
  PrimRowList.RowToList mr rowList =>
  RowTraversable rowList mr r m f =>
  Parallel.Parallel f m =>
  (Record mr) -> m (Record r)
runParallelRecord = Parallel.sequential <<< traverseRow (Proxy.Proxy :: Proxy.Proxy rowList) Parallel.parallel

stringRepeat :: UInt.UInt -> String -> String
stringRepeat count str = String.joinWith "" (Array.replicate (UInt.toInt count) str)

-- | ```purs
-- | numberToString 12.0 -- "12"
-- | ```
foreign import numberToString :: Number -> String

-- | `NonEmptyArray` の要素を ループした インデックスから取得する
-- | ```purs
-- | nonEmptyArrayGetAtLoop (NonEmptyArray.cons' "a" ["b", "c"]) (UInt.fromInt 0) -- "a"
-- | ```
nonEmptyArrayGetAtLoop :: forall a. NonEmptyArray a -> UInt.UInt -> a
nonEmptyArrayGetAtLoop nonEmptyArray index = case NonEmptyArray.index
    nonEmptyArray
    ( Int.floor
        ( Math.remainder
            (UInt.toNumber index)
            (Int.toNumber (NonEmptyArray.length nonEmptyArray))
        )
    ) of
  Just element -> element
  Nothing -> NonEmptyArray.head nonEmptyArray -- ここに来ることはない

tupleListToJson :: Array (Tuple.Tuple String Argonaut.Json) -> Argonaut.Json
tupleListToJson list = Argonaut.fromObject (Object.fromFoldable list)

append3 :: String -> String -> String -> String
append3 a b c =
  append
    (append a b)
    c

foreign import unknownValueToString :: forall a. a -> String

firstUppercase :: String -> String
firstUppercase text = case String.uncons text of
  Maybe.Just { head, tail } -> append (String.toUpper (String.singleton head)) tail
  Maybe.Nothing -> ""

isFirstUppercase :: String -> Boolean
isFirstUppercase text = eq text (firstUppercase text)

firstUppercaseNonEmpty :: NonEmptyString -> NonEmptyString
firstUppercaseNonEmpty text = case NonEmptyString.uncons text of
  { head, tail } ->
    NonEmptyString.appendString (NonEmptyString.toUpper (NonEmptyString.singleton head))
      ( case tail of
          Maybe.Just t -> NonEmptyString.toString t
          Nothing -> ""
      )

joinWithCommaAndEncloseParenthesis :: Array String -> String
joinWithCommaAndEncloseParenthesis value = encloseParenthesis (joinWithComma value)

encloseParenthesis :: String -> String
encloseParenthesis value = append3 "(" value ")"

joinWithComma :: Array String -> String
joinWithComma = String.joinWith ", "
