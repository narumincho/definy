module Ui exposing
    ( Content
    , Event(..)
    , FitStyle(..)
    , Font(..)
    , HorizontalAlignment(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , Size(..)
    , Style(..)
    , TextAlignment(..)
    , VerticalAlignment(..)
    , borderNone
    , column
    , depth
    , map
    , monochromatic
    , pointerGetPosition
    , rasterImage
    , row
    , text
    , textWithAlignment
    , toHtml
    , vectorImage
    )

import Bitwise
import Css
import EverySet
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
import Json.Decode.Pipeline
import Utility.NSvg


{-| 幅と高さが外の大きさによってきまるパネル
-}
type Panel msg
    = Panel
        { events : List (Event msg)
        , style : StyleComputed
        , content : Content msg
        }


{-| 各パネルで受け取れるイベント
-}
type Event msg
    = PointerEnter (Pointer -> msg) -- マウスが要素の領域に入ってきた
    | PointerLeave (Pointer -> msg) -- マウスが要素の領域から外れた
    | Click msg -- マウスのボタンを話してクリックしたり、画面をタッチ、タップしたら
    | PointerMove (Pointer -> msg) -- マウスが動いたら
    | PointerDown (Pointer -> msg) -- マウスのボタンを押したら


{-| ポインターのイベントで受け取れるマウスの状態
-}
type Pointer
    = Pointer
        { id : Int -- 識別するためのID
        , position : ( Float, Float ) -- 要素内での位置
        , button : Maybe PointerButton -- 押したボタン。Nothingは最初のイベント以降で変更がなかったとき
        , pressure : Float -- 圧力 0～1
        , tangentialPressure : Float
        , size : ( Float, Float )
        , tilt : ( Float, Float )
        , twist : Float
        , type_ : PointerType
        , isPrimary : Bool
        , buttons : EverySet.EverySet PointerButton
        , target : Bool
        }


type PointerType
    = Mouse
    | Pen
    | Touch
    | PointerTypeUnknown String


type PointerButton
    = Primary
    | Secondary
    | Auxiliary
    | BrowserBack
    | BrowserForward
    | Eraser
    | PointerButtonUnknown Int -- 6番～31番


{-| どのパネルでも指定できるスタイル
-}
type StyleComputed
    = StyleComputed
        { padding : Int
        , width : Maybe Size
        , height : Maybe Size
        , offset : Maybe ( Int, Int )
        , verticalAlignment : Maybe VerticalAlignment
        , textAlignment : Maybe TextAlignment
        , overflowVisible : Bool
        }


type Style
    = Padding Int
    | Width Size
    | Height Size
    | Offset ( Int, Int )
    | VerticalAlignment VerticalAlignment
    | TextAlignment TextAlignment
    | OverflowVisible


type Content msg
    = Text
        { text : String
        , font : Font
        , verticalAlignment : Maybe VerticalAlignment
        , textAlignment : Maybe TextAlignment
        }
    | RasterImage
        { dataUrl : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    | VectorImage
        { fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , nSvgElements : List (Utility.NSvg.NSvg msg)
        }
    | Monochromatic Css.Color
    | DepthList (List (Panel msg))
    | RowList (List (Panel msg)) Int
    | ColumnList (List (Panel msg)) Int


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


type TextAlignment
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


toHtml : Panel msg -> Html.Styled.Html msg
toHtml =
    panelToHtml (ChildrenStyle { gridPositionLeftTop = False, position = Nothing })


text :
    List (Event msg)
    -> List Style
    -> Font
    -> String
    -> Panel msg
text events style font string =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            Text
                { font = font
                , text = string
                , verticalAlignment = Nothing
                , textAlignment = Nothing
                }
        }


textWithAlignment :
    List (Event msg)
    -> List Style
    ->
        { align : Maybe TextAlignment
        , vertical : Maybe VerticalAlignment
        , font : Font
        }
    -> String
    -> Panel msg
textWithAlignment events style { align, vertical, font } string =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            Text
                { font = font
                , text = string
                , verticalAlignment = vertical
                , textAlignment = align
                }
        }


