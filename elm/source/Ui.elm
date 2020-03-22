module Ui exposing
    ( AlignItems(..)
    , BorderStyle(..)
    , FitStyle(..)
    , Font(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , TextAlignment(..)
    , backGroundColor
    , border
    , borderRadius
    , column
    , depth
    , empty
    , height
    , imageFromUrl
    , map
    , offset
    , onClick
    , onPointerDown
    , onPointerEnter
    , onPointerLeave
    , onPointerMove
    , overflowVisible
    , padding
    , pointerGetPosition
    , pointerImage
    , row
    , textBox
    , textBoxFitHeight
    , toHtml
    , vectorImage
    , width
    )

import Bitwise
import Css
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
import Json.Decode.Pipeline
import Utility.ListExtra
import VectorImage


{-| デフォルトで幅と高さが外の大きさによって決まる,パネル
-}
type Panel message
    = TextBox (TextBoxAttributes message)
    | TextBoxFitHeight (TextBoxFitHeightAttributes message)
    | ImageFromUrl (ImageFromUrlAttributes message)
    | VectorImage (VectorImageAttributes message)
    | Empty (StyleAndEventComputed message)
    | DepthList (DepthListAttributes message)
    | RowList (RowListAttributes message)
    | ColumnList (ColumnListAttributes message)


type TextBoxAttributes message
    = TextBoxAttributes
        { styleAndEvent : StyleAndEventComputed message
        , text : String
        , font : Font
        , verticalAlignment : AlignItems
        , textAlignment : TextAlignment
        }


type TextBoxFitHeightAttributes message
    = TextBoxFitHeightAttributes
        { styleAndEvent : StyleAndEventComputed message
        , text : String
        , font : Font
        , textAlignment : TextAlignment
        }


type ImageFromUrlAttributes message
    = ImageFromUrlAttributes
        { styleAndEvent : StyleAndEventComputed message
        , url : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }


type VectorImageAttributes message
    = VectorImageAttributes
        { styleAndEvent : StyleAndEventComputed message
        , fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , elements : List (VectorImage.Element message)
        }


type DepthListAttributes message
    = DepthListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , children : List (Panel message)
        }


type RowListAttributes message
    = RowListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , gap : Int
        , children : List (Panel message)
        }


type ColumnListAttributes message
    = ColumnListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , gap : Int
        , children : List (Panel message)
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
        , buttons : List PointerButton
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


{-| スタイルとイベント
-}
type StyleAndEventComputed message
    = StyleAndEventComputed
        { padding : Int
        , width : Maybe Int
        , height : Maybe Int
        , offset : Maybe ( Int, Int )
        , overflowVisible : Bool
        , pointerImage : Maybe PointerImage
        , border : Maybe BorderStyle
        , borderRadius : Int
        , backGroundColor : Maybe Css.Color
        , onClick : Maybe message
        , onPointerEnter : Maybe (Pointer -> message)
        , onPointerLeave : Maybe (Pointer -> message)
        , onPointerMove : Maybe (Pointer -> message)
        , onPointerDown : Maybe (Pointer -> message)
        }


type StyleAndEvent message
    = Padding Int
    | Width Int
    | Height Int
    | Offset ( Int, Int )
    | OverflowVisible
    | PointerImage PointerImage
    | Border BorderStyle
    | BorderRadius Int
    | BackGroundColor Css.Color
    | OnClick message
    | OnPointerEnter (Pointer -> message)
    | OnPointerLeave (Pointer -> message)
    | OnPointerMove (Pointer -> message)
    | OnPointerDown (Pointer -> message)


type PointerImage
    = HorizontalResize -- ew-resize ↔
    | VerticalResize -- ns-resize ↕


type FitStyle
    = Contain
    | Cover


type ImageRendering
    = ImageRenderingPixelated
    | ImageRenderingAuto


