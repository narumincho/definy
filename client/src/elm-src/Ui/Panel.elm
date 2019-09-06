module Ui.Panel exposing
    ( Content(..)
    , Event(..)
    , FitStyle(..)
    , Font(..)
    , HorizontalAlignment
    , ImageRendering(..)
    , Panel(..)
    , Size(..)
    , TextAlign(..)
    , VerticalAlignment
    , borderNone
    , bottom
    , centerX
    , centerY
    , left
    , map
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


{-| 幅と高さが外の大きさによってきまるパネル
-}
type Panel msg
    = Panel
        { events : List (Event msg)
        , padding : Int
        , content : Content msg
        }


type Content msg
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
    | DepthList (List (Panel msg))
    | RowList (List ( Size, Panel msg ))
    | ColumnList (List ( Size, Panel msg ))


type Size
    = Flex Int
    | Fix Int


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


toHtml : Panel msg -> Html.Styled.Html msg
toHtml =
    growGrowToHtml False


panel : List (Event msg) -> Int -> Content msg -> Panel msg
panel events padding content =
    Panel
        { events = events
        , padding = padding
        , content = content
        }


map : (a -> b) -> Panel a -> Panel b
map func (Panel { events, padding, content }) =
    Panel
        { events = events |> List.map (mapEvent func)
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
                        (list |> List.map (Tuple.mapSecond (map func)))

                ColumnList list ->
                    ColumnList
                        (list |> List.map (Tuple.mapSecond (map func)))
        }


mapEvent : (a -> b) -> Event a -> Event b
mapEvent func event =
    case event of
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


growGrowToHtml : Bool -> Panel msg -> Html.Styled.Html msg
growGrowToHtml isSetGridPosition (Panel { events, padding, content }) =
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


growGrowContentToStyle : Bool -> Content msg -> Css.Style
growGrowContentToStyle isSetGridPosition content =
    (case content of
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

        Monochromatic color ->
            [ Css.backgroundColor color ]

        DepthList _ ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            ]

        RowList list ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-columns" (rowListGridTemplate (list |> List.map Tuple.first))
            ]

        ColumnList list ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" (rowListGridTemplate (list |> List.map Tuple.first))
            ]
    )
        ++ (if isSetGridPosition then
                [ gridSetPosition ]

            else
                []
           )
        |> Css.batch


growGrowContentToListAttributes : Content msg -> List (Html.Styled.Attribute msg)
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

        ColumnList _ ->
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


growGrowContentToListHtml : Content msg -> List (Html.Styled.Html msg)
growGrowContentToListHtml content =
    case content of
        Text { text } ->
            [ Html.Styled.text text ]

        ImageFromDataUrl _ ->
            []

        Monochromatic color ->
            []

        DepthList list ->
            list |> List.map (growGrowToHtml True)

        RowList list ->
            list
                |> List.map (Tuple.second >> growGrowToHtml False)

        ColumnList list ->
            list
                |> List.map (Tuple.second >> growGrowToHtml False)


rowListGridTemplate : List Size -> String
rowListGridTemplate =
    List.map
        (\size ->
            case size of
                Flex int ->
                    String.fromInt int ++ "fr"

                Fix int ->
                    String.fromInt int ++ "px"
        )
        >> String.join " "


gridSetPosition : Css.Style
gridSetPosition =
    Css.batch
        [ Css.property "grid-row" "1 / 2"
        , Css.property "grid-column" "1 / 2"
        ]


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
