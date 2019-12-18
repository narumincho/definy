module Ui exposing
    ( AlignItems(..)
    , Content
    , Event(..)
    , FitStyle(..)
    , Font(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , Style(..)
    , TextAlignment(..)
    , column
    , depth
    , imageFromUrl
    , map
    , monochromatic
    , pointerGetPosition
    , row
    , textBox
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
import Utility.ListExtra
import VectorImage


{-| 幅と高さが外の大きさによってきまるパネル
-}
type Panel msg
    = Panel
        { events : EventComputed msg
        , style : StyleComputed
        , content : Content msg
        }


{-| 各パネルで受け取れるイベント
-}
type Event msg
    = Click msg -- マウスのボタンを話してクリックしたり、画面をタッチ、タップしたら
    | PointerEnter (Pointer -> msg) -- マウスが要素の領域に入ってきた
    | PointerLeave (Pointer -> msg) -- マウスが要素の領域から外れた
    | PointerMove (Pointer -> msg) -- マウスが動いたら
    | PointerDown (Pointer -> msg) -- マウスのボタンを押したら


type EventComputed msg
    = EventComputed
        { click : Maybe msg
        , pointerEnter : Maybe (Pointer -> msg)
        , pointerLeave : Maybe (Pointer -> msg)
        , pointerMove : Maybe (Pointer -> msg)
        , pointerDown : Maybe (Pointer -> msg)
        }


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


{-| どのパネルでも指定できるスタイル
-}
type StyleComputed
    = StyleComputed
        { padding : Int
        , width : Maybe Int
        , height : Maybe Int
        , offset : Maybe ( Int, Int )
        , overflowVisible : Bool
        , pointerImage : Maybe PointerImage
        , border : BorderStyle
        , borderRadius : Int
        }


type Style
    = Padding Int
    | Width Int
    | Height Int
    | Offset ( Int, Int )
    | OverflowVisible
    | PointerImage PointerImage
    | Border { color : Css.Color, width : Int }
    | BorderTop { color : Css.Color, width : Int }
    | BorderBottom { color : Css.Color, width : Int }
    | BorderLeft { color : Css.Color, width : Int }
    | BorderRight { color : Css.Color, width : Int }
    | BorderRadius Int


type PointerImage
    = HorizontalResize -- ew-resize ↔
    | VerticalResize -- ns-resize ↕


type Content msg
    = TextBox
        { text : String
        , font : Font
        , verticalAlignment : Maybe AlignItems
        , textAlignment : Maybe TextAlignment
        }
    | ImageFromUrl
        { url : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    | VectorImage
        { fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , elements : List (VectorImage.Element msg)
        }
    | Monochromatic Css.Color
    | DepthList (List (Panel msg))
    | RowList (List (Panel msg)) Int
    | ColumnList (List (Panel msg)) Int


type FitStyle
    = Contain
    | Cover


type ImageRendering
    = ImageRenderingPixelated
    | ImageRenderingAuto


type BorderStyle
    = BorderStyle
        { top : Maybe { color : Css.Color, width : Int }
        , right : Maybe { color : Css.Color, width : Int }
        , left : Maybe { color : Css.Color, width : Int }
        , bottom : Maybe { color : Css.Color, width : Int }
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


textBox :
    List (Event msg)
    -> List Style
    ->
        { align : Maybe TextAlignment
        , vertical : Maybe AlignItems
        , font : Font
        }
    -> String
    -> Panel msg
textBox events style { align, vertical, font } string =
    Panel
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content =
            TextBox
                { font = font
                , text = string
                , verticalAlignment = vertical
                , textAlignment = align
                }
        }


imageFromUrl :
    List (Event msg)
    -> List Style
    ->
        { fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    -> String
    -> Panel msg
imageFromUrl events style imageStyle url =
    Panel
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content =
            ImageFromUrl
                { url = url
                , fitStyle = imageStyle.fitStyle
                , alternativeText = imageStyle.alternativeText
                , rendering = imageStyle.rendering
                }
        }


vectorImage :
    List (Event msg)
    -> List Style
    -> { fitStyle : FitStyle, viewBox : { x : Int, y : Int, width : Int, height : Int }, elements : List (VectorImage.Element msg) }
    -> Panel msg
vectorImage events style content =
    Panel
        { events = events |> List.reverse |> computeEvents
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
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content =
            Monochromatic color
        }


depth : List (Event msg) -> List Style -> List (Panel msg) -> Panel msg
depth events style children =
    Panel
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content = DepthList children
        }


row : List (Event msg) -> List Style -> Int -> List (Panel msg) -> Panel msg
row events style gap children =
    Panel
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content = RowList children gap
        }


column : List (Event msg) -> List Style -> Int -> List (Panel msg) -> Panel msg
column events style gap children =
    Panel
        { events = events |> List.reverse |> computeEvents
        , style = style |> List.reverse |> computeStyle
        , content = ColumnList children gap
        }


computeEvents : List (Event msg) -> EventComputed msg
computeEvents events =
    case events of
        x :: xs ->
            let
                (EventComputed record) =
                    computeEvents xs
            in
            (case x of
                PointerEnter msgFunc ->
                    { record | pointerEnter = Just msgFunc }

                PointerLeave msgFunc ->
                    { record | pointerLeave = Just msgFunc }

                PointerMove msgFunc ->
                    { record | pointerMove = Just msgFunc }

                PointerDown msgFunc ->
                    { record | pointerDown = Just msgFunc }

                Click msg ->
                    { record | click = Just msg }
            )
                |> EventComputed

        [] ->
            EventComputed
                { pointerEnter = Nothing
                , pointerLeave = Nothing
                , pointerMove = Nothing
                , pointerDown = Nothing
                , click = Nothing
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

                OverflowVisible ->
                    { rec | overflowVisible = True }

                PointerImage image ->
                    { rec | pointerImage = Just image }

                Border record ->
                    { rec
                        | border =
                            BorderStyle
                                { top = Just record
                                , bottom = Just record
                                , left = Just record
                                , right = Just record
                                }
                    }

                BorderTop record ->
                    let
                        (BorderStyle borderStyle) =
                            rec.border
                    in
                    { rec
                        | border =
                            BorderStyle
                                { borderStyle | top = Just record }
                    }

                BorderBottom record ->
                    let
                        (BorderStyle borderStyle) =
                            rec.border
                    in
                    { rec
                        | border =
                            BorderStyle
                                { borderStyle | bottom = Just record }
                    }

                BorderLeft record ->
                    let
                        (BorderStyle borderStyle) =
                            rec.border
                    in
                    { rec
                        | border =
                            BorderStyle
                                { borderStyle | left = Just record }
                    }

                BorderRight record ->
                    let
                        (BorderStyle borderStyle) =
                            rec.border
                    in
                    { rec
                        | border =
                            BorderStyle
                                { borderStyle | right = Just record }
                    }

                BorderRadius int ->
                    { rec | borderRadius = int }
            )
                |> StyleComputed

        [] ->
            defaultStyle


defaultStyle : StyleComputed
defaultStyle =
    StyleComputed
        { padding = 0
        , width = Nothing
        , height = Nothing
        , offset = Nothing
        , overflowVisible = False
        , pointerImage = Nothing
        , border =
            BorderStyle
                { top = Nothing
                , bottom = Nothing
                , left = Nothing
                , right = Nothing
                }
        , borderRadius = 0
        }


map : (a -> b) -> Panel a -> Panel b
map func (Panel { events, style, content }) =
    Panel
        { events = events |> mapEvent func
        , style = style
        , content =
            case content of
                TextBox rec ->
                    TextBox rec

                ImageFromUrl rec ->
                    ImageFromUrl rec

                VectorImage { fitStyle, viewBox, elements } ->
                    VectorImage
                        { fitStyle = fitStyle
                        , viewBox = viewBox
                        , elements = elements |> List.map (VectorImage.map func)
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


mapEvent : (a -> b) -> EventComputed a -> EventComputed b
mapEvent func (EventComputed record) =
    EventComputed
        { pointerEnter = record.pointerEnter |> Maybe.map (\msgFunc pointer -> msgFunc pointer |> func)
        , pointerLeave = record.pointerLeave |> Maybe.map (\msgFunc pointer -> msgFunc pointer |> func)
        , pointerMove = record.pointerMove |> Maybe.map (\msgFunc pointer -> msgFunc pointer |> func)
        , pointerDown = record.pointerDown |> Maybe.map (\msgFunc pointer -> msgFunc pointer |> func)
        , click = record.click |> Maybe.map func
        }


type ChildrenStyle
    = ChildrenStyle
        { gridPositionLeftTop : Bool
        , position : Maybe ( Int, Int )
        }


panelToHtml : ChildrenStyle -> Panel msg -> Html.Styled.Html msg
panelToHtml childrenStyle panel =
    let
        (Panel { events, style, content }) =
            panel
    in
    panelToHtmlElementType
        panel
        ([ Html.Styled.Attributes.css [ panelToStyle style childrenStyle content ] ]
            ++ growGrowContentToListAttributes content
            ++ eventsToHtmlAttributes events
        )
        (contentToListHtml content)


panelToHtmlElementType :
    Panel msg
    -> List (Html.Styled.Attribute msg)
    -> List (Html.Styled.Html msg)
    -> Html.Styled.Html msg
panelToHtmlElementType (Panel { content, events }) =
    case content of
        ImageFromUrl _ ->
            Html.Styled.img

        _ ->
            let
                (EventComputed { click }) =
                    events
            in
            case click of
                Just _ ->
                    -- Button要素がdisplay:gridできないバグへの対処も含めての入れ子 https://stackoverflow.com/questions/51815477/is-a-button-allowed-to-have-displaygrid
                    \attributes children ->
                        Html.Styled.button
                            [ Html.Styled.Attributes.css
                                [ Css.width (Css.pct 100)
                                , Css.height (Css.pct 100)
                                , Css.padding Css.zero
                                , Css.border2 Css.zero Css.none
                                , Css.backgroundColor Css.transparent
                                , Css.cursor Css.pointer
                                ]
                            ]
                            [ Html.Styled.div attributes children ]

                Nothing ->
                    Html.Styled.div


panelToStyle : StyleComputed -> ChildrenStyle -> Content msg -> Css.Style
panelToStyle style childrenStyle content =
    let
        (StyleComputed record) =
            style
    in
    [ Css.padding (Css.px (toFloat record.padding))
    , contentToStyle
        childrenStyle
        record.overflowVisible
        content
    , borderStyleToStyle record.border
    ]
        ++ (case record.width of
                Just width ->
                    [ Css.width (Css.px (toFloat width)) ]

                Nothing ->
                    []
           )
        ++ (case record.height of
                Just height ->
                    [ Css.height (Css.px (toFloat height)) ]

                Nothing ->
                    []
           )
        ++ (case record.offset of
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
        ++ (case record.pointerImage of
                Just HorizontalResize ->
                    [ Css.cursor Css.ewResize ]

                Just VerticalResize ->
                    [ Css.cursor Css.ewResize ]

                Nothing ->
                    []
           )
        ++ (case record.borderRadius of
                0 ->
                    []

                _ ->
                    [ Css.borderRadius (Css.px (toFloat record.borderRadius)) ]
           )
        |> Css.batch


borderStyleToStyle : BorderStyle -> Css.Style
borderStyleToStyle (BorderStyle { top, bottom, left, right }) =
    ([ Css.border2 Css.zero Css.none ]
        ++ ([ top
                |> Maybe.map
                    (\{ width, color } ->
                        Css.borderTop3 (Css.px (toFloat width)) Css.solid color
                    )
            , bottom
                |> Maybe.map
                    (\{ width, color } ->
                        Css.borderBottom3 (Css.px (toFloat width)) Css.solid color
                    )
            , left
                |> Maybe.map
                    (\{ width, color } ->
                        Css.borderLeft3 (Css.px (toFloat width)) Css.solid color
                    )
            , right
                |> Maybe.map
                    (\{ width, color } ->
                        Css.borderRight3 (Css.px (toFloat width)) Css.solid color
                    )
            ]
                |> Utility.ListExtra.takeFromMaybeList
           )
    )
        |> Css.batch



--textAlignmentToStyle : Maybe TextAlignment -> Css.Style
--textAlignmentToStyle =


contentToStyle : ChildrenStyle -> Bool -> Content msg -> Css.Style
contentToStyle (ChildrenStyle { gridPositionLeftTop, position }) overflowVisible content =
    (case content of
        TextBox rec ->
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
                ++ (case rec.textAlignment of
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
                ++ (case rec.verticalAlignment of
                        Just v ->
                            [ alignItemsToStyle v ]

                        Nothing ->
                            []
                   )

        ImageFromUrl { fitStyle, rendering } ->
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


{-| コンテンツをHTMLの属性に変換する
-}
growGrowContentToListAttributes : Content msg -> List (Html.Styled.Attribute msg)
growGrowContentToListAttributes content =
    case content of
        TextBox _ ->
            []

        ImageFromUrl { url, alternativeText } ->
            [ Html.Styled.Attributes.src url
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


{-| イベントをElmのイベントリスナーの属性に変換する
-}
eventsToHtmlAttributes : EventComputed msg -> List (Html.Styled.Attribute msg)
eventsToHtmlAttributes (EventComputed record) =
    [ record.pointerEnter
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerenter" (pointerEventDecoder |> Json.Decode.map msg))
    , record.pointerLeave
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerleave" (pointerEventDecoder |> Json.Decode.map msg))
    , record.pointerMove
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointermove" (pointerEventDecoder |> Json.Decode.map msg))
    , record.pointerDown
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerdown" (pointerEventDecoder |> Json.Decode.map msg))
    , record.click
        |> Maybe.map (\msg -> Html.Styled.Events.onClick msg)
    ]
        |> Utility.ListExtra.takeFromMaybeList


pointerEventDecoder : Json.Decode.Decoder Pointer
pointerEventDecoder =
    Json.Decode.succeed
        (\id clientX clientY button pressure tangentialPressure width height tiltX tiltY twist pointerType isPrimary buttons eventPhase ->
            Pointer
                { id = id
                , position = ( clientX, clientY )
                , button =
                    case button of
                        0 ->
                            Just Primary

                        1 ->
                            Just Auxiliary

                        2 ->
                            Just Secondary

                        3 ->
                            Just BrowserBack

                        4 ->
                            Just BrowserForward

                        5 ->
                            Just Eraser

                        _ ->
                            Nothing
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


contentToListHtml : Content msg -> List (Html.Styled.Html msg)
contentToListHtml content =
    case content of
        TextBox rec ->
            [ Html.Styled.text rec.text ]

        ImageFromUrl _ ->
            []

        VectorImage { elements, viewBox } ->
            [ elements
                |> VectorImage.toHtml viewBox Nothing
            ]

        Monochromatic _ ->
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
    = Grow
    | FixMaxContent


growOrFixAutoToGridTemplateString : GrowOrFixAuto -> String
growOrFixAutoToGridTemplateString growOrFixAuto =
    case growOrFixAuto of
        Grow ->
            "1fr"

        FixMaxContent ->
            "max-content"


panelToGrowOrFixAutoWidth : Panel msg -> GrowOrFixAuto
panelToGrowOrFixAutoWidth (Panel { style, content }) =
    let
        (StyleComputed { width }) =
            style
    in
    case ( width, content ) of
        ( Just _, _ ) ->
            FixMaxContent

        ( Nothing, TextBox record ) ->
            case record.textAlignment of
                Just _ ->
                    Grow

                Nothing ->
                    FixMaxContent

        ( Nothing, _ ) ->
            Grow


panelToGrowOrFixAutoHeight : Panel msg -> GrowOrFixAuto
panelToGrowOrFixAutoHeight (Panel { style, content }) =
    let
        (StyleComputed { height }) =
            style
    in
    case ( height, content ) of
        ( Just _, _ ) ->
            FixMaxContent

        ( Nothing, TextBox record ) ->
            case record.verticalAlignment of
                Just _ ->
                    Grow

                Nothing ->
                    FixMaxContent

        ( Nothing, _ ) ->
            Grow


gridSetPosition : Css.Style
gridSetPosition =
    Css.batch
        [ Css.property "grid-row" "1 / 2"
        , Css.property "grid-column" "1 / 2"
        ]


{-| 縦のそろえ方
-}
type AlignItems
    = Top
    | CenterY
    | Bottom


alignItemsToStyle : AlignItems -> Css.Style
alignItemsToStyle alignItems =
    Css.alignItems
        (case alignItems of
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
