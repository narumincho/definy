module CreativeRecord.Messgae
  ( Message(..)
  ) where

import CreativeRecord.Location as Location
import Data.Maybe (Maybe)

data Message
  = CountUp
  | ChangeLocation (Maybe Location.Location)
