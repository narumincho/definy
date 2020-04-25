module Data.TimeZoneAndName exposing (TimeZoneAndName, from, getTimeZone, getTimeZoneName, isFresh, timeToPosix)

import Data
import Time


type TimeZoneAndName
    = TimeZoneAndName { zoneName : Time.ZoneName, zone : Time.Zone }


from : Time.ZoneName -> Time.Zone -> TimeZoneAndName
from zoneName zone =
    TimeZoneAndName
        { zoneName = zoneName
        , zone = zone
        }


getTimeZoneName : TimeZoneAndName -> String
getTimeZoneName (TimeZoneAndName record) =
    case record.zoneName of
        Time.Name name ->
            name

        Time.Offset int ->
            String.fromInt int


getTimeZone : TimeZoneAndName -> Time.Zone
getTimeZone (TimeZoneAndName record) =
    record.zone


timeToPosix : Data.Time -> Time.Posix
timeToPosix time =
    Time.millisToPosix (time.day * 1000 * 60 * 60 * 24 + time.millisecond)


{-| リソースがまだ新しいか調べる
-}
isFresh : Int -> Time.Posix -> Data.Time -> Bool
isFresh millisecondsThatCanBeConsideredFresh nowTime getTime =
    Time.posixToMillis nowTime < Time.posixToMillis (timeToPosix getTime) + millisecondsThatCanBeConsideredFresh
