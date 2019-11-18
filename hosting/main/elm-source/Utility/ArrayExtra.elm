module Utility.ArrayExtra exposing (setLength)

import Array


{-| 配列の長さを変更する
足りない分は指定した要素で補い、多かった分は末尾の方を捨てる
-}
setLength : Int -> a -> Array.Array a -> Array.Array a
setLength length fillElement array =
    if length < Array.length array then
        array |> Array.slice 0 length

    else
        setLength length fillElement (Array.append array (Array.fromList [ fillElement ]))
