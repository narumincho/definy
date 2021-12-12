module CreativeRecord.State
  ( State
  , getCount
  , getLocation
  , initState
  , update
  ) where

import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import Data.Maybe (Maybe(..))
import Prelude as Prelude

newtype State
  = State
  { count :: Int
  , location :: Maybe Location.Location
  }

initState :: Maybe Location.Location -> State
initState location =
  State
    { count: 0
    , location
    }

update :: Message.Message -> State -> State
update = case _ of
  Message.CountUp -> (\(State rec) -> State (rec { count = Prelude.add rec.count 1 }))
  Message.ChangeLocation location ->
    ( \(State rec) ->
        State (rec { location = location })
    )

getLocation :: State -> Maybe Location.Location
getLocation (State { location }) = location

getCount :: State -> Int
getCount (State { count }) = count
