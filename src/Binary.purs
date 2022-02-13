module Binary
  ( Binary
  , append
  , empty
  , fromNodeBuffer
  , fromStringWriteAsUtf8
  , isEmpty
  , separateAt
  , toStringReadAsUtf8
  ) where

import Data.Function.Uncurried as FunctionUncurried
import Data.Maybe (Maybe)
import Data.Nullable as Nullable
import Data.UInt as UInt
import Node.Buffer as Buffer

-- | Data.ArrayBuffer の扱いがいまいちだったため別で作ってみる
foreign import data Binary :: Type

foreign import append :: Binary -> Binary -> Binary

foreign import separateAtImpl :: FunctionUncurried.Fn2 Binary Int { before :: Binary, after :: Binary }

foreign import toStringReadAsUtf8Impl :: Binary -> Nullable.Nullable String

separateAt :: Binary -> UInt.UInt -> { before :: Binary, after :: Binary }
separateAt binary index = FunctionUncurried.runFn2 separateAtImpl binary (UInt.toInt index)

toStringReadAsUtf8 :: Binary -> Maybe String
toStringReadAsUtf8 binary = Nullable.toMaybe (toStringReadAsUtf8Impl binary)

foreign import fromNodeBuffer :: Buffer.Buffer -> Binary

foreign import isEmpty :: Binary -> Boolean

foreign import fromStringWriteAsUtf8 :: String -> Binary

foreign import empty :: Binary