rasterImage :
    List (Event msg)
    -> List Style
    ->
        { fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    -> String
    -> Panel msg
rasterImage events style imageStyle dataUrl =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            RasterImage
                { fitStyle = imageStyle.fitStyle
                , alternativeText = imageStyle.alternativeText
                , rendering = imageStyle.rendering
                , dataUrl = dataUrl
                }
        }


vectorImage :
    List (Event msg)
    -> List Style
    -> { fitStyle : FitStyle, viewBox : { x : Int, y : Int, width : Int, height : Int }, nSvgElements : List (Utility.NSvg.NSvg msg) }
    -> Panel msg
vectorImage events style content =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            VectorImage content
        }


monochromatic :
    List (Event msg)
    -> List Style
    -> Css.Color
    -> Panel msg
monochromatic events style color =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            Monochromatic color
        }


depth : List (Event msg) -> List Style -> List (Panel msg) -> Panel msg
depth events style children =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content = DepthList children
        }


row : List (Event msg) -> List Style -> Int -> List (Panel msg) -> Panel msg
row events style gap children =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content = RowList children gap
        }


column : List (Event msg) -> List Style -> Int -> List (Panel msg) -> Panel msg
column events style gap children =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content = ColumnList children gap
        }


{-| スタイルをまとめる。先のものが優先される。
-}
computeStyle : List Style -> StyleComputed
computeStyle list =
    case list of
        x :: xs ->
            let
                (StyleComputed rec) =
                    computeStyle xs
            in
            (case x of
                Padding padding ->
                    { rec | padding = padding }

                Width size ->
                    { rec | width = Just size }

                Height size ->
                    { rec | height = Just size }

                Offset position ->
                    { rec | offset = Just position }

                VerticalAlignment v ->
                    { rec | verticalAlignment = Just v }

                TextAlignment align ->
                    { rec | textAlignment = Just align }

                OverflowVisible ->
                    { rec | overflowVisible = True }
            )
                |> StyleComputed

        [] ->
            StyleComputed
                { padding = 0
                , width = Nothing
                , height = Nothing
                , offset = Nothing
                , verticalAlignment = Nothing
                , textAlignment = Nothing
                , overflowVisible = False
                }


map : (a -> b) -> Panel a -> Panel b
map func (Panel { events, style, content }) =
    Panel
        { events = events |> List.map (mapEvent func)
        , style = style
        , content =
            case content of
                Text rec ->
                    Text rec

                RasterImage rec ->
                    RasterImage rec

                VectorImage { fitStyle, viewBox, nSvgElements } ->
                    VectorImage
                        { fitStyle = fitStyle
                        , viewBox = viewBox
                        , nSvgElements = nSvgElements |> List.map (Utility.NSvg.map func)
                        }

                Monochromatic color ->
                    Monochromatic color

                DepthList list ->
                    DepthList (list |> List.map (map func))

                RowList list gap ->
                    RowList
                        (list |> List.map (map func))
                        gap

                ColumnList list gap ->
                    ColumnList
                        (list |> List.map (map func))
                        gap
        }


mapEvent : (a -> b) -> Event a -> Event b
mapEvent func event =
    case event of
        PointerEnter msg ->
            PointerEnter (msg >> func)

        PointerLeave msg ->
            PointerLeave (msg >> func)

        Click msg ->
            Click (func msg)

        PointerMove msg ->
            PointerMove (msg >> func)

        PointerDown msg ->
            PointerDown (msg >> func)


type ChildrenStyle
    = ChildrenStyle
        { gridPositionLeftTop : Bool
        , position : Maybe ( Int, Int )
        }