type BorderStyle
    = BorderStyle
        { color : Css.Color
        , width :
            { top : Int
            , right : Int
            , left : Int
            , bottom : Int
            }
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


padding : Int -> StyleAndEvent message
padding =
    Padding


width : Int -> StyleAndEvent message
width =
    Width


height : Int -> StyleAndEvent message
height =
    Height


offset : ( Int, Int ) -> StyleAndEvent message
offset =
    Offset


overflowVisible : StyleAndEvent message
overflowVisible =
    OverflowVisible


pointerImage : PointerImage -> StyleAndEvent message
pointerImage =
    PointerImage


border : BorderStyle -> StyleAndEvent message
border =
    Border


borderRadius : Int -> StyleAndEvent message
borderRadius =
    BorderRadius


backGroundColor : Css.Color -> StyleAndEvent message
backGroundColor =
    BackGroundColor


onClick : message -> StyleAndEvent message
onClick =
    OnClick


onPointerEnter : (Pointer -> message) -> StyleAndEvent message
onPointerEnter =
    OnPointerEnter


onPointerLeave : (Pointer -> message) -> StyleAndEvent message
onPointerLeave =
    OnPointerLeave


onPointerMove : (Pointer -> message) -> StyleAndEvent message
onPointerMove =
    OnPointerMove


onPointerDown : (Pointer -> message) -> StyleAndEvent message
onPointerDown =
    OnPointerDown


{-| テキストを表示する
-}
textBox :
    List (StyleAndEvent message)
    ->
        { align : TextAlignment
        , vertical : AlignItems
        , font : Font
        }
    -> String
    -> Panel message
textBox styleAndEventList { align, vertical, font } text =
    TextBox
        (TextBoxAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , font = font
            , text = text
            , verticalAlignment = vertical
            , textAlignment = align
            }
        )


{-| テキストを表示する
高さがフォントや中身の文字に応じて変化する
-}
textBoxFitHeight : List (StyleAndEvent message) -> { align : TextAlignment, font : Font } -> String -> Panel message
textBoxFitHeight styleAndEventList { align, font } text =
    TextBoxFitHeight
        (TextBoxFitHeightAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , font = font
            , text = text
            , textAlignment = align
            }
        )


imageFromUrl :
    List (StyleAndEvent message)
    ->
        { fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }
    -> String
    -> Panel message
imageFromUrl styleAndEventList imageStyle url =
    ImageFromUrl
        (ImageFromUrlAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , url = url
            , fitStyle = imageStyle.fitStyle
            , alternativeText = imageStyle.alternativeText
            , rendering = imageStyle.rendering
            }
        )


vectorImage :
    List (StyleAndEvent message)
    -> { fitStyle : FitStyle, viewBox : { x : Int, y : Int, width : Int, height : Int }, elements : List (VectorImage.Element message) }
    -> Panel message
vectorImage styleAndEventList content =
    VectorImage
        (VectorImageAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , fitStyle = content.fitStyle
            , viewBox = content.viewBox
            , elements = content.elements
            }
        )


empty : List (StyleAndEvent message) -> Panel message
empty styleAndEventList =
    Empty (styleAndEventCompute styleAndEventList)


depth : List (StyleAndEvent message) -> List (Panel message) -> Panel message
depth styleAndEventList children =
    DepthList
        (DepthListAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , children = children
            }
        )


row : List (StyleAndEvent message) -> Int -> List (Panel message) -> Panel message
row styleAndEventList gap children =
    RowList
        (RowListAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , gap = gap
            , children = children
            }
        )


column : List (StyleAndEvent message) -> Int -> List (Panel message) -> Panel message
column styleAndEventList gap children =
    ColumnList
        (ColumnListAttributes
            { styleAndEvent = styleAndEventCompute styleAndEventList
            , gap = gap
            , children = children
            }
        )


