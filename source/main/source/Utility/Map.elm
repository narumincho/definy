module Utility.Map exposing
    ( toMapper
    , toMapperGetterMaybe
    )

{-| getterとsetterからmapperを作る


# To Mapper

@docs toMapper

-}


toMapper : (big -> small) -> (small -> big -> big) -> (small -> small) -> big -> big
toMapper getter setter f big =
    big
        |> setter (f (getter big))


toMapperGetterMaybe : (big -> Maybe small) -> (small -> big -> big) -> (small -> small) -> big -> big
toMapperGetterMaybe getter setter f big =
    case big |> getter of
        Just value ->
            big |> setter (f value)

        Nothing ->
            big