panelToHtml : ChildrenStyle -> Panel msg -> Html.Styled.Html msg
panelToHtml isSetGridPosition (Panel { events, style, content }) =
    let
        (StyleComputed { padding, width, height, offset, verticalAlignment, textAlignment, overflowVisible }) =
            style
    in
    Html.Styled.div
        ([ Html.Styled.Attributes.css
            ([ Css.padding (Css.px (toFloat padding))
             , growGrowContentToStyle textAlignment verticalAlignment isSetGridPosition overflowVisible content
             ]
                ++ (case width of
                        Just (Flex int) ->
                            [ Css.width (Css.pct 100) ]

                        Just (Fix w) ->
                            [ Css.width (Css.px (toFloat w)) ]

                        Nothing ->
                            []
                   )
                ++ (case height of
                        Just (Flex int) ->
                            [ Css.height (Css.pct 100) ]

                        Just (Fix w) ->
                            [ Css.height (Css.px (toFloat w)) ]

                        Nothing ->
                            []
                   )
                ++ (case offset of
                        Just ( left, top ) ->
                            [ Css.transform
                                (Css.translate2
                                    (Css.px (toFloat left))
                                    (Css.px (toFloat top))
                                )
                            ]

                        Nothing ->
                            []
                   )
            )
         ]
            ++ growGrowContentToListAttributes content
            ++ eventsToHtmlAttributes events
        )
        (growGrowContentToListHtml content)


growGrowContentToStyle : Maybe TextAlignment -> Maybe VerticalAlignment -> ChildrenStyle -> Bool -> Content msg -> Css.Style
growGrowContentToStyle textAlignment verticalAlignment (ChildrenStyle { gridPositionLeftTop, position }) overflowVisible content =
    (case content of
        Text rec ->
            let
                (Font { typeface, size, letterSpacing, color }) =
                    rec.font
            in
            [ Css.property "display" "grid"
            , Css.color color
            , Css.fontSize (Css.px (toFloat size))
            , Css.fontFamilies [ Css.qt typeface ]
            , Css.letterSpacing (Css.px letterSpacing)
            , Css.overflowWrap Css.breakWord
            ]
                ++ (case textAlignment of
                        Just t ->
                            [ Css.textAlign
                                (case t of
                                    TextAlignStart ->
                                        Css.start

                                    TextAlignEnd ->
                                        Css.end

                                    TextAlignCenter ->
                                        Css.center

                                    TextAlignJustify ->
                                        Css.justify
                                )
                            ]

                        Nothing ->
                            []
                   )
                ++ (case verticalAlignment of
                        Just v ->
                            [ verticalAlignmentToStyle v ]

                        Nothing ->
                            []
                   )

        RasterImage { dataUrl, fitStyle, alternativeText, rendering } ->
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

        VectorImage _ ->
            []

        Monochromatic color ->
            [ Css.backgroundColor color ]

        DepthList _ ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            ]

        RowList list gap ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-columns" (panelListToGridTemplateColumns list)
            , Css.property "gap" (String.fromInt gap ++ "px")
            ]

        ColumnList list gap ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" (panelListToGridTemplateRows list)
            , Css.property "gap" (String.fromInt gap ++ "px")
            ]
    )
        ++ (if overflowVisible then
                []

            else
                [ Css.overflow Css.hidden ]
           )
        ++ (if gridPositionLeftTop then
                [ gridSetPosition ]

            else
                []
           )
        ++ (case position of
                Just ( left, top ) ->
                    [ Css.left (Css.px (toFloat left))
                    , Css.top (Css.px (toFloat top))
                    ]

                Nothing ->
                    []
           )
        |> Css.batch


growGrowContentToListAttributes : Content msg -> List (Html.Styled.Attribute msg)
growGrowContentToListAttributes content =
    case content of
        Text _ ->
            []

        RasterImage { dataUrl, alternativeText } ->
            [ Html.Styled.Attributes.src
                (if String.startsWith "data:" dataUrl then
                    dataUrl

                 else
                    ""
                )
            , Html.Styled.Attributes.alt alternativeText
            ]

        VectorImage _ ->
            []

        Monochromatic _ ->
            []

        DepthList _ ->
            []

        RowList _ _ ->
            []

        ColumnList _ _ ->
            []


eventsToHtmlAttributes : List (Event msg) -> List (Html.Styled.Attribute msg)
eventsToHtmlAttributes =
    List.map eventToHtmlAttribute


