module Data.TimeZoneAndName exposing (TimeZoneAndName, from, getTimeZone, getTimeZoneName)

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