styleAndEventCompute : List (StyleAndEvent message) -> StyleAndEventComputed message
styleAndEventCompute list =
    case list of
        x :: xs ->
            let
                (StyleAndEventComputed rest) =
                    styleAndEventCompute xs
            in
            StyleAndEventComputed
                (case x of
                    Padding int ->
                        { rest | padding = int }

                    Width int ->
                        { rest | width = Just int }

                    Height int ->
                        { rest | height = Just int }

                    Offset vector ->
                        { rest | offset = Just vector }

                    OverflowVisible ->
                        { rest | overflowVisible = True }

                    PointerImage pointerImage_ ->
                        { rest | pointerImage = Just pointerImage_ }

                    Border borderStyle ->
                        { rest | border = Just borderStyle }

                    BorderRadius int ->
                        { rest | borderRadius = int }

                    BackGroundColor color ->
                        { rest | backGroundColor = Just color }

                    OnClick message ->
                        { rest | onClick = Just message }

                    OnPointerEnter function ->
                        { rest | onPointerEnter = Just function }

                    OnPointerLeave function ->
                        { rest | onPointerLeave = Just function }

                    OnPointerMove function ->
                        { rest | onPointerMove = Just function }

                    OnPointerDown function ->
                        { rest | onPointerDown = Just function }
                )

        [] ->
            defaultStyleAndEvent


defaultStyleAndEvent : StyleAndEventComputed message
defaultStyleAndEvent =
    StyleAndEventComputed
        { padding = 0
        , width = Nothing
        , height = Nothing
        , offset = Nothing
        , overflowVisible = False
        , pointerImage = Nothing
        , border = Nothing
        , borderRadius = 0
        , backGroundColor = Nothing
        , onClick = Nothing
        , onPointerEnter = Nothing
        , onPointerLeave = Nothing
        , onPointerMove = Nothing
        , onPointerDown = Nothing
        }


map : (a -> b) -> Panel a -> Panel b
map func panel =
    case panel of
        TextBox (TextBoxAttributes record) ->
            TextBox
                (TextBoxAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , text = record.text
                    , font = record.font
                    , verticalAlignment = record.verticalAlignment
                    , textAlignment = record.textAlignment
                    }
                )

        TextBoxFitHeight (TextBoxFitHeightAttributes record) ->
            TextBoxFitHeight
                (TextBoxFitHeightAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , text = record.text
                    , font = record.font
                    , textAlignment = record.textAlignment
                    }
                )

        ImageFromUrl (ImageFromUrlAttributes record) ->
            ImageFromUrl
                (ImageFromUrlAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , url = String
                    , fitStyle = record.fitStyle
                    , alternativeText = String
                    , rendering = record.rendering
                    }
                )

        VectorImage (VectorImageAttributes record) ->
            VectorImage
                (VectorImageAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , fitStyle = record.fitStyle
                    , viewBox = record.viewBox
                    , elements = List.map (VectorImage.map func) record.elements
                    }
                )

        Empty styleAndEvent ->
            Empty (styleAndEventMap func styleAndEvent)

        DepthList (DepthListAttributes record) ->
            DepthList
                (DepthListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , children = List.map (map func) record.children
                    }
                )

        RowList (RowListAttributes record) ->
            RowList
                (RowListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , gap = record.gap
                    , children = List.map (map func) record.children
                    }
                )

        ColumnList (ColumnListAttributes record) ->
            ColumnList
                (ColumnListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , gap = record.gap
                    , children = List.map (map func) record.children
                    }
                )


styleAndEventMap : (a -> b) -> StyleAndEventComputed a -> StyleAndEventComputed b
styleAndEventMap func (StyleAndEventComputed record) =
    StyleAndEventComputed
        { padding = record.padding
        , width = record.width
        , height = record.height
        , offset = record.offset
        , overflowVisible = record.overflowVisible
        , pointerImage = record.pointerImage
        , border = record.border
        , borderRadius = record.borderRadius
        , backGroundColor = record.backGroundColor
        , onClick = Maybe.map func record.onClick
        , onPointerEnter = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerEnter
        , onPointerLeave = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerLeave
        , onPointerMove = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerLeave
        , onPointerDown = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerDown
        }


type ChildrenStyle
    = ChildrenStyle
        { gridPositionLeftTop : Bool
        , position : Maybe ( Int, Int )
        }


