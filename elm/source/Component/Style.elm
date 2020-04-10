module Component.Style exposing
    ( GutterMsg(..)
    , activeColor
    , codeFontTypeface
    , fontHack
    , fontHackName
    , horizontalGutter
    , normalText
    , normalTypeface
    , sameLanguageLink
    , stretchText
    , tabContainer
    , textColorStyle
    , timeView
    , verticalGutter
    )

{-| Definyで使うUIのパネルを定義する
-}

import Css
import Data
import Data.TimeZoneAndName
import Data.UrlData
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
import SubModel
import Time
import Ui


{-| 基本的な文字色(#ddd rgb(221,221,221))を設定する
-}
textColorStyle : Css.Style
textColorStyle =
    Css.color (Css.rgb 221 221 221)


{-| 選択していることを表す色
-}
activeColor : Css.Color
activeColor =
    Css.rgb 240 153 54


{-| パネルの幅を変更するためにつかむところ | ガター
-}
verticalGutter : Bool -> Html.Styled.Html ()
verticalGutter isResizing =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            (if isResizing then
                [ Css.width (Css.px 2)
                , Css.flexShrink Css.zero
                , Css.after
                    [ Css.property "content" (Css.qt "")
                    , Css.display Css.block
                    , Css.height (Css.pct 100)
                    , Css.width (Css.px 6)
                    , Css.position Css.relative
                    , Css.left (Css.px -2)
                    , Css.zIndex (Css.int 10)
                    , Css.backgroundColor (Css.rgb 255 255 255)
                    ]
                ]

             else
                [ Css.width (Css.px 2)
                , Css.backgroundColor (Css.rgb 68 68 68)
                , Css.flexShrink Css.zero
                , Css.hover
                    [ Css.backgroundColor (Css.rgb 102 102 102) ]
                , Css.after
                    [ Css.property "content" (Css.qt "")
                    , Css.cursor Css.ewResize
                    , Css.display Css.block
                    , Css.height (Css.pct 100)
                    , Css.width (Css.px 12)
                    , Css.position Css.relative
                    , Css.left (Css.px -5)
                    , Css.zIndex (Css.int 10)
                    ]
                ]
            )
        , Html.Styled.Events.onMouseDown ()
        ]
        []


type GutterMsg
    = GutterMsgPointerEnter
    | GutterMsgPointerLeave
    | GutterMsgToResizeMode Ui.Pointer


{-| パネルの高さを変更するためにつかむところ - ガター
-}
horizontalGutter : Bool -> Html.Styled.Html ()
horizontalGutter isResizing =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            (if isResizing then
                [ Css.height (Css.px 2)
                , Css.flexShrink Css.zero
                , Css.after
                    [ Css.property "content" (Css.qt "")
                    , Css.display Css.block
                    , Css.width (Css.pct 100)
                    , Css.height (Css.px 6)
                    , Css.position Css.relative
                    , Css.top (Css.px -2)
                    , Css.zIndex (Css.int 10)
                    , Css.backgroundColor (Css.rgb 255 255 255)
                    ]
                ]

             else
                [ Css.height (Css.px 2)
                , Css.backgroundColor (Css.rgb 68 68 68)
                , Css.flexShrink Css.zero
                , Css.hover
                    [ Css.backgroundColor (Css.rgb 102 102 102) ]
                , Css.after
                    [ Css.property "content" (Css.qt "")
                    , Css.display Css.block
                    , Css.width (Css.pct 100)
                    , Css.height (Css.px 12)
                    , Css.position Css.relative
                    , Css.top (Css.px -5)
                    , Css.zIndex (Css.int 10)
                    ]
                ]
            )
        , Html.Styled.Events.onMouseDown ()
        ]
        []


normalTypeface : String
normalTypeface =
    "'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ Pro W3', メイリオ, Meiryo, 'ＭＳ Ｐゴシック', sans-serif"


