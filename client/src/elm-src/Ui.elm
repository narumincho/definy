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
    , image
    , map
    , monochromatic
    , pointerGetPosition
    , row
    , text
    , toHtml
    )

import Bitwise
import Css
import EverySet
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
import Json.Decode.Pipeline


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
    | PointerButtonUnknown Int


{-| どのパネルでも指定できるスタイル
-}
type StyleComputed
    = StyleComputed
        { padding : Int
        , width : Size
        , height : Size
        , offset : Maybe ( Int, Int )
        , verticalAlignment : Maybe VerticalAlignment
        , textAlignment : Maybe TextAlignment
        }


type Style
    = Padding Int
    | Width Size
    | Height Size
    | Offset ( Int, Int )
    | VerticalAlignment VerticalAlignment
    | TextAlignment TextAlignment


type Content msg
    = Text
        { text : String
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
    | RowList (List (Panel msg))
    | ColumnList (List (Panel msg))


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
                }
        }


image :
    List (Event msg)
    -> List Style
    ->
        { fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    -> String
    -> Panel msg
image events style imageStyle dataUrl =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content =
            ImageFromDataUrl
                { fitStyle = imageStyle.fitStyle
                , alternativeText = imageStyle.alternativeText
                , rendering = imageStyle.rendering
                , dataUrl = dataUrl
                }
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


row : List (Event msg) -> List Style -> List (Panel msg) -> Panel msg
row events style children =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content = RowList children
        }


column : List (Event msg) -> List Style -> List (Panel msg) -> Panel msg
column events style children =
    Panel
        { events = events
        , style = style |> List.reverse |> computeStyle
        , content = ColumnList children
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
                    { rec | width = size }

                Height size ->
                    { rec | height = size }

                Offset position ->
                    { rec | offset = Just position }

                VerticalAlignment v ->
                    { rec | verticalAlignment = Just v }

                TextAlignment align ->
                    { rec | textAlignment = Just align }
            )
                |> StyleComputed

        [] ->
            StyleComputed
                { padding = 0
                , width = Flex 1
                , height = Flex 1
                , offset = Nothing
                , verticalAlignment = Nothing
                , textAlignment = Nothing
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

                ImageFromDataUrl rec ->
                    ImageFromDataUrl rec

                Monochromatic color ->
                    Monochromatic color

                DepthList list ->
                    DepthList (list |> List.map (map func))

                RowList list ->
                    RowList
                        (list |> List.map (map func))

                ColumnList list ->
                    ColumnList
                        (list |> List.map (map func))
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
        (StyleComputed { padding, width, height, offset, verticalAlignment, textAlignment }) =
            style
    in
    Html.Styled.div
        ([ Html.Styled.Attributes.css
            ([ case width of
                Flex int ->
                    Css.width (Css.pct 100)

                Fix w ->
                    Css.width (Css.px (toFloat w))
             , case height of
                Flex int ->
                    Css.height (Css.pct 100)

                Fix h ->
                    Css.height (Css.px (toFloat h))
             , Css.padding (Css.pc (toFloat padding))
             , growGrowContentToStyle textAlignment verticalAlignment isSetGridPosition content
             ]
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


growGrowContentToStyle : Maybe TextAlignment -> Maybe VerticalAlignment -> ChildrenStyle -> Content msg -> Css.Style
growGrowContentToStyle textAlignment verticalAlignment (ChildrenStyle { gridPositionLeftTop, position }) content =
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
            , Css.overflow Css.hidden
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
            , Css.property "grid-template-columns" (panelListToGridTemplateColumns list)
            ]

        ColumnList list ->
            [ Css.property "display" "grid"
            , Css.property "grid-template-rows" (panelListToGridTemplateRows list)
            ]
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

        ImageFromDataUrl _ ->
            []

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

        RowList list ->
            list
                |> List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = False
                            , position = Nothing
                            }
                        )
                    )

        ColumnList list ->
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
    List.map panelToGridTemplateColumn
        >> String.join " "


panelToGridTemplateColumn : Panel msg -> String
panelToGridTemplateColumn (Panel { style, content }) =
    let
        (StyleComputed { width, textAlignment }) =
            style
    in
    case content of
        Text _ ->
            case textAlignment of
                Just _ ->
                    "1fr"

                Nothing ->
                    "auto"

        _ ->
            sizeToGridTemplate width


panelListToGridTemplateRows : List (Panel msg) -> String
panelListToGridTemplateRows =
    List.map
        panelToGridTemplateRow
        >> String.join " "


panelToGridTemplateRow : Panel msg -> String
panelToGridTemplateRow (Panel { style, content }) =
    let
        (StyleComputed { height, verticalAlignment }) =
            style
    in
    case content of
        Text _ ->
            case verticalAlignment of
                Just _ ->
                    "1fr"

                Nothing ->
                    "auto"

        _ ->
            sizeToGridTemplate height


sizeToGridTemplate : Size -> String
sizeToGridTemplate size =
    case size of
        Flex int ->
            String.fromInt int ++ "fr"

        Fix int ->
            String.fromInt int ++ "px"


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
