module Math where

-- | Computes the remainder after division, wrapping Javascript's `%` operator.
foreign import remainder :: Number -> Number -> Number
