module Ui.Panel exposing
    ( Event(..)
    , FitStyle(..)
    , FixFix(..)
    , FixGrow(..)
    , FixGrowOrGrowGrow(..)
    , Font(..)
    , GrowFix(..)
    , GrowGrow(..)
    , GrowGrowContent(..)
    , HorizontalAlignment
    , ImageRendering(..)
    , TextAlign(..)
    , VerticalAlignment
    , borderNone
    , bottom
    , centerX
    , centerY
    , left
    , map
    , mapFixGrow
    , panel
    , right
    , toHtml
    , top
    )

import Bitwise
import Css
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode


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
    = GrowGrow
        { events : List (Event msg)
        , padding : Int
        , content : GrowGrowContent msg
        }


type GrowGrowContent msg
    = Text
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
    | Monochromatic Css.Color
    | DepthList (List (GrowGrow msg))
    | RowList (List (FixGrowOrGrowGrow msg))


type FixGrowOrGrowGrow msg
    = FixGrowOrGrowGrowFixGrow (FixGrow msg)
    | FixGrowOrGrowGrowGrowGrow (GrowGrow msg)


type FitStyle
    = Contain
    | Cover


type ImageRendering
    = ImageRenderingPixelated
    | ImageRenderingAuto


type Border
    = Border
        { top : Maybe BorderStyle
        , right : Maybe BorderStyle
        , left : Maybe BorderStyle
        , bottom : Maybe BorderStyle
        }


type BorderStyle
    = BorderStyle
        { color : Css.Color
        , width : Int
        }


borderNone : Border
borderNone =
    Border
        { top = Nothing
        , right = Nothing
        , left = Nothing
        , bottom = Nothing
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
        , color : Css.Color
        }


type Event msg
    = MouseEnter (MouseEvent -> msg)
    | MouseLeave (MouseEvent -> msg)
    | Click msg
    | MouseMove (MouseEvent -> msg)
    | MouseDown (MouseEvent -> msg)


type MouseEvent
    = MouseEvent
        { position : ( Float, Float )
        , buttons :
            { primary : Bool
            , secondary : Bool
            , auxiliary : Bool
            , browserBack : Bool
            , browserForward : Bool
            }
        }


toHtml : GrowGrow msg -> Html.Styled.Html msg
toHtml =
    growGrowToHtml False


panel : List (Event msg) -> Int -> GrowGrowContent msg -> GrowGrow msg
panel events padding content =
    GrowGrow
        { events = events
        , padding = padding
        , content = content
        }


map : (a -> b) -> GrowGrow a -> GrowGrow b
map func (GrowGrow { events, padding, content }) =
    GrowGrow
        { events =
            events
                |> List.map
                    (\e ->
                        case e of
                            MouseEnter msg ->
                                MouseEnter (msg >> func)

                            MouseLeave msg ->
                                MouseLeave (msg >> func)

                            Click msg ->
                                Click (func msg)

                            MouseMove msg ->
                                MouseMove (msg >> func)

                            MouseDown msg ->
                                MouseDown (msg >> func)
                    )
        , padding = padding
        , content =
            case content of
                Text rec ->
                    Text rec

                ImageFromDataUrl rec ->
                    ImageFromDataUrl rec

                Monochromatic color ->
                    Monochromatic color

                DepthList list ->
                    DepthList (list |> List.map (map func))

                RowList list ->
                    RowList
                        (list
                            |> List.map
                                (\e ->
                                    case e of
                                        FixGrowOrGrowGrowGrowGrow growGrow ->
                                            FixGrowOrGrowGrowGrowGrow (map func growGrow)

                                        FixGrowOrGrowGrowFixGrow fixGrow ->
                                            FixGrowOrGrowGrowFixGrow (mapFixGrow func fixGrow)
                                )
                        )
        }


mapFixGrow : (a -> b) -> FixGrow a -> FixGrow b
mapFixGrow func fixGrow =
    case fixGrow of
        FixGrowFromFixFix { horizontalAlignment, fixFix } ->
            FixGrowFromFixFix
                { horizontalAlignment = horizontalAlignment
                , fixFix = mapFixFix func fixFix
                }

        FixGrowFromGrowGrow { width, growGrow } ->
            FixGrowFromGrowGrow
                { width = width
                , growGrow = map func growGrow
                }


mapFixFix : (a -> b) -> FixFix a -> FixFix b
mapFixFix func fixFix =
    case fixFix of
        FixFixFromGrowGrow { width, height, growGrow } ->
            FixFixFromGrowGrow
                { width = width
                , height = height
                , growGrow = map func growGrow
                }