styleAndEventComputedGetClickEvent : StyleAndEventComputed message -> Maybe message
styleAndEventComputedGetClickEvent (StyleAndEventComputed record) =
    record.onClick


panelToHtml : ChildrenStyle -> Panel msg -> Html.Styled.Html msg
panelToHtml childrenStyle panel =
    case panel of
        TextBox record ->
            case styleAndEventComputedGetClickEvent record.styleAndEvent of
                Just clickEvent ->
                    Html.Styled.button
                        ([ Html.Styled.Attributes.css
                            [ panelToStyle True record.styleAndEvent ]
                         ]
                            ++ eventsToHtmlAttributes record.styleAndEvent
                        )
                        [ Html.Styled.text record.text ]

                Nothing ->
                    Html.Styled.div
                        ([ Html.Styled.Attributes.css
                            [ panelToStyle False record.styleAndEvent ]
                         ]
                            ++ eventsToHtmlAttributes record.styleAndEvent
                        )
                        [ Html.Styled.text record.text ]

        TextBoxFitHeight record ->
            case styleAndEventComputedGetClickEvent record.styleAndEvent of
                Just clickEvent ->
                    Html.Styled.button
                        ([ Html.Styled.Attributes.css
                            [ panelToStyle True record.styleAndEvent ]
                         ]
                            ++ eventsToHtmlAttributes record.styleAndEvent
                        )
                        [ Html.Styled.text record.text ]

                Nothing ->
                    Html.Styled.div
                        ([ Html.Styled.Attributes.css
                            [ panelToStyle False record.styleAndEvent ]
                         ]
                            ++ eventsToHtmlAttributes record.styleAndEvent
                        )
                        [ Html.Styled.text record.text ]

        ImageFromUrl record ->
            case styleAndEventComputedGetClickEvent record.styleAndEvent of
                Just clickEvent ->
                    Html.Styled.button
                        []
                        []

                Nothing ->
                    Html.Styled.img
                        ([ Html.Styled.Attributes.css
                            [ panelToStyle False record.styleAndEvent ]
                         , Html.Styled.Attributes.src record.url
                         , Html.Styled.Attributes.alt record.alternativeText
                         ]
                            ++ eventsToHtmlAttributes record.styleAndEvent
                        )
                        []

        VectorImage record ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent ]
                 ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                [ VectorImage.toHtml
                    record.viewBox
                    Nothing
                    record.elements
                ]

        Empty styleAndEvent ->
            case styleAndEventComputedGetClickEvent styleAndEvent of
                Just clickEvent ->
                    Html.Styled.button
                        []
                        []

                Nothing ->
                    Html.Styled.div
                        ([ Html.Styled.Attributes.css [ panelToStyle False styleAndEvent ] ]
                            ++ eventsToHtmlAttributes styleAndEvent
                        )
                        []

        DepthList record ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css [ panelToStyle False record.styleAndEvent ] ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                (List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = True
                            , position = Nothing
                            }
                        )
                    )
                    record.children
                )

        RowList record ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css [ panelToStyle False record.styleAndEvent ] ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                (List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = False
                            , position = Nothing
                            }
                        )
                    )
                    record.children
                )

        ColumnList record ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css [ panelToStyle False record.styleAndEvent ] ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                (List.map
                    (panelToHtml
                        (ChildrenStyle
                            { gridPositionLeftTop = False
                            , position = Nothing
                            }
                        )
                    )
                    record.children
                )