eventToHtmlAttribute : Event msg -> Html.Styled.Attribute msg
eventToHtmlAttribute event =
    case event of
        PointerEnter msg ->
            Html.Styled.Events.on "pointerenter" (pointerEventDecoder |> Json.Decode.map msg)

        PointerLeave msg ->
            Html.Styled.Events.on "pointerleave" (pointerEventDecoder |> Json.Decode.map msg)

        Click msg ->
            Html.Styled.Events.onClick msg

        PointerMove msg ->
            Html.Styled.Events.on "pointermove" (pointerEventDecoder |> Json.Decode.map msg)

        PointerDown msg ->
            Html.Styled.Events.on "pointerdown" (pointerEventDecoder |> Json.Decode.map msg)


pointerEventDecoder : Json.Decode.Decoder Pointer
pointerEventDecoder =
    Json.Decode.succeed
        (\id clientX clientY button pressure tangentialPressure width height tiltX tiltY twist pointerType isPrimary buttons eventPhase ->
            Pointer
                { id = id
                , position = ( clientX, clientY )
                , button =
                    if button == -1 then
                        Nothing

                    else
                        Just
                            (case button of
                                0 ->
                                    Primary

                                1 ->
                                    Auxiliary

                                2 ->
                                    Secondary

                                3 ->
                                    BrowserBack

                                4 ->
                                    BrowserForward

                                5 ->
                                    Eraser

                                _ ->
                                    PointerButtonUnknown button
                            )
                , pressure = pressure
                , tangentialPressure = tangentialPressure
                , size = ( width, height )
                , tilt = ( tiltX, tiltY )
                , twist = twist
                , type_ =
                    case pointerType of
                        "mouse" ->
                            Mouse

                        "pen" ->
                            Pen

                        "touch" ->
                            Touch

                        _ ->
                            PointerTypeUnknown pointerType
                , isPrimary = isPrimary
                , buttons =
                    [ ( Primary, (buttons |> Bitwise.and 1) /= 0 )
                    , ( Secondary, (buttons |> Bitwise.and 2) /= 0 )
                    , ( Auxiliary, (buttons |> Bitwise.and 4) /= 0 )
                    , ( BrowserBack, (buttons |> Bitwise.and 8) /= 0 )
                    , ( BrowserForward, (buttons |> Bitwise.and 16) /= 0 )
                    , ( Eraser, (buttons |> Bitwise.and 32) /= 0 )
                    ]
                        |> List.filter Tuple.second
                        |> List.map Tuple.first
                        |> EverySet.fromList
                , target = eventPhase == 2
                }
        )
        |> Json.Decode.Pipeline.required "pointerId" Json.Decode.int
        |> Json.Decode.Pipeline.required "clientX" Json.Decode.float
        |> Json.Decode.Pipeline.required "clientY" Json.Decode.float
        |> Json.Decode.Pipeline.required "button" Json.Decode.int
        |> Json.Decode.Pipeline.required "pressure" Json.Decode.float
        |> Json.Decode.Pipeline.required "tangentialPressure" Json.Decode.float
        |> Json.Decode.Pipeline.required "width" Json.Decode.float
        |> Json.Decode.Pipeline.required "height" Json.Decode.float
        |> Json.Decode.Pipeline.required "tiltX" Json.Decode.float
        |> Json.Decode.Pipeline.required "tiltY" Json.Decode.float
        |> Json.Decode.Pipeline.required "twist" Json.Decode.float
        |> Json.Decode.Pipeline.required "pointerType" Json.Decode.string
        |> Json.Decode.Pipeline.required "isPrimary" Json.Decode.bool
        |> Json.Decode.Pipeline.required "buttons" Json.Decode.int
        |> Json.Decode.Pipeline.required "eventPhase" Json.Decode.int