growGrowToHtml : Bool -> GrowGrow msg -> Html.Styled.Html msg
growGrowToHtml isSetGridPosition (GrowGrow { events, padding, content }) =
    Html.Styled.div
        ([ Html.Styled.Attributes.css
            [ Css.width (Css.pct 100)
            , Css.height (Css.pct 100)
            , Css.padding (Css.pc (toFloat padding))
            , growGrowContentToStyle isSetGridPosition content
            ]
         ]
            ++ growGrowContentToListAttributes content
            ++ eventsToHtmlAttributes events
        )
        (growGrowContentToListHtml content)


growGrowContentToStyle : Bool -> GrowGrowContent msg -> Css.Style
growGrowContentToStyle isSetGridPosition content =
    case content of
        Text { textAlign, verticalAlignment, text, font } ->
            let
                (Font { typeface, size, letterSpacing, color }) =
                    font
            in
            [ Css.property "display" "grid"
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
            , Css.color color
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
                |> Css.batch

        ImageFromDataUrl { dataUrl, fitStyle, alternativeText, rendering } ->
            [ Css.property "object-fit"
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
                |> Css.batch

        Monochromatic color ->
            [ Css.backgroundColor color ]
                ++ (if isSetGridPosition then
                        [ gridSetPosition ]

                    else
                        []
                   )
                |> Css.batch

        DepthList list ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            ]
                ++ (if isSetGridPosition then
                        [ gridSetPosition ]

                    else
                        []
                   )
                |> Css.batch

        RowList list ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-columns" (rowListGridTemplate list)
            ]
                ++ (if isSetGridPosition then
                        [ gridSetPosition ]

                    else
                        []
                   )
                |> Css.batch


growGrowContentToListAttributes : GrowGrowContent msg -> List (Html.Styled.Attribute msg)
growGrowContentToListAttributes content =
    case content of
        Text _ ->
            []

        ImageFromDataUrl { dataUrl, alternativeText } ->
            [ Html.Styled.Attributes.src
                (if String.startsWith "data:" dataUrl then
                    dataUrl

                 else
                    ""
                )
            , Html.Styled.Attributes.alt alternativeText
            ]

        Monochromatic _ ->
            []

        DepthList _ ->
            []

        RowList _ ->
            []


eventsToHtmlAttributes : List (Event msg) -> List (Html.Styled.Attribute msg)
eventsToHtmlAttributes =
    List.map eventToHtmlAttribute


eventToHtmlAttribute : Event msg -> Html.Styled.Attribute msg
eventToHtmlAttribute event =
    case event of
        MouseEnter msg ->
            Html.Styled.Events.on "mouseenter" (mouseEventDecoder |> Json.Decode.map msg)

        MouseLeave msg ->
            Html.Styled.Events.on "mouseleave" (mouseEventDecoder |> Json.Decode.map msg)

        Click msg ->
            Html.Styled.Events.onClick msg

        MouseMove msg ->
            Html.Styled.Events.on "mousemove" (mouseEventDecoder |> Json.Decode.map msg)

        MouseDown msg ->
            Html.Styled.Events.on "mousedown" (mouseEventDecoder |> Json.Decode.map msg)


mouseEventDecoder : Json.Decode.Decoder MouseEvent
mouseEventDecoder =
    Json.Decode.map3
        (\clientX clientY buttons ->
            MouseEvent
                { position = ( clientX, clientY )
                , buttons =
                    { primary = (buttons |> Bitwise.and 1) /= 0
                    , secondary = (buttons |> Bitwise.and 2) /= 0
                    , auxiliary = (buttons |> Bitwise.and 4) /= 0
                    , browserBack = (buttons |> Bitwise.and 8) /= 0
                    , browserForward = (buttons |> Bitwise.and 16) /= 0
                    }
                }
        )
        (Json.Decode.field "clientX" Json.Decode.float)
        (Json.Decode.field "clientY" Json.Decode.float)
        (Json.Decode.field "buttons" Json.Decode.int)


growGrowContentToListHtml : GrowGrowContent msg -> List (Html.Styled.Html msg)
growGrowContentToListHtml content =
    case content of
        Text { text } ->
            [ Html.Styled.text text ]

        ImageFromDataUrl _ ->
            []

        DepthList list ->
            list |> List.map (growGrowToHtml True)

        RowList list ->
            list
                |> List.map
                    (\fixGrowOrGrowGrow ->
                        case fixGrowOrGrowGrow of
                            FixGrowOrGrowGrowFixGrow fixGrow ->
                                fixGrowToHtml fixGrow

                            FixGrowOrGrowGrowGrowGrow g ->
                                growGrowToHtml False g
                    )

        Monochromatic color ->
            []


rowListGridTemplate : List (FixGrowOrGrowGrow msg) -> String
rowListGridTemplate =
    List.map
        (\fixGrowOrGrowGrow ->
            case fixGrowOrGrowGrow of
                FixGrowOrGrowGrowFixGrow _ ->
                    "auto"

                FixGrowOrGrowGrowGrowGrow _ ->
                    "1fr"
        )
        >> String.join " "


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
