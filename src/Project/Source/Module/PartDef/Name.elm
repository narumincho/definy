module Project.Source.Module.PartDef.Name exposing
    ( Name(..)
    , SafeName
    , fromLabel
    , noName
    , safeNameToString
    , safeNamefromLabel
    , toString
    )

import Project.Label as Label


{-| 定義の中の名前。名無しも含めることができる
-}
type Name
    = NoName
    | SafeName SafeName


{-| 定義の中の名前のうち、名無しを含めることができないもの。
候補に使える
-}
type SafeName
    = SafeName_ Label.Label


{-| 名前を指定しない
-}
noName : Name
noName =
    NoName


{-| LabelからNameをつくる
-}
fromLabel : Label.Label -> Name
fromLabel =
    safeNamefromLabel >> SafeName


{-| LabelからSafeNameをつくる
-}
safeNamefromLabel : Label.Label -> SafeName
safeNamefromLabel =
    SafeName_


{-| (デバッグ用)名前を文字列で表現
名無しの場合は[NO NAME]になる
-}
toString : Name -> String
toString name =
    case name of
        NoName ->
            "[NO NAME]"

        SafeName safeName ->
            safeNameToString safeName


{-| 名前を文字列で表現
-}
safeNameToString : SafeName -> String
safeNameToString (SafeName_ label) =
    Label.toSmallString label
