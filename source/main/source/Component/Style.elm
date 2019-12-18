module Component.Style exposing
    ( GutterMode(..)
    , GutterMsg(..)
    , activeColor
    , codeFontTypeface
    , fontHack
    , gutterPanel
    , horizontalGutter
    , normalFont
    , tabContainer
    , textColorStyle
    , verticalGutter
    )

{-| Definyで使うUIのパネルを定義する
-}

import Css
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
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


gutterPanel : GutterMode -> Ui.Panel GutterMsg
gutterPanel mode =
    Ui.depth
        []
        [ Ui.Width 2
        , Ui.OverflowVisible
        , Ui.PointerImage Ui.HorizontalResize
        ]
        (case mode of
            GutterModeNone ->
                [ Ui.monochromatic
                    []
                    [ Ui.Width 2 ]
                    (Css.rgb 68 68 68)
                , Ui.monochromatic
                    [ Ui.PointerDown GutterMsgToResizeMode
                    , Ui.PointerEnter (always GutterMsgPointerEnter)
                    ]
                    [ Ui.Width 12
                    , Ui.Offset ( -5, 0 )
                    ]
                    (Css.rgba 0 0 0 0)
                ]

            GutterModePointerEnter ->
                [ Ui.monochromatic
                    []
                    [ Ui.Width 2 ]
                    (Css.rgb 102 102 102)
                , Ui.monochromatic
                    [ Ui.PointerDown GutterMsgToResizeMode
                    , Ui.PointerLeave (always GutterMsgPointerLeave)
                    ]
                    [ Ui.Width 12
                    , Ui.Offset ( -5, 0 )
                    ]
                    (Css.rgba 0 0 0 0)
                ]

            GutterModeResize ->
                [ Ui.monochromatic
                    []
                    [ Ui.Width 6
                    , Ui.Offset ( -2, 0 )
                    ]
                    (Css.rgb 255 255 255)
                ]
        )


type GutterMode
    = GutterModeNone
    | GutterModePointerEnter
    | GutterModeResize


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


normalFont : Ui.Font
normalFont =
    Ui.Font
        { typeface = "'Hiragino Kaku Gothic Pro', 'ヒラギノ角ゴ Pro W3', メイリオ, Meiryo, 'ＭＳ Ｐゴシック', sans-serif"
        , size = 16
        , letterSpacing = 0
        , color = Css.rgb 255 255 255
        }


codeFontTypeface : String
codeFontTypeface =
    "Hack"


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
    Css.fontFamily { font | value = "Hack" }
