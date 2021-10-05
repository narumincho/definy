module Util where

import Data.Array as Array
import Data.Maybe as Maybe
import Data.Ord as Ord
import Prelude as Prelude
import Data.Tuple as Tuple

listUpdateAtOverAutoCreate :: forall e. Array e -> Int -> (Maybe.Maybe e -> e) -> e -> Array e
listUpdateAtOverAutoCreate list index func fillElement = case Array.index list index of
  Maybe.Just element ->
    let
      beforeAndAfter = Array.splitAt index list
    in
      Array.concat
        [ beforeAndAfter.before
        , [ func (Maybe.Just element) ]
        , beforeAndAfter.after
        ]
  Maybe.Nothing ->
    if Ord.lessThanOrEq (Array.length list) index then
      Array.concat
        [ list
        , Array.replicate (Prelude.sub index (Array.length list)) fillElement
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
group :: forall t. Array t -> (t -> Int -> Int) -> Array (Array t)
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
    (Array.mapWithIndex Tuple.Tuple list)

groupBySize :: forall t. Array t -> Int -> Array (Array t)
groupBySize list size =
  if Ord.lessThan size 0 then
    []
  else
    group list (\_ i -> (Prelude.div i size))
