module Float
  ( Float64RawData(..)
  , Value(..)
  , float64RawDataToString
  , numberToFloatRawData
  ) where

import Prelude
import Binary as Binary
import Data.Generic.Rep as GenericRep
import Data.Number (isNaN)
import Data.Show.Generic as ShowGeneric

newtype Float64RawData
  = Float64RawData
  { isPositive :: Boolean, extra :: Value, binary :: Binary.Binary }

data Value
  = NaN
  | Infinity
  | Normal

derive instance genericRepValue :: GenericRep.Generic Value _

instance showBuiltInType :: Show Value where
  show = ShowGeneric.genericShow

float64RawDataToString :: Float64RawData -> String
float64RawDataToString (Float64RawData rec) = (show (Binary.toArrayUInt rec.binary))

numberToFloatRawData :: Number -> Float64RawData
numberToFloatRawData v =
  Float64RawData
    { isPositive: v >= 0.0
    , extra:
        if isNaN v then
          NaN
        else
          Normal
    , binary:
        Binary.fromFloat64 v
    }