growGrowContentToListHtml : Content msg -> List (Html.Styled.Html msg)
growGrowContentToListHtml content =
    case content of
        Text rec ->
            [ Html.Styled.text rec.text ]

        RasterImage _ ->
            []

        VectorImage { nSvgElements, viewBox } ->
            [ nSvgElements
                |> Utility.NSvg.toHtml viewBox Nothing
            ]

        Monochromatic color ->
            []

        DepthList list ->
            list
                |> List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = True
                            , position = Nothing
                            }
                        )
                    )

        RowList list _ ->
            list
                |> List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = False
                            , position = Nothing
                            }
                        )
                    )

        ColumnList list _ ->
            list
                |> List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = False
                            , position = Nothing
                            }
                        )
                    )


panelListToGridTemplateColumns : List (Panel msg) -> String
panelListToGridTemplateColumns =
    List.map
        (panelToGrowOrFixAutoWidth >> growOrFixAutoToGridTemplateString)
        >> String.join " "


panelListToGridTemplateRows : List (Panel msg) -> String
panelListToGridTemplateRows =
    List.map
        (panelToGrowOrFixAutoHeight >> growOrFixAutoToGridTemplateString)
        >> String.join " "


type GrowOrFixAuto
    = Grow Int
    | FixMaxContent


growOrFixAutoToGridTemplateString : GrowOrFixAuto -> String
growOrFixAutoToGridTemplateString growOrFixAuto =
    case growOrFixAuto of
        Grow int ->
            String.fromInt int ++ "fr"

        FixMaxContent ->
            "max-content"


panelToGrowOrFixAutoWidth : Panel msg -> GrowOrFixAuto
panelToGrowOrFixAutoWidth (Panel { style, content }) =
    let
        (StyleComputed { width, textAlignment }) =
            style
    in
    case width of
        Just (Flex int) ->
            Grow int

        Just (Fix _) ->
            FixMaxContent

        Nothing ->
            case content of
                Text _ ->
                    case textAlignment of
                        Just _ ->
                            Grow 1

                        Nothing ->
                            FixMaxContent

                RasterImage _ ->
                    Grow 1

                VectorImage _ ->
                    Grow 1

                Monochromatic _ ->
                    Grow 1

                DepthList list ->
                    if
                        list
                            |> List.any (\x -> panelToGrowOrFixAutoWidth x == FixMaxContent)
                    then
                        FixMaxContent

                    else
                        Grow 1

                RowList list int ->
                    if list |> List.all (\x -> panelToGrowOrFixAutoWidth x == FixMaxContent) then
                        FixMaxContent

                    else
                        Grow 1

                ColumnList list int ->
                    if list |> List.all (\x -> panelToGrowOrFixAutoWidth x == FixMaxContent) then
                        FixMaxContent

                    else
                        Grow 1


panelToGrowOrFixAutoHeight : Panel msg -> GrowOrFixAuto
panelToGrowOrFixAutoHeight (Panel { style, content }) =
    let
        (StyleComputed { height, verticalAlignment }) =
            style
    in
    case height of
        Just (Flex int) ->
            Grow int

        Just (Fix _) ->
            FixMaxContent

        Nothing ->
            case content of
                Text record ->
                    case verticalAlignment of
                        Just _ ->
                            Grow 1

                        Nothing ->
                            FixMaxContent

                RasterImage _ ->
                    Grow 1

                VectorImage _ ->
                    Grow 1

                Monochromatic _ ->
                    Grow 1

                DepthList list ->
                    if
                        list
                            |> List.any (\x -> panelToGrowOrFixAutoHeight x == FixMaxContent)
                    then
                        FixMaxContent

                    else
                        Grow 1

                RowList list int ->
                    if
                        list
                            |> List.all (\x -> panelToGrowOrFixAutoHeight x == FixMaxContent)
                    then
                        FixMaxContent

                    else
                        Grow 1

                ColumnList list int ->
                    if
                        list
                            |> List.all (\x -> panelToGrowOrFixAutoHeight x == FixMaxContent)
                    then
                        FixMaxContent

                    else
                        Grow 1


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


{-| 縦のそろえ方
-}
type VerticalAlignment
    = Top
    | CenterY
    | Bottom


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


pointerGetPosition : Pointer -> ( Float, Float )
pointerGetPosition (Pointer { position }) =
    position