panelToStyle : Bool -> StyleAndEventComputed message -> Css.Style
panelToStyle isButtonElement (StyleAndEventComputed record) =
    [ [ Css.padding (Css.px (toFloat record.padding)) ]
    , if isButtonElement then
        [ Css.cursor Css.pointer ]

      else
        []
    , case record.border of
        Just border_ ->
            [ borderStyleToStyle border_ ]

        Nothing ->
            if isButtonElement then
                [ Css.border2 Css.zero Css.none ]

            else
                []
    , case record.width of
        Just width_ ->
            [ Css.width (Css.px (toFloat width_)) ]

        Nothing ->
            []
    , case record.height of
        Just height_ ->
            [ Css.height (Css.px (toFloat height_)) ]

        Nothing ->
            []
    , case record.offset of
        Just ( left, top ) ->
            [ Css.transform
                (Css.translate2
                    (Css.px (toFloat left))
                    (Css.px (toFloat top))
                )
            ]

        Nothing ->
            []
    , case record.pointerImage of
        Just HorizontalResize ->
            [ Css.cursor Css.ewResize ]

        Just VerticalResize ->
            [ Css.cursor Css.ewResize ]

        Nothing ->
            []
    , case record.borderRadius of
        0 ->
            if isButtonElement then
                [ Css.borderRadius Css.zero ]

            else
                []

        _ ->
            [ Css.borderRadius (Css.px (toFloat record.borderRadius)) ]
    , case record.backGroundColor of
        Just color ->
            [ Css.backgroundColor color ]

        Nothing ->
            []
    ]
        |> List.concat
        |> Css.batch


borderStyleToStyle : BorderStyle -> Css.Style
borderStyleToStyle (BorderStyle record) =
    [ Css.borderColor record.color
    , Css.borderStyle Css.solid
    , Css.borderWidth4
        (Css.px (toFloat record.width.top))
        (Css.px (toFloat record.width.right))
        (Css.px (toFloat record.width.bottom))
        (Css.px (toFloat record.width.left))
    ]
        |> Css.batch


contentToStyle : ChildrenStyle -> Bool -> Content msg -> Css.Style
contentToStyle (ChildrenStyle { gridPositionLeftTop, position }) overflowVisible_ content =
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
            , textAlignToStyle rec.textAlignment
            , alignItemsToStyle rec.verticalAlignment
            ]

        TextBoxFitHeight rec ->
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
            , textAlignToStyle rec.textAlignment
            ]

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

        Empty styleAndEvent ->
            []

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
        ++ (if overflowVisible_ then
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


{-| イベントをElmのイベントリスナーの属性に変換する
-}
eventsToHtmlAttributes : StyleAndEventComputed msg -> List (Html.Styled.Attribute msg)
eventsToHtmlAttributes (StyleAndEventComputed record) =
    [ record.onPointerEnter
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerenter" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerLeave
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerleave" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerMove
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointermove" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerDown
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerdown" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onClick
        |> Maybe.map (\msg -> Html.Styled.Events.onClick msg)
    ]
        |> Utility.ListExtra.takeFromMaybeList


pointerEventDecoder : Json.Decode.Decoder Pointer
pointerEventDecoder =
    Json.Decode.succeed
        (\id clientX clientY button pressure tangentialPressure width_ height_ tiltX tiltY twist pointerType isPrimary buttons eventPhase ->
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
                , size = ( width_, height_ )
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
panelToGrowOrFixAutoWidth (Panel { styleAndEvent }) =
    let
        (StyleAndEventComputed record) =
            styleAndEvent
    in
    case record.width of
        Just _ ->
            FixMaxContent

        Nothing ->
            Grow


panelToGrowOrFixAutoHeight : Panel msg -> GrowOrFixAuto
panelToGrowOrFixAutoHeight (Panel { styleAndEvent, content }) =
    let
        (StyleAndEventComputed record) =
            styleAndEvent
    in
    case ( record.height, content ) of
        ( Just _, _ ) ->
            FixMaxContent

        ( Nothing, TextBoxFitHeight _ ) ->
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


textAlignToStyle : TextAlignment -> Css.Style
textAlignToStyle textAlignment =
    Css.textAlign
        (case textAlignment of
            TextAlignStart ->
                Css.start

            TextAlignEnd ->
                Css.end

            TextAlignCenter ->
                Css.center

            TextAlignJustify ->
                Css.justify
        )


pointerGetPosition : Pointer -> ( Float, Float )
pointerGetPosition (Pointer { position }) =
    position
