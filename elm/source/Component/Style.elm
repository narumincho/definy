module Component.Style exposing
    ( GutterMsg(..)
    , activeColor
    , codeFontTypeface
    , fontHack
    , fontHackName
    , horizontalGutter
    , link
    , normalText
    , normalTypeface
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
import Data.UrlData
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
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


link : List Ui.Style -> Data.UrlData -> Ui.Panel message -> Ui.Panel message
link styleList urlData =
    Ui.link
        styleList
        (Data.UrlData.urlDataToUrl urlData)


codeFontTypeface : String
codeFontTypeface =
    "Hack"


timeView : Time.Zone -> Data.Time -> Ui.Panel message
timeView zone time =
    let
        posix =
            Time.millisToPosix (time.day * 1000 * 60 * 60 * 24 + time.millisecond)
    in
    normalText 16
        (timeToString zone posix
            ++ (if zone == Time.utc then
                    "(UTC)"

                else
                    ""
               )
        )


timeToString : Time.Zone -> Time.Posix -> String
timeToString zone posix =
    String.concat
        [ String.fromInt (Time.toYear zone posix)
        , "-"
        , monthToString (Time.toMonth zone posix)
        , "-"
        , String.padLeft 2 '0' (String.fromInt (Time.toDay zone posix))
        , "T"
        , String.padLeft 2 '0' (String.fromInt (Time.toHour zone posix))
        , ":"
        , String.padLeft 2 '0' (String.fromInt (Time.toMinute zone posix))
        , ":"
        , String.padLeft 2 '0' (String.fromInt (Time.toSecond zone posix))
        , "."
        , String.padLeft 3 '0' (String.fromInt (Time.toMillis zone posix))
        ]


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
