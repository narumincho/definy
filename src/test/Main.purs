module Test.Main (main) where

import Prelude
import Data.Maybe as Maybe
import Data.UInt as UInt
import Effect as Effect
import Test.Assert as Assert
import Util as Util

main :: Effect.Effect Unit
main = do
  listUpdateAtOverAutoCreateInline
  listUpdateAtOverAutoCreateFirst
  listUpdateAtOverAutoCreateLast
  listUpdateAtOverAutoCreateAutoCreate
  groupBySize2

listUpdateAtOverAutoCreateInline :: Effect.Effect Unit
listUpdateAtOverAutoCreateInline =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 1)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one!", "two", "three" ]
    }

listUpdateAtOverAutoCreateFirst :: Effect.Effect Unit
listUpdateAtOverAutoCreateFirst =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 0)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero!", "one", "two", "three" ]
    }

listUpdateAtOverAutoCreateLast :: Effect.Effect Unit
listUpdateAtOverAutoCreateLast =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 3)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one", "two", "three!" ]
    }

listUpdateAtOverAutoCreateAutoCreate :: Effect.Effect Unit
listUpdateAtOverAutoCreateAutoCreate =
  Assert.assertEqual
    { actual:
        Util.listUpdateAtOverAutoCreate
          [ "zero", "one", "two", "three" ]
          (UInt.fromInt 6)
          ( case _ of
              Maybe.Just item -> append item "!"
              Maybe.Nothing -> "new"
          )
          "fill"
    , expected: [ "zero", "one", "two", "three", "fill", "fill", "new" ]
    }

groupBySize2 :: Effect.Effect Unit
groupBySize2 =
  Assert.assertEqual
    { actual: Util.groupBySize (UInt.fromInt 2) [ 0, 1, 2, 3, 4 ]
    , expected: [ [ 0, 1 ], [ 2, 3 ], [ 4 ] ]
    }
