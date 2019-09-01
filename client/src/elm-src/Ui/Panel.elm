module Ui.Panel exposing
    ( FitStyle(..)
    , FixFix(..)
    , FixGrow(..)
    , Font(..)
    , GrowFix(..)
    , GrowGrow(..)
    , HorizontalAlignment
    , ImageRendering(..)
    , TextAlign(..)
    , VerticalAlignment
    , bottom
    , centerX
    , centerY
    , left
    , right
    , toHtml
    , top
    )

import Color
import Css
import Html.Styled
import Html.Styled.Attributes


{-| 横方向と縦方向で揃える位置が必要なパネル
-}
type FixFix msg
    = FixFixFromGrowGrow
        { width : Int
        , height : Int
        , growGrow : GrowGrow msg
        }


{-| 幅は中身によって、高さは外の大きさによって決まるパネル
-}
type FixGrow msg
    = FixGrowFromFixFix
        { horizontalAlignment : HorizontalAlignment
        , fixFix : FixFix msg
        }
    | FixGrowFromGrowGrow
        { width : Int
        , growGrow : GrowGrow msg
        }


{-| 幅は外の大きさによって、高さは中身によって決まるパネル
-}
type GrowFix msg
    = GrowFixFromFixFix
        { verticalAlignment : VerticalAlignment
        , fixFix : FixFix msg
        }
    | GrowFixFromGrowGrow
        { height : Int
        , growGrow : GrowGrow msg
        }


{-| 幅と高さが外の大きさによってきまるパネル
-}
type GrowGrow msg
    = FromFixFix
        { horizontalAlignment : HorizontalAlignment
        , verticalAlignment : VerticalAlignment
        , fixFix : FixFix msg
        }
    | FromFixGrow
        { horizontalAlignment : HorizontalAlignment
        , fixGrow : FixGrow msg
        }
    | FromGrowFix
        { verticalAlignment : VerticalAlignment
        , growFix : GrowFix msg
        }
    | Box
        { padding : Int
        , border : Border
        , color : Color.Color
        }
    | Text
        { textAlign : TextAlign
        , verticalAlignment : VerticalAlignment
        , text : String
        , font : Font
        }
    | ImageFromDataUrl
        { dataUrl : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    | DepthList (List (GrowGrow msg))


type FitStyle
    = Contain
    | Cover


type ImageRendering
    = ImageRenderingPixelated
    | ImageRenderingAuto


type Border
    = Border
        { top : BorderStyle
        , right : BorderStyle
        , left : BorderStyle
        , bottom : BorderStyle
        }


type BorderStyle
    = BorderStyle
        { color : Color.Color
        , width : Int
        }


type TextAlign
    = TextAlignStart
    | TextAlignEnd
    | TextAlignCenter
    | TextAlignJustify


type Font
    = Font
        { typeface : String
        , size : Int
        , letterSpacing : Float
        , color : Color.Color
        }


toHtml : GrowGrow msg -> Html.Styled.Html msg
toHtml =
    growGrowToHtml False


growGrowToHtml : Bool -> GrowGrow msg -> Html.Styled.Html msg
growGrowToHtml isSetGridPosition growGrow =
    case growGrow of
        FromFixFix { horizontalAlignment, verticalAlignment, fixFix } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.displayFlex
                     , horizontalAlignmentToStyle horizontalAlignment
                     , verticalAlignmentToStyle verticalAlignment
                     , Css.overflow Css.hidden
                     ]
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                ]
                [ fixFixToHtml fixFix ]

        FromFixGrow { horizontalAlignment, fixGrow } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.displayFlex
                     , horizontalAlignmentToStyle horizontalAlignment
                     , Css.overflow Css.hidden
                     ]
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                ]
                [ fixGrowToHtml fixGrow ]

        FromGrowFix { verticalAlignment, growFix } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.displayFlex
                     , verticalAlignmentToStyle verticalAlignment
                     , Css.overflow Css.hidden
                     ]
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                ]
                [ growFixToHtml growFix ]

        Box { padding, border, color } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.color (Css.hex (Color.toRGBString color))
                     , Css.overflow Css.hidden
                     ]
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                ]
                []

        Text { textAlign, verticalAlignment, text, font } ->
            let
                (Font { typeface, size, letterSpacing, color }) =
                    font
            in
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.property "display" "grid"
                     , Css.textAlign
                        (case textAlign of
                            TextAlignStart ->
                                Css.start

                            TextAlignEnd ->
                                Css.end

                            TextAlignCenter ->
                                Css.center

                            TextAlignJustify ->
                                Css.justify
                        )
                     , verticalAlignmentToStyle verticalAlignment
                     , Css.color (Css.hex (Color.toHex color))
                     , Css.fontSize (Css.px (toFloat size))
                     , Css.fontFamilies [ Css.qt typeface ]
                     , Css.letterSpacing (Css.px letterSpacing)
                     , Css.overflowWrap Css.breakWord
                     , Css.overflow Css.hidden
                     ]
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                ]
                [ Html.Styled.text text ]

        ImageFromDataUrl { dataUrl, fitStyle, alternativeText, rendering } ->
            Html.Styled.img
                [ Html.Styled.Attributes.css
                    ([ Css.width (Css.pct 100)
                     , Css.height (Css.pct 100)
                     , Css.property "object-fit"
                        (case fitStyle of
                            Contain ->
                                "contain"

                            Cover ->
                                "cover"
                        )
                     , Css.display Css.block
                     ]
                        ++ (case rendering of
                                ImageRenderingAuto ->
                                    []

                                ImageRenderingPixelated ->
                                    [ Css.property "image-rendering" "pixelated" ]
                           )
                        ++ (if isSetGridPosition then
                                [ gridSetPosition ]

                            else
                                []
                           )
                    )
                , Html.Styled.Attributes.src
                    (if String.startsWith "data:" dataUrl then
                        dataUrl

                     else
                        ""
                    )
                , Html.Styled.Attributes.alt alternativeText
                ]
                []

        DepthList list ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ Css.width (Css.pct 100)
                    , Css.height (Css.pct 100)
                    , Css.property "display" "grid"
                    , Css.property "grid-template-rows" "1fr"
                    , Css.property "grid-template-columns" "1fr"
                    ]
                ]
                (list |> List.map (growGrowToHtml True))


