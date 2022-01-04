module CreativeRecord.Message
  ( Message(..)
  ) where

import CreativeRecord.Location as Location

data Message
  = CountUp
  | ChangeLocation Location.Location