{-| よく使うテキスト. 文字サイズ,表示する文字を指定する. パネルのサイズは文字の大きさや量によって変わる
-}
normalText : Int -> String -> Ui.Panel message
normalText size text =
    Ui.text
        []
        (Ui.TextAttributes
            { text = text
            , typeface = normalTypeface
            , size = size
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )


{-| 横方向に広がるテキスト. テキスト自体は左詰め
-}
stretchText : Int -> String -> Ui.Panel message
stretchText size text =
    Ui.text
        [ Ui.width Ui.stretch ]
        (Ui.TextAttributes
            { text = text
            , typeface = normalTypeface
            , size = size
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignStart
            }
        )


{-| 同じ言語のページへのリンク
-}
sameLanguageLink : List Ui.Style -> SubModel.SubModel -> Data.Location -> Ui.Panel message -> Ui.Panel message
sameLanguageLink styleList subModel location =
    Ui.link
        styleList
        (Data.UrlData.urlDataToUrl
            { clientMode = SubModel.getClientMode subModel
            , language = SubModel.getLanguage subModel
            , location = location
            }
        )


codeFontTypeface : String
codeFontTypeface =
    "Hack"


timeView : Maybe Data.TimeZoneAndName.TimeZoneAndName -> Data.Time -> Ui.Panel message
timeView timeZoneAndNameMaybe time =
    let
        posix =
            timeToPosix time
    in
    case timeZoneAndNameMaybe of
        Just timeZoneAndName ->
            Ui.column
                []
                [ Ui.row [ Ui.gap 8 ]
                    [ normalText 12 (Data.TimeZoneAndName.getTimeZoneName timeZoneAndName)
                    , Ui.row [ Ui.gap 4 ]
                        (timeToTimeTermList (Data.TimeZoneAndName.getTimeZone timeZoneAndName) posix
                            |> List.map
                                (\timeTerm ->
                                    case timeTerm of
                                        Number term ->
                                            Ui.text
                                                []
                                                (Ui.TextAttributes
                                                    { text = term
                                                    , typeface = normalTypeface
                                                    , size = 16
                                                    , letterSpacing = 0
                                                    , color = Css.rgb 200 200 200
                                                    , textAlignment = Ui.TextAlignEnd
                                                    }
                                                )

                                        Sign term ->
                                            Ui.text
                                                []
                                                (Ui.TextAttributes
                                                    { text = term
                                                    , typeface = normalTypeface
                                                    , size = 12
                                                    , letterSpacing = 0
                                                    , color = Css.rgb 160 160 160
                                                    , textAlignment = Ui.TextAlignEnd
                                                    }
                                                )
                                )
                        )
                    ]
                , Ui.text
                    [ Ui.width Ui.stretch ]
                    (Ui.TextAttributes
                        { text = utcTimeToString posix
                        , typeface = normalTypeface
                        , size = 12
                        , letterSpacing = 0
                        , color = Css.rgb 100 100 100
                        , textAlignment = Ui.TextAlignEnd
                        }
                    )
                ]

        Nothing ->
            normalText 16 (utcTimeToString posix)


timeToPosix : Data.Time -> Time.Posix
timeToPosix time =
    Time.millisToPosix (time.day * 1000 * 60 * 60 * 24 + time.millisecond)


utcTimeToString : Time.Posix -> String
utcTimeToString posix =
    String.concat
        [ String.fromInt (Time.toYear Time.utc posix)
        , "-"
        , monthToString (Time.toMonth Time.utc posix)
        , "-"
        , String.padLeft 2 '0' (String.fromInt (Time.toDay Time.utc posix))
        , "T"
        , String.padLeft 2 '0' (String.fromInt (Time.toHour Time.utc posix))
        , ":"
        , String.padLeft 2 '0' (String.fromInt (Time.toMinute Time.utc posix))
        , ":"
        , String.padLeft 2 '0' (String.fromInt (Time.toSecond Time.utc posix))
        , "."
        , String.padLeft 3 '0' (String.fromInt (Time.toMillis Time.utc posix))
        , "Z"
        ]


timeToTimeTermList : Time.Zone -> Time.Posix -> List TimeTerm
timeToTimeTermList zone posix =
    [ Number (String.fromInt (Time.toYear zone posix))
    , Sign "/"
    , Number (monthToString (Time.toMonth zone posix))
    , Sign "/"
    , Number (String.padLeft 2 '0' (String.fromInt (Time.toDay zone posix)))
    , Sign ""
    , Number (String.padLeft 2 '0' (String.fromInt (Time.toHour zone posix)))
    , Sign ":"
    , Number (String.padLeft 2 '0' (String.fromInt (Time.toMinute zone posix)))
    , Sign ":"
    , Number (String.padLeft 2 '0' (String.fromInt (Time.toSecond zone posix)))
    , Sign "."
    , Number (String.padLeft 3 '0' (String.fromInt (Time.toMillis zone posix)))
    ]


type TimeTerm
    = Number String
    | Sign String


monthToString : Time.Month -> String
monthToString month =
    case month of
        Time.Jan ->
            "01"

        Time.Feb ->
            "02"

        Time.Mar ->
            "03"

        Time.Apr ->
            "04"

        Time.May ->
            "05"

        Time.Jun ->
            "06"

        Time.Jul ->
            "07"

        Time.Aug ->
            "08"

        Time.Sep ->
            "09"

        Time.Oct ->
            "10"

        Time.Nov ->
            "11"

        Time.Dec ->
            "12"


tabContainer : a -> List ( a, String ) -> Html.Styled.Html a
tabContainer selected allValues =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.property "display" "grid"
            , Css.boxShadow4 Css.zero (Css.px 2) (Css.px 4) (Css.rgba 0 0 0 0.4)
            , Css.position Css.relative
            , Css.property "grid-template-columns"
                (List.repeat (List.length allValues) "1fr"
                    |> String.join " "
                )
            ]
        ]
        (allValues |> List.map (tabItem selected))


tabItem : a -> ( a, String ) -> Html.Styled.Html a
tabItem selected ( item, text ) =
    Html.Styled.button
        [ Html.Styled.Attributes.css
            [ Css.padding (Css.px 8)
            , Css.textAlign Css.center
            , Css.borderBottom3
                (Css.px 2)
                Css.solid
                (if item == selected then
                    Css.rgb 78 201 176

                 else
                    Css.rgba 0 0 0 0
                )
            , Css.color
                (if item == selected then
                    Css.rgb 238 238 238

                 else
                    Css.rgb 204 204 204
                )
            , Css.hover
                [ Css.backgroundColor (Css.rgb 17 17 17)
                , textColorStyle
                ]
            ]
        , Html.Styled.Events.stopPropagationOn "click" (Json.Decode.succeed ( item, True ))
        ]
        [ Html.Styled.text text ]


fontHack : Css.Style
fontHack =
    let
        font =
            Css.sansSerif
    in
    Css.fontFamily { font | value = fontHackName }


fontHackName : String
fontHackName =
    "Hack"