gridSetPosition : Css.Style
gridSetPosition =
    Css.batch
        [ Css.property "grid-row" "1 / 2"
        , Css.property "grid-column" "1 / 2"
        ]


fixFixToHtml : FixFix msg -> Html.Styled.Html msg
fixFixToHtml fixFix =
    case fixFix of
        FixFixFromGrowGrow { width, height, growGrow } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ Css.width (Css.px (toFloat width))
                    , Css.height (Css.px (toFloat height))
                    , Css.overflow Css.hidden
                    ]
                ]
                [ growGrowToHtml False growGrow ]


fixGrowToHtml : FixGrow msg -> Html.Styled.Html msg
fixGrowToHtml fixGrow =
    case fixGrow of
        FixGrowFromFixFix { horizontalAlignment, fixFix } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ horizontalAlignmentToStyle horizontalAlignment
                    , Css.height (Css.pct 100)
                    , Css.overflow Css.hidden
                    ]
                ]
                [ fixFixToHtml fixFix ]

        FixGrowFromGrowGrow { width, growGrow } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ Css.width (Css.px (toFloat width))
                    , Css.height (Css.pct 100)
                    , Css.overflow Css.hidden
                    ]
                ]
                [ growGrowToHtml False growGrow ]


growFixToHtml : GrowFix msg -> Html.Styled.Html msg
growFixToHtml growFix =
    case growFix of
        GrowFixFromFixFix { verticalAlignment, fixFix } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ verticalAlignmentToStyle verticalAlignment
                    , Css.width (Css.pct 100)
                    , Css.overflow Css.hidden
                    ]
                ]
                [ fixFixToHtml fixFix ]

        GrowFixFromGrowGrow { height, growGrow } ->
            Html.Styled.div
                [ Html.Styled.Attributes.css
                    [ Css.width (Css.pct 100)
                    , Css.height (Css.px (toFloat height))
                    , Css.overflow Css.hidden
                    ]
                ]
                [ growGrowToHtml False growGrow ]


{-| 横方向のそろえ方
-}
type HorizontalAlignment
    = Left
    | CenterX
    | Right


{-| 横方向のそろえ方。左によせる
-}
left : HorizontalAlignment
left =
    Left


{-| 横方向のそろえ方。中央にそろえる
-}
centerX : HorizontalAlignment
centerX =
    CenterX


{-| 横方向のそろえ方。右によせる
-}
right : HorizontalAlignment
right =
    Right


{-| 縦のそろえ方
-}
type VerticalAlignment
    = Top
    | CenterY
    | Bottom


{-| 縦方向のそろえ方。上によせる
-}
top : VerticalAlignment
top =
    Top


{-| 縦方向のそろえ方。中央にそろえる
-}
centerY : VerticalAlignment
centerY =
    CenterY


{-| 縦方向のそろえ方。下によせる
-}
bottom : VerticalAlignment
bottom =
    Bottom


{-| 表示領域と表示幅と水平の揃え方からX座標を求める
-}
horizontalAlignmentToStyle : HorizontalAlignment -> Css.Style
horizontalAlignmentToStyle horizontalAlignment =
    Css.justifyContent
        (case horizontalAlignment of
            Left ->
                Css.start

            CenterX ->
                Css.center

            Right ->
                Css.end
        )


{-| 表示領域と表示高さと垂直の揃え方からY座標を求める
-}
verticalAlignmentToStyle : VerticalAlignment -> Css.Style
verticalAlignmentToStyle verticalAlignment =
    Css.alignItems
        (case verticalAlignment of
            Top ->
                Css.flexStart

            CenterY ->
                Css.center

            Bottom ->
                Css.flexEnd
        )
