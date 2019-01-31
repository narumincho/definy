module Utility.Map exposing (toMapper)

{-| getterとsetterからmapperを作る


# To Mapper

@docs toMapper

-}


toMapper : (big -> small) -> (small -> big -> big) -> (small -> small) -> big -> big
toMapper getter setter f big =
    big
        |> setter (f (getter big))
