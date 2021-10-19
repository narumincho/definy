module Util
  ( listUpdateAtOverAutoCreate
  , groupBySize
  , toParallel
  , tupleListToJson
  , jsonFromNonEmptyString
  ) where

import Control.Parallel as Parallel
import Data.Argonaut.Core as ArgonautCore
import Data.Array as Array
import Data.Maybe as Maybe
import Data.Ord as Ord
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect.Aff as Aff
import Foreign.Object as Object
import Prelude as Prelude

listUpdateAtOverAutoCreate :: forall e. Array e -> UInt.UInt -> (Maybe.Maybe e -> e) -> e -> Array e
listUpdateAtOverAutoCreate list index func fillElement = case Array.index list (UInt.toInt index) of
  Maybe.Just element ->
    let
      beforeAndAfter = Array.splitAt (UInt.toInt index) list
    in
      Array.concat
        [ beforeAndAfter.before
        , [ func (Maybe.Just element) ]
        , Maybe.maybe [] Prelude.identity (Array.tail beforeAndAfter.after)
        ]
  Maybe.Nothing ->
    if Ord.lessThanOrEq (Array.length list) (UInt.toInt index) then
      Array.concat
        [ list
        , Array.replicate (Prelude.sub (UInt.toInt index) (Array.length list)) fillElement
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
groupBySize size list = group list (\_ i -> (Prelude.div i size))

-- | 並列実行する
toParallel :: Array (Aff.Aff Prelude.Unit) -> Aff.Aff Prelude.Unit
toParallel list = Prelude.map (\_ -> Prelude.unit) (Parallel.parSequence list)

tupleListToJson :: Array (Tuple.Tuple String ArgonautCore.Json) -> ArgonautCore.Json
tupleListToJson list = ArgonautCore.fromObject (Object.fromFoldable list)

jsonFromNonEmptyString :: NonEmptyString.NonEmptyString -> ArgonautCore.Json
jsonFromNonEmptyString nonEmptyString =
  ArgonautCore.fromString
    (NonEmptyString.toString nonEmptyString)
